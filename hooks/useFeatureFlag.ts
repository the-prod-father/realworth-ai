import { useState, useEffect, useCallback } from 'react';
import { featureFlagService, FeatureFlag, FeatureFlagName } from '@/services/featureFlagService';

interface UseFeatureFlagOptions {
  userId?: string | null;
  isPro?: boolean;
}

/**
 * Hook to check if a feature flag is enabled for the current user
 */
export function useFeatureFlag(
  flagName: FeatureFlagName,
  options?: UseFeatureFlagOptions
) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [flag, setFlag] = useState<FeatureFlag | null>(null);

  const checkFlag = useCallback(async () => {
    try {
      setIsLoading(true);

      const flagData = await featureFlagService.getFlag(flagName);
      setFlag(flagData);

      const enabled = await featureFlagService.isEnabled(flagName, {
        userId: options?.userId || undefined,
        isPro: options?.isPro,
      });

      setIsEnabled(enabled);
    } catch (error) {
      console.error(`Error checking feature flag ${flagName}:`, error);
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  }, [flagName, options?.userId, options?.isPro]);

  useEffect(() => {
    checkFlag();
  }, [checkFlag]);

  return {
    isEnabled,
    isLoading,
    flag,
    refresh: checkFlag,
  };
}

/**
 * Hook to get all feature flags (for admin dashboard)
 */
export function useAllFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFlags = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await featureFlagService.getAllFlags();
      setFlags(data);
    } catch (err) {
      console.error('Error loading feature flags:', err);
      setError('Failed to load feature flags');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const updateFlag = useCallback(async (
    name: FeatureFlagName,
    updates: Partial<{
      enabled: boolean;
      description: string;
      targetPercentage: number;
      targetUserIds: string[];
      targetProOnly: boolean;
    }>
  ) => {
    const success = await featureFlagService.updateFlag(name, updates);
    if (success) {
      // Refresh flags after update
      await loadFlags();
    }
    return success;
  }, [loadFlags]);

  return {
    flags,
    isLoading,
    error,
    updateFlag,
    refresh: loadFlags,
  };
}
