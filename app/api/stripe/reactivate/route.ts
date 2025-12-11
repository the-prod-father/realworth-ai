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

    // Reactivate by removing the cancel_at_period_end flag
    const stripe = getStripe();
    const reactivatedSubscription = await stripe.subscriptions.update(
      user.stripe_subscription_id,
      { cancel_at_period_end: false }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subData = reactivatedSubscription as any;
    const periodEnd = subData.current_period_end || subData.currentPeriodEnd;
    const renewsAt = new Date(periodEnd * 1000).toISOString();

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
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}
