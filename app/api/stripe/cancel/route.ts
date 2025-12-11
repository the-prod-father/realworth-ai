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

    // Cancel at period end (user keeps access until billing cycle ends)
    const stripe = getStripe();
    const canceledSubscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subData = canceledSubscription as any;
    const periodEnd = subData.current_period_end || subData.currentPeriodEnd;
    const cancelAt = new Date(periodEnd * 1000).toISOString();

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
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
