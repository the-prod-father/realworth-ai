import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Log environment on module load (happens once when server starts)
const startupKey = process.env.STRIPE_SECRET_KEY;
const startupMode = startupKey?.startsWith('sk_test_') ? 'TEST' : startupKey?.startsWith('sk_live_') ? 'LIVE' : 'UNKNOWN';
console.log(`[Checkout Route] Server started with ${startupMode} mode key: ${startupKey?.substring(0, 15)}...`);

// Create Supabase admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  const key = process.env.STRIPE_SECRET_KEY;
  // Debug: Log which mode we're in (first 10 chars only for security)
  const mode = key?.startsWith('sk_test_') ? 'TEST' : key?.startsWith('sk_live_') ? 'LIVE' : 'UNKNOWN';
  console.log(`[Stripe Checkout] Using ${mode} mode key: ${key?.substring(0, 10)}...`);
  return new Stripe(key);
}

export async function POST(request: NextRequest) {
  // CRITICAL: Log which key is being used at request time
  const currentKey = process.env.STRIPE_SECRET_KEY;
  const currentMode = currentKey?.startsWith('sk_test_') ? 'TEST' : currentKey?.startsWith('sk_live_') ? 'LIVE' : 'UNKNOWN';
  console.log(`[Checkout API] Request received - Using ${currentMode} mode key: ${currentKey?.substring(0, 15)}...`);
  
  try {
    const { userId, userEmail, userName, billingInterval = 'monthly' } = await request.json();

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing user information' },
        { status: 400 }
      );
    }

    // Check required env vars
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not configured');
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    // Determine which price ID to use based on billing interval
    // Use V2 prices for new signups ($19.99/mo, $149.99/yr)
    // Legacy prices ($9.99/mo, $99/yr) are kept for grandfathered subscribers
    const isAnnual = billingInterval === 'annual';
    const priceId = isAnnual
      ? (process.env.STRIPE_PRO_ANNUAL_PRICE_ID_V2 || process.env.STRIPE_PRO_ANNUAL_PRICE_ID)
      : (process.env.STRIPE_PRO_PRICE_ID_V2 || process.env.STRIPE_PRO_PRICE_ID);
    
    // Debug: Log which price is being used
    console.log('[Checkout] Price configuration:', {
      billingInterval,
      isAnnual,
      priceId,
      usingV2: isAnnual 
        ? !!process.env.STRIPE_PRO_ANNUAL_PRICE_ID_V2 
        : !!process.env.STRIPE_PRO_PRICE_ID_V2,
    });

    if (!priceId) {
      console.error(`Price ID not configured for ${billingInterval} billing`);
      return NextResponse.json(
        { error: 'Price ID not configured' },
        { status: 500 }
      );
    }

    // Get user's existing Stripe customer ID from database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      // Continue anyway - we'll create a new customer
    }

    let customerId = user?.stripe_customer_id;
    const stripe = getStripe();

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      console.log('Creating new Stripe customer for user:', userId);
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to user
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);

      if (updateError) {
        console.error('Error saving customer ID:', updateError);
        // Continue anyway - checkout can still work
      }
    } else {
      // Verify customer exists in current mode (test/live)
      // If customer was created in different mode, create a new one
      try {
        await stripe.customers.retrieve(customerId);
        console.log('Using existing Stripe customer:', customerId);
      } catch (customerError: any) {
        if (customerError?.code === 'resource_missing') {
          console.warn(`Customer ${customerId} not found in ${currentMode} mode. Creating new customer...`);
          // Customer was created in different mode (test vs live), create new one
          const customer = await stripe.customers.create({
            email: userEmail,
            name: userName,
            metadata: {
              userId: userId,
              previous_customer_id: customerId, // Track the old one
            },
          });
          customerId = customer.id;

          // Save new customer ID to user
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId);

          if (updateError) {
            console.error('Error saving new customer ID:', updateError);
          } else {
            console.log('Created new customer in', currentMode, 'mode:', customerId);
          }
        } else {
          throw customerError;
        }
      }
    }

    console.log('Creating checkout session for customer:', customerId);
    console.log(`[Checkout] About to create session with ${currentMode} mode Stripe instance`);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://realworth.ai'}?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://realworth.ai'}?subscription=canceled`,
      metadata: {
        userId: userId,
        billingInterval: billingInterval,
      },
    });

    console.log('Checkout session created:', session.id);
    console.log(`[Checkout] Session mode: ${session.livemode ? 'LIVE' : 'TEST'} (ID starts with: ${session.id.substring(0, 7)})`);
    console.log(`[Checkout] Session URL: ${session.url}`);
    
    // Warn if there's a mismatch
    if (currentMode === 'TEST' && session.livemode) {
      console.error('⚠️  WARNING: Using TEST key but got LIVE session! Check your environment variables.');
    } else if (currentMode === 'LIVE' && !session.livemode) {
      console.error('⚠️  WARNING: Using LIVE key but got TEST session!');
    }
    
    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating checkout session:', errorMessage);
    console.error('Full error:', error);
    return NextResponse.json(
      { error: `Failed to create checkout session: ${errorMessage}` },
      { status: 500 }
    );
  }
}
