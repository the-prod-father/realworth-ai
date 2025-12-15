import { supabase, getSupabaseAdmin } from '@/lib/supabase';
import { FREE_APPRAISAL_LIMIT } from '@/lib/constants';

export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'canceled';

// Re-export for convenience
export { FREE_APPRAISAL_LIMIT };

// Super admin emails - always have Pro features
const SUPER_ADMIN_EMAILS = [
  'gavin@realworth.ai',
];

export interface UserSubscription {
  subscriptionTier: SubscriptionTier;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  monthlyAppraisalCount: number;
  appraisalCountResetAt: string | null;
  accessCodeUsed: string | null;
}

class SubscriptionService {
  /**
   * Check if email is super admin
   */
  isSuperAdmin(email: string): boolean {
    return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
  }

  /**
   * Get user's subscription data
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          subscription_tier,
          stripe_customer_id,
          stripe_subscription_id,
          subscription_status,
          subscription_expires_at,
          cancel_at_period_end,
          monthly_appraisal_count,
          appraisal_count_reset_at,
          access_code_used
        `)
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      return {
        subscriptionTier: (data.subscription_tier as SubscriptionTier) || 'free',
        stripeCustomerId: data.stripe_customer_id,
        stripeSubscriptionId: data.stripe_subscription_id,
        subscriptionStatus: (data.subscription_status as SubscriptionStatus) || 'inactive',
        subscriptionExpiresAt: data.subscription_expires_at,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        monthlyAppraisalCount: data.monthly_appraisal_count || 0,
        appraisalCountResetAt: data.appraisal_count_reset_at,
        accessCodeUsed: data.access_code_used || null,
      };
    } catch (error) {
      console.error('Error in getUserSubscription:', error);
      return null;
    }
  }

  /**
   * Check if user is Pro (by userId)
   */
  async isPro(userId: string): Promise<boolean> {
    // Check subscription
    const subscription = await this.getUserSubscription(userId);
    if (subscription?.subscriptionTier === 'pro' && subscription?.subscriptionStatus === 'active') {
      return true;
    }

    // Check super admin by getting user email
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (user?.email && this.isSuperAdmin(user.email)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user is Pro (by email - faster for UI)
   */
  isProByEmail(email: string, subscription: UserSubscription | null): boolean {
    if (this.isSuperAdmin(email)) return true;
    return subscription?.subscriptionTier === 'pro' && subscription?.subscriptionStatus === 'active';
  }

  /**
   * Update user's Stripe customer ID
   */
  async updateStripeCustomerId(userId: string, customerId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);

      if (error) {
        console.error('Error updating Stripe customer ID:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in updateStripeCustomerId:', error);
      return false;
    }
  }

  /**
   * Activate Pro subscription after successful checkout
   * Uses admin client to bypass RLS (called from webhook)
   */
  async activateProSubscription(
    stripeCustomerId: string,
    subscriptionId: string,
    expiresAt: Date
  ): Promise<boolean> {
    try {
      console.log('[SubscriptionService] activateProSubscription called:', {
        stripeCustomerId,
        subscriptionId,
        expiresAt: expiresAt.toISOString(),
      });

      const supabaseAdmin = getSupabaseAdmin();

      // First verify the user exists with this stripe_customer_id
      const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('id, email, subscription_tier')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      if (fetchError || !existingUser) {
        console.error('[SubscriptionService] User not found with stripe_customer_id:', stripeCustomerId, fetchError);
        return false;
      }

      console.log('[SubscriptionService] Found user:', {
        id: existingUser.id,
        email: existingUser.email,
        currentTier: existingUser.subscription_tier,
      });

      const { data, error } = await supabaseAdmin
        .from('users')
        .update({
          subscription_tier: 'pro',
          stripe_subscription_id: subscriptionId,
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString(),
          cancel_at_period_end: false, // Reset on new/renewed subscription
        })
        .eq('stripe_customer_id', stripeCustomerId)
        .select();

      if (error) {
        console.error('[SubscriptionService] Error activating Pro subscription:', error);
        return false;
      }

      console.log('[SubscriptionService] Update result:', data);
      return true;
    } catch (error) {
      console.error('[SubscriptionService] Error in activateProSubscription:', error);
      return false;
    }
  }

  /**
   * Update subscription status
   * Uses admin client to bypass RLS (called from webhook)
   */
  async updateSubscriptionStatus(
    stripeCustomerId: string,
    status: SubscriptionStatus,
    expiresAt?: Date,
    cancelAtPeriodEnd?: boolean
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {
        subscription_status: status,
      };

      if (expiresAt) {
        updateData.subscription_expires_at = expiresAt.toISOString();
      }

      // Track cancellation schedule
      if (cancelAtPeriodEnd !== undefined) {
        updateData.cancel_at_period_end = cancelAtPeriodEnd;
      }

      // If canceled or past_due, downgrade tier
      if (status === 'canceled') {
        updateData.subscription_tier = 'free';
        updateData.stripe_subscription_id = null;
        updateData.cancel_at_period_end = false;
      }

      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('stripe_customer_id', stripeCustomerId);

      if (error) {
        console.error('Error updating subscription status:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in updateSubscriptionStatus:', error);
      return false;
    }
  }

  /**
   * Increment monthly appraisal count for free tier tracking
   * Uses admin client to bypass RLS - ensures count is always updated
   */
  async incrementAppraisalCount(userId: string): Promise<{ count: number; limitReached: boolean }> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      // First check if we need to reset the count (new month)
      const { data: user, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('monthly_appraisal_count, appraisal_count_reset_at, subscription_tier, email')
        .eq('id', userId)
        .single();

      if (fetchError || !user) {
        console.error('[SubscriptionService] Failed to fetch user for increment:', fetchError);
        return { count: 0, limitReached: false };
      }

      // Super admin users have unlimited appraisals
      if (user.email && this.isSuperAdmin(user.email)) {
        return { count: user.monthly_appraisal_count || 0, limitReached: false };
      }

      // Pro users have unlimited appraisals
      if (user.subscription_tier === 'pro') {
        return { count: user.monthly_appraisal_count || 0, limitReached: false };
      }

      let currentCount = user.monthly_appraisal_count || 0;
      const resetAt = user.appraisal_count_reset_at ? new Date(user.appraisal_count_reset_at) : null;
      const now = new Date();

      // Reset count if it's a new month
      if (!resetAt || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
        console.log('[SubscriptionService] Resetting monthly count for user:', userId);
        currentCount = 0;
      }

      // Increment count
      const newCount = currentCount + 1;
      const limitReached = newCount >= FREE_APPRAISAL_LIMIT;

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          monthly_appraisal_count: newCount,
          appraisal_count_reset_at: now.toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('[SubscriptionService] CRITICAL: Failed to increment appraisal count:', updateError);
        // Return current count but don't mark as failed - the appraisal already happened
        return { count: currentCount, limitReached: currentCount >= FREE_APPRAISAL_LIMIT };
      }

      console.log('[SubscriptionService] Incremented appraisal count:', { userId, newCount, limitReached, limit: FREE_APPRAISAL_LIMIT });
      return { count: newCount, limitReached };
    } catch (error) {
      console.error('[SubscriptionService] Error in incrementAppraisalCount:', error);
      return { count: 0, limitReached: false };
    }
  }

  /**
   * Check if user can create an appraisal
   * Uses admin client for reliable reads
   */
  async canCreateAppraisal(userId: string): Promise<{ canCreate: boolean; remaining: number; isPro: boolean; currentCount: number }> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('email, monthly_appraisal_count, appraisal_count_reset_at, subscription_tier, subscription_status')
        .eq('id', userId)
        .single();

      if (error || !user) {
        console.error('[SubscriptionService] Failed to fetch user for canCreateAppraisal:', error);
        return { canCreate: false, remaining: 0, isPro: false, currentCount: 0 };
      }

      // Super admin or Pro users have unlimited
      if (this.isSuperAdmin(user.email) || (user.subscription_tier === 'pro' && user.subscription_status === 'active')) {
        return { canCreate: true, remaining: Infinity, isPro: true, currentCount: user.monthly_appraisal_count || 0 };
      }

      let currentCount = user.monthly_appraisal_count || 0;
      const resetAt = user.appraisal_count_reset_at ? new Date(user.appraisal_count_reset_at) : null;
      const now = new Date();

      // Reset count if it's a new month
      if (!resetAt || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
        currentCount = 0;
      }

      const remaining = Math.max(0, FREE_APPRAISAL_LIMIT - currentCount);

      console.log('[SubscriptionService] canCreateAppraisal check:', {
        userId,
        currentCount,
        limit: FREE_APPRAISAL_LIMIT,
        remaining,
        canCreate: currentCount < FREE_APPRAISAL_LIMIT
      });

      return {
        canCreate: currentCount < FREE_APPRAISAL_LIMIT,
        remaining,
        isPro: false,
        currentCount,
      };
    } catch (error) {
      console.error('[SubscriptionService] Error in canCreateAppraisal:', error);
      return { canCreate: false, remaining: 0, isPro: false, currentCount: 0 };
    }
  }

  /**
   * Get user by Stripe customer ID
   */
  async getUserByStripeCustomerId(customerId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (error || !data) {
        return null;
      }
      return data.id;
    } catch (error) {
      console.error('Error in getUserByStripeCustomerId:', error);
      return null;
    }
  }
}

export const subscriptionService = new SubscriptionService();
