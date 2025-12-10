import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(request: NextRequest) {
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
    }

    console.log('Creating checkout session for customer:', customerId);

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
