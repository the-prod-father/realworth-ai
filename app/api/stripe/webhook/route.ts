import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { subscriptionService } from '@/services/subscriptionService';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Get subscription details to find expiration date
        const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subData = subscriptionResponse as any;
        const periodEnd = subData.current_period_end || subData.currentPeriodEnd;
        const expiresAt = new Date(periodEnd * 1000);

        await subscriptionService.activateProSubscription(
          customerId,
          subscriptionId,
          expiresAt
        );

        console.log(`Pro subscription activated for customer ${customerId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subObj = subscription as any;
        const expiresAt = new Date((subObj.current_period_end || subObj.currentPeriodEnd) * 1000);

        let status: 'active' | 'past_due' | 'canceled' = 'active';
        if (subscription.status === 'past_due') {
          status = 'past_due';
        } else if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
          status = subscription.cancel_at_period_end ? 'active' : 'canceled';
        }

        await subscriptionService.updateSubscriptionStatus(customerId, status, expiresAt);
        console.log(`Subscription updated for customer ${customerId}: ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await subscriptionService.updateSubscriptionStatus(customerId, 'canceled');
        console.log(`Subscription canceled for customer ${customerId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await subscriptionService.updateSubscriptionStatus(customerId, 'past_due');
        console.log(`Payment failed for customer ${customerId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
