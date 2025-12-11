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
      .select('stripe_subscription_id, cancel_at_period_end')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      console.error('[Reactivate] Failed to fetch user:', fetchError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    if (!user.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'Subscription is not scheduled for cancellation' },
        { status: 400 }
      );
    }

    console.log('[Reactivate] Reactivating subscription for user:', userId);
    console.log('[Reactivate] Stripe subscription ID:', user.stripe_subscription_id);

    const stripe = getStripe();

    // First, check current Stripe state to handle edge cases
    const currentSubscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);

    // If Stripe already shows as not canceling, just sync our DB and return success
    if (!currentSubscription.cancel_at_period_end) {
      console.log('[Reactivate] Subscription already active in Stripe, syncing DB');

      const { error: syncError } = await supabaseAdmin
        .from('users')
        .update({ cancel_at_period_end: false })
        .eq('id', userId);

      if (syncError) {
        console.error('[Reactivate] Failed to sync DB:', syncError);
      }

      // Get period end timestamp - Stripe returns it as a Unix timestamp
      const periodEnd = currentSubscription.current_period_end;
      const renewsAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

      return NextResponse.json({
        success: true,
        renewsAt,
        message: 'Subscription already active',
      });
    }

    // Reactivate by removing the cancel_at_period_end flag
    const reactivatedSubscription = await stripe.subscriptions.update(
      user.stripe_subscription_id,
      { cancel_at_period_end: false }
    );

    // Get period end timestamp - Stripe returns it as a Unix timestamp
    const periodEnd = reactivatedSubscription.current_period_end;
    const renewsAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

    console.log('[Reactivate] Subscription reactivated:', {
      subscriptionId: reactivatedSubscription.id,
      cancelAtPeriodEnd: reactivatedSubscription.cancel_at_period_end,
      renewsAt,
    });

    // Update our database to reflect the reactivation
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ cancel_at_period_end: false })
      .eq('id', userId);

    if (updateError) {
      console.error('[Reactivate] Failed to update cancel_at_period_end in database:', updateError);
      // Don't fail the request - Stripe has already reactivated
    }

    return NextResponse.json({
      success: true,
      renewsAt,
    });
  } catch (error) {
    console.error('[Reactivate] Error reactivating subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to reactivate subscription', details: errorMessage },
      { status: 500 }
    );
  }
}
