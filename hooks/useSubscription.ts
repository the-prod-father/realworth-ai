import { useState, useEffect, useCallback } from 'react';
import { subscriptionService, UserSubscription } from '@/services/subscriptionService';

export function useSubscription(userId: string | null, userEmail?: string | null) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await subscriptionService.getUserSubscription(userId);
      setSubscription(data);
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('Failed to load subscription');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const checkCanAppraise = useCallback(async () => {
    if (!userId) return { canCreate: false, remaining: 0, isPro: false };
    return subscriptionService.canCreateAppraisal(userId);
  }, [userId]);

  const incrementUsage = useCallback(async () => {
    if (!userId) return { count: 0, limitReached: false };
    return subscriptionService.incrementAppraisalCount(userId);
  }, [userId]);

  const openPortal = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error opening portal:', err);
    }
  }, [userId]);

  const cancelSubscription = useCallback(async (): Promise<{ success: boolean; cancelAt?: string; error?: string }> => {
    if (!userId) return { success: false, error: 'Not logged in' };

    try {
      const response = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to cancel' };
      }

      // Refresh subscription data after cancellation
      await loadSubscription();

      return { success: true, cancelAt: data.cancelAt };
    } catch (err) {
      console.error('Error canceling subscription:', err);
      return { success: false, error: 'Network error' };
    }
  }, [userId, loadSubscription]);

  const reactivateSubscription = useCallback(async (): Promise<{ success: boolean; renewsAt?: string; error?: string }> => {
    if (!userId) return { success: false, error: 'Not logged in' };

    try {
      const response = await fetch('/api/stripe/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to reactivate' };
      }

      // Refresh subscription data after reactivation
      await loadSubscription();

      return { success: true, renewsAt: data.renewsAt };
    } catch (err) {
      console.error('Error reactivating subscription:', err);
      return { success: false, error: 'Network error' };
    }
  }, [userId, loadSubscription]);

  // Check if Pro (including super admin)
  const isPro = userEmail
    ? subscriptionService.isProByEmail(userEmail, subscription)
    : subscription?.subscriptionTier === 'pro' && subscription?.subscriptionStatus === 'active';

  return {
    subscription,
    isLoading,
    error,
    isPro,
    isSuperAdmin: userEmail ? subscriptionService.isSuperAdmin(userEmail) : false,
    usageCount: subscription?.monthlyAppraisalCount || 0,
    checkCanAppraise,
    incrementUsage,
    openPortal,
    cancelSubscription,
    reactivateSubscription,
    refresh: loadSubscription,
  };
}
