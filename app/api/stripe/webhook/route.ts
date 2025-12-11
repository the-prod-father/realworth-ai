import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { subscriptionService } from '@/services/subscriptionService';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(request: NextRequest) {
  console.log('[Webhook] Received webhook request');

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Webhook] No stripe-signature header found');
      return NextResponse.json(
        { error: 'No signature header' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('[Webhook] Signature verified, event type:', event.type);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Webhook] Signature verification failed:', errorMessage);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        console.log('[Webhook] checkout.session.completed:', {
          customerId,
          subscriptionId,
          sessionId: session.id,
        });

        if (!subscriptionId) {
          console.error('[Webhook] No subscription ID in checkout session');
          break;
        }

        // Get subscription details to find expiration date
        const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subData = subscriptionResponse as any;
        const periodEnd = subData.current_period_end || subData.currentPeriodEnd;
        const expiresAt = new Date(periodEnd * 1000);

        console.log('[Webhook] Activating Pro subscription:', {
          customerId,
          subscriptionId,
          expiresAt: expiresAt.toISOString(),
        });

        const success = await subscriptionService.activateProSubscription(
          customerId,
          subscriptionId,
          expiresAt
        );

        if (success) {
          console.log(`[Webhook] Pro subscription activated for customer ${customerId}`);
        } else {
          console.error(`[Webhook] FAILED to activate Pro for customer ${customerId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subObj = subscription as any;
        const expiresAt = new Date((subObj.current_period_end || subObj.currentPeriodEnd) * 1000);
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;

        console.log('[Webhook] customer.subscription.updated:', {
          customerId,
          subscriptionId: subscription.id,
          stripeStatus: subscription.status,
          cancelAtPeriodEnd,
          currentPeriodEnd: expiresAt.toISOString(),
        });

        let status: 'active' | 'past_due' | 'canceled' = 'active';
        if (subscription.status === 'past_due') {
          status = 'past_due';
        } else if (subscription.status === 'canceled') {
          // Only mark as canceled if Stripe says it's actually canceled
          status = 'canceled';
        } else if (cancelAtPeriodEnd) {
          // User scheduled cancellation but still has active access until period end
          // Keep status as 'active' - they still have Pro until expiration
          status = 'active';
          console.log(`[Webhook] Subscription scheduled for cancellation at period end. User retains Pro until ${expiresAt.toISOString()}`);
        }

        await subscriptionService.updateSubscriptionStatus(customerId, status, expiresAt, cancelAtPeriodEnd);
        console.log(`[Webhook] Subscription status updated for customer ${customerId}: ${status}, cancelAtPeriodEnd: ${cancelAtPeriodEnd}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log('[Webhook] customer.subscription.deleted:', {
          customerId,
          subscriptionId: subscription.id,
        });

        await subscriptionService.updateSubscriptionStatus(customerId, 'canceled');
        console.log(`[Webhook] Subscription fully canceled for customer ${customerId}`);
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
