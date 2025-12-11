import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase';

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

    // Get user's subscription info using admin client (bypasses RLS)
    const supabaseAdmin = getSupabaseAdmin();
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('stripe_subscription_id, subscription_status')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      console.error('[Cancel] Failed to fetch user:', fetchError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const stripeSubscriptionId = user.stripe_subscription_id;

    console.log('[Cancel] Canceling subscription for user:', userId);
    console.log('[Cancel] Stripe subscription ID:', stripeSubscriptionId);

    const stripe = getStripe();

    // First, check current Stripe state to handle edge cases
    const currentSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    // If Stripe already shows as canceling, just sync our DB and return success
    if (currentSubscription.cancel_at_period_end) {
      console.log('[Cancel] Subscription already scheduled for cancellation in Stripe, syncing DB');

      const { error: syncError } = await supabaseAdmin
        .from('users')
        .update({ cancel_at_period_end: true })
        .eq('id', userId);

      if (syncError) {
        console.error('[Cancel] Failed to sync DB:', syncError);
      }

      // Get period end timestamp - Stripe returns it as a Unix timestamp
      const periodEnd = currentSubscription.current_period_end;
      const cancelAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

      return NextResponse.json({
        success: true,
        cancelAt,
        message: 'Subscription already scheduled for cancellation',
      });
    }

    // Cancel at period end (user keeps access until billing cycle ends)
    const canceledSubscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    // Get period end timestamp - Stripe returns it as a Unix timestamp
    const periodEnd = canceledSubscription.current_period_end;
    const cancelAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

    console.log('[Cancel] Subscription scheduled for cancellation:', {
      subscriptionId: canceledSubscription.id,
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      currentPeriodEnd: cancelAt,
    });

    // Update our database to reflect the cancellation
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ cancel_at_period_end: true })
      .eq('id', userId);

    if (updateError) {
      console.error('[Cancel] Failed to update cancel_at_period_end in database:', updateError);
      // Don't fail the request - Stripe has already canceled
    }

    return NextResponse.json({
      success: true,
      cancelAt,
    });
  } catch (error) {
    console.error('[Cancel] Error canceling subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to cancel subscription', details: errorMessage },
      { status: 500 }
    );
  }
}
