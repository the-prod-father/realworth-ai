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
    refresh: loadSubscription,
  };
}
