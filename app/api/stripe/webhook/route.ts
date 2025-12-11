import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { subscriptionService } from '@/services/subscriptionService';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY!;
  return new Stripe(key);
}

export async function POST(request: NextRequest) {
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

        // Handle both string and object cases for customer/subscription
        const customerId = typeof session.customer === 'string'
          ? session.customer
          : (session.customer as any)?.id;

        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as any)?.id;

        if (!customerId) {
          console.error('[Webhook] checkout.session.completed: No customer ID');
          break;
        }

        if (!subscriptionId) {
          console.error('[Webhook] checkout.session.completed: No subscription ID');
          break;
        }

        try {
          const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
          let periodEnd = (subscriptionResponse as any).current_period_end;

          // Fallback: If current_period_end is missing, calculate from created date + interval
          if (!periodEnd || typeof periodEnd !== 'number') {
            const created = (subscriptionResponse as any).created;
            const items = (subscriptionResponse as any).items?.data || [];
            const interval = items[0]?.price?.recurring?.interval || 'month';
            const intervalCount = items[0]?.price?.recurring?.interval_count || 1;
            
            if (created && typeof created === 'number') {
              const createdDate = new Date(created * 1000);
              const expiresDate = new Date(createdDate);
              
              if (interval === 'month') {
                expiresDate.setMonth(expiresDate.getMonth() + intervalCount);
              } else if (interval === 'year') {
                expiresDate.setFullYear(expiresDate.getFullYear() + intervalCount);
              } else if (interval === 'day') {
                expiresDate.setDate(expiresDate.getDate() + intervalCount);
              } else {
                expiresDate.setDate(expiresDate.getDate() + 30);
              }
              
              periodEnd = Math.floor(expiresDate.getTime() / 1000);
            } else {
              periodEnd = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
            }
          }

          const expiresAt = new Date(periodEnd * 1000);

          if (isNaN(expiresAt.getTime())) {
            console.error('[Webhook] checkout.session.completed: Invalid expiration date');
            break;
          }

          const success = await subscriptionService.activateProSubscription(
            customerId,
            subscriptionId,
            expiresAt
          );

          if (!success) {
            console.error(`[Webhook] checkout.session.completed: Failed to activate subscription for customer ${customerId}`);
          }
        } catch (subError) {
          console.error('[Webhook] checkout.session.completed: Error:', subError);
        }
        break;
      }

      // BACKUP ACTIVATION: Also handle customer.subscription.created in case checkout.session.completed fails
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;

        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as any)?.id;
        const subscriptionId = subscription.id;

        if (subscription.status !== 'active') {
          break;
        }

        try {
          const stripe = getStripe();
          const fullSubscription = await stripe.subscriptions.retrieve(subscriptionId);
          const subData = fullSubscription as any;
          let periodEnd = subData.current_period_end || subData.currentPeriodEnd;

          // Fallback: If current_period_end is missing, calculate from created date + interval
          if (!periodEnd || typeof periodEnd !== 'number') {
            const created = subData.created;
            const items = subData.items?.data || [];
            const interval = items[0]?.price?.recurring?.interval || 'month';
            const intervalCount = items[0]?.price?.recurring?.interval_count || 1;
            
            if (created && typeof created === 'number') {
              const createdDate = new Date(created * 1000);
              const expiresDate = new Date(createdDate);
              
              if (interval === 'month') {
                expiresDate.setMonth(expiresDate.getMonth() + intervalCount);
              } else if (interval === 'year') {
                expiresDate.setFullYear(expiresDate.getFullYear() + intervalCount);
              } else if (interval === 'day') {
                expiresDate.setDate(expiresDate.getDate() + intervalCount);
              } else {
                expiresDate.setDate(expiresDate.getDate() + 30);
              }
              
              periodEnd = Math.floor(expiresDate.getTime() / 1000);
            } else {
              periodEnd = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
            }
          }

          const expiresAt = new Date(periodEnd * 1000);

          if (isNaN(expiresAt.getTime())) {
            console.error('[Webhook] customer.subscription.created: Invalid date');
            break;
          }

          const success = await subscriptionService.activateProSubscription(
            customerId,
            subscriptionId,
            expiresAt
          );

          if (!success) {
            console.error(`[Webhook] customer.subscription.created: Failed to activate subscription for customer ${customerId}`);
          }
        } catch (subError) {
          console.error('[Webhook] customer.subscription.created: Error:', subError);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle both string and object cases for customer
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as any)?.id;
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

        if (!customerId) {
          console.error('[Webhook] customer.subscription.updated: No customer ID');
          break;
        }


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
        }

        try {
          const success = await subscriptionService.updateSubscriptionStatus(customerId, status, expiresAt, cancelAtPeriodEnd);
          if (success) {
          } else {
            console.error(`[Webhook] FAILED to update subscription status for customer ${customerId}`);
          }
        } catch (updateError) {
          console.error('[Webhook] Error updating subscription status:', updateError);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle both string and object cases for customer
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as any)?.id;

        if (!customerId) {
          console.error('[Webhook] customer.subscription.deleted: No customer ID');
          break;
        }

        try {
          const success = await subscriptionService.updateSubscriptionStatus(customerId, 'canceled');
          if (success) {
          } else {
            console.error(`[Webhook] FAILED to cancel subscription for customer ${customerId}`);
          }
        } catch (updateError) {
          console.error('[Webhook] Error canceling subscription:', updateError);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle both string and object cases for customer
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : (invoice.customer as any)?.id;

        if (!customerId) {
          console.error('[Webhook] invoice.payment_failed: No customer ID');
          break;
        }

        try {
          const success = await subscriptionService.updateSubscriptionStatus(customerId, 'past_due');
          if (!success) {
            console.error(`[Webhook] invoice.payment_failed: Failed to update status for customer ${customerId}`);
          }
        } catch (updateError) {
          console.error('[Webhook] invoice.payment_failed: Error:', updateError);
        }
        break;
      }

      // Handle successful payments (renewals update expiration date)
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle both string and object cases for customer
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : (invoice.customer as any)?.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoiceData = invoice as any;
        const subscriptionId = invoiceData.subscription;

        if (!customerId) {
          console.error('[Webhook] invoice.payment_succeeded: No customer ID');
          break;
        }

        // For subscription renewals, update the expiration date
        if (subscriptionId && invoiceData.billing_reason === 'subscription_cycle') {
          try {
            const stripe = getStripe();
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const subData = subscription as any;
            const periodEnd = subData.current_period_end || subData.currentPeriodEnd;

            if (periodEnd && typeof periodEnd === 'number') {
              const expiresAt = new Date(periodEnd * 1000);
              if (!isNaN(expiresAt.getTime())) {
                const success = await subscriptionService.updateSubscriptionStatus(customerId, 'active', expiresAt);
                if (!success) {
                  console.error(`[Webhook] invoice.payment_succeeded: Failed to update renewal for customer ${customerId}`);
                }
              } else {
                console.error('[Webhook] invoice.payment_succeeded: Invalid date');
              }
            } else {
              console.error('[Webhook] invoice.payment_succeeded: Invalid period_end');
            }
          } catch (subError) {
            console.error('[Webhook] invoice.payment_succeeded: Error:', subError);
          }
        }
        break;
      }

      // Handle subscription paused (optional feature)
      case 'customer.subscription.paused': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle both string and object cases for customer
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as any)?.id;

        if (!customerId) {
          console.error('[Webhook] customer.subscription.paused: No customer ID');
          break;
        }

        try {
          // Mark subscription as inactive but keep tier as Pro (they can resume)
          const success = await subscriptionService.updateSubscriptionStatus(customerId, 'inactive');
          if (success) {
          } else {
            console.error(`[Webhook] FAILED to pause subscription for customer ${customerId}`);
          }
        } catch (updateError) {
          console.error('[Webhook] Error pausing subscription:', updateError);
        }
        break;
      }

      // Handle subscription resumed (optional feature)
      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle both string and object cases for customer
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as any)?.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subObj = subscription as any;
        const periodEnd = subObj.current_period_end || subObj.currentPeriodEnd;

        if (!customerId) {
          console.error('[Webhook] customer.subscription.resumed: No customer ID');
          break;
        }

        if (!periodEnd || typeof periodEnd !== 'number') {
          console.error('[Webhook] customer.subscription.resumed: Invalid period_end:', periodEnd);
          break;
        }

        const expiresAt = new Date(periodEnd * 1000);

        if (isNaN(expiresAt.getTime())) {
          console.error('[Webhook] customer.subscription.resumed: Invalid date from:', periodEnd);
          break;
        }

        try {
          // Reactivate the subscription
          const success = await subscriptionService.updateSubscriptionStatus(customerId, 'active', expiresAt);
          if (success) {
          } else {
            console.error(`[Webhook] FAILED to resume subscription for customer ${customerId}`);
          }
        } catch (updateError) {
          console.error('[Webhook] Error resuming subscription:', updateError);
        }
        break;
      }

      default:
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
