import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { subscriptionService } from '@/services/subscriptionService';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user ID' },
        { status: 400 }
      );
    }

    // Get user's Stripe customer ID
    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Create portal session
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: process.env.NEXT_PUBLIC_APP_URL || 'https://realworth.ai',
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
