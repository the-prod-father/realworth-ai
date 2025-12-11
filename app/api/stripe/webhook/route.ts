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

        console.log('[Webhook] checkout.session.completed - STARTING:', {
          customerId,
          subscriptionId,
          sessionId: session.id,
          mode: session.mode,
        });

        if (!subscriptionId) {
          console.error('[Webhook] No subscription ID in checkout session - this may be a one-time payment');
          break;
        }

        console.log('[Webhook] About to fetch subscription from Stripe API...');

        try {
          // Get subscription details to find expiration date
          const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
          console.log('[Webhook] Successfully retrieved subscription from Stripe');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subData = subscriptionResponse as any;
          const periodEnd = subData.current_period_end || subData.currentPeriodEnd;

          if (!periodEnd || typeof periodEnd !== 'number') {
            console.error('[Webhook] Invalid period_end from subscription:', periodEnd);
            break;
          }

          const expiresAt = new Date(periodEnd * 1000);

          // Validate the date is valid before using it
          if (isNaN(expiresAt.getTime())) {
            console.error('[Webhook] Invalid expiration date calculated from:', periodEnd);
            break;
          }

          console.log('[Webhook] Calling activateProSubscription with:', {
            customerId,
            subscriptionId,
            expiresAt: expiresAt.toISOString(),
          });

          const success = await subscriptionService.activateProSubscription(
            customerId,
            subscriptionId,
            expiresAt
          );

          console.log('[Webhook] activateProSubscription returned:', success);

          if (success) {
            console.log(`[Webhook] SUCCESS: Pro subscription activated for customer ${customerId}`);
          } else {
            console.error(`[Webhook] FAILED: activateProSubscription returned false for customer ${customerId}`);
          }
        } catch (subError) {
          console.error('[Webhook] Error in checkout.session.completed handler:', subError);
        }
        break;
      }

      // BACKUP ACTIVATION: Also handle customer.subscription.created in case checkout.session.completed fails
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const subscriptionId = subscription.id;

        console.log('[Webhook] customer.subscription.created - STARTING:', {
          customerId,
          subscriptionId,
          status: subscription.status,
          rawPeriodEnd: (subscription as any).current_period_end,
        });

        // Only process if subscription is active (not trialing, past_due, etc.)
        if (subscription.status !== 'active') {
          console.log(`[Webhook] Subscription status is ${subscription.status}, skipping activation`);
          break;
        }

        console.log('[Webhook] Subscription is active, fetching fresh data from Stripe API...');

        try {
          // FETCH FRESH DATA from Stripe API (webhook payload structure can vary)
          const stripe = getStripe();
          const fullSubscription = await stripe.subscriptions.retrieve(subscriptionId);
          console.log('[Webhook] Successfully retrieved subscription from Stripe API');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subData = fullSubscription as any;
          const periodEnd = subData.current_period_end || subData.currentPeriodEnd;

          if (!periodEnd || typeof periodEnd !== 'number') {
            console.error('[Webhook] customer.subscription.created: Invalid period_end from API:', periodEnd);
            break;
          }

          const expiresAt = new Date(periodEnd * 1000);

          if (isNaN(expiresAt.getTime())) {
            console.error('[Webhook] customer.subscription.created: Invalid date from:', periodEnd);
            break;
          }

          console.log('[Webhook] customer.subscription.created (BACKUP ACTIVATION):', {
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
            console.log(`[Webhook] BACKUP: Pro subscription activated via subscription.created for customer ${customerId}`);
          } else {
            console.error(`[Webhook] BACKUP: FAILED to activate Pro via subscription.created for customer ${customerId}`);
          }
        } catch (subError) {
          console.error('[Webhook] customer.subscription.created: Error fetching subscription:', subError);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subObj = subscription as any;
        const periodEnd = subObj.current_period_end || subObj.currentPeriodEnd;
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;

        // Validate period_end before creating date
        let expiresAt: Date | undefined;
        if (periodEnd && typeof periodEnd === 'number') {
          expiresAt = new Date(periodEnd * 1000);
          if (isNaN(expiresAt.getTime())) {
            console.error('[Webhook] customer.subscription.updated: Invalid date from:', periodEnd);
            expiresAt = undefined;
          }
        }

        console.log('[Webhook] customer.subscription.updated:', {
          customerId,
          subscriptionId: subscription.id,
          stripeStatus: subscription.status,
          cancelAtPeriodEnd,
          currentPeriodEnd: expiresAt?.toISOString() || 'unknown',
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
          console.log(`[Webhook] Subscription scheduled for cancellation at period end. User retains Pro until ${expiresAt?.toISOString() || 'unknown'}`);
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

        console.log('[Webhook] invoice.payment_failed:', {
          customerId,
          invoiceId: invoice.id,
          amountDue: invoice.amount_due,
        });

        await subscriptionService.updateSubscriptionStatus(customerId, 'past_due');
        console.log(`[Webhook] Payment failed, marked as past_due for customer ${customerId}`);
        break;
      }

      // Handle successful payments (renewals update expiration date)
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoiceData = invoice as any;
        const subscriptionId = invoiceData.subscription;

        console.log('[Webhook] invoice.payment_succeeded:', {
          customerId,
          invoiceId: invoice.id,
          subscriptionId,
          billingReason: invoiceData.billing_reason,
        });

        // For subscription renewals, update the expiration date
        if (subscriptionId && invoiceData.billing_reason === 'subscription_cycle') {
          try {
            const stripe = getStripe();
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const subData = subscription as any;
            const periodEnd = subData.current_period_end || subData.currentPeriodEnd;

            if (periodEnd && typeof periodEnd === 'number') {
              const expiresAt = new Date(periodEnd * 1000);
              if (!isNaN(expiresAt.getTime())) {
                await subscriptionService.updateSubscriptionStatus(customerId, 'active', expiresAt);
                console.log(`[Webhook] Subscription renewed, updated expiration to ${expiresAt.toISOString()} for customer ${customerId}`);
              } else {
                console.error('[Webhook] invoice.payment_succeeded: Invalid date from:', periodEnd);
              }
            } else {
              console.error('[Webhook] invoice.payment_succeeded: Invalid period_end:', periodEnd);
            }
          } catch (subError) {
            console.error('[Webhook] invoice.payment_succeeded: Error retrieving subscription:', subError);
          }
        }
        break;
      }

      // Handle subscription paused (optional feature)
      case 'customer.subscription.paused': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        console.log('[Webhook] customer.subscription.paused:', {
          customerId,
          subscriptionId: subscription.id,
        });

        // Mark subscription as inactive but keep tier as Pro (they can resume)
        await subscriptionService.updateSubscriptionStatus(customerId, 'inactive');
        console.log(`[Webhook] Subscription paused for customer ${customerId}`);
        break;
      }

      // Handle subscription resumed (optional feature)
      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subObj = subscription as any;
        const periodEnd = subObj.current_period_end || subObj.currentPeriodEnd;

        if (!periodEnd || typeof periodEnd !== 'number') {
          console.error('[Webhook] customer.subscription.resumed: Invalid period_end:', periodEnd);
          break;
        }

        const expiresAt = new Date(periodEnd * 1000);

        if (isNaN(expiresAt.getTime())) {
          console.error('[Webhook] customer.subscription.resumed: Invalid date from:', periodEnd);
          break;
        }

        console.log('[Webhook] customer.subscription.resumed:', {
          customerId,
          subscriptionId: subscription.id,
          expiresAt: expiresAt.toISOString(),
        });

        // Reactivate the subscription
        await subscriptionService.updateSubscriptionStatus(customerId, 'active', expiresAt);
        console.log(`[Webhook] Subscription resumed for customer ${customerId}`);
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
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
