import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { subscriptionService } from '@/services/subscriptionService';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, userName } = await request.json();

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing user information' },
        { status: 400 }
      );
    }

    // Check if user already has a Stripe customer ID
    const subscription = await subscriptionService.getUserSubscription(userId);
    let customerId = subscription?.stripeCustomerId;

    const stripe = getStripe();

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to user
      await subscriptionService.updateStripeCustomerId(userId, customerId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID!,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://realworth.ai'}?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://realworth.ai'}?subscription=canceled`,
      metadata: {
        userId: userId,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
