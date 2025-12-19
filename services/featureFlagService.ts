import { supabase, getSupabaseAdmin } from '@/lib/supabase';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  targetPercentage: number;
  targetUserIds: string[];
  targetProOnly: boolean;
  createdAt: string;
  updatedAt: string;
}

// Known feature flag names for type safety
export type FeatureFlagName =
  | 'ai_chat'
  | 'insurance_certificates'
  | 'dealer_network'
  | 'one_click_selling'
  | 'price_tracking'
  | 'marketplace'
  | 'explore_events';

class FeatureFlagService {
  private cache: Map<string, { flag: FeatureFlag; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache

  /**
   * Get all feature flags (for admin dashboard)
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching feature flags:', error);
        return [];
      }

      return data.map(this.mapFlag);
    } catch (error) {
      console.error('Error in getAllFlags:', error);
      return [];
    }
  }

  /**
   * Get a single feature flag by name
   */
  async getFlag(name: FeatureFlagName): Promise<FeatureFlag | null> {
    // Check cache first
    const cached = this.cache.get(name);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.flag;
    }

    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('name', name)
        .single();

      if (error || !data) {
        console.error('Error fetching feature flag:', error);
        return null;
      }

      const flag = this.mapFlag(data);

      // Update cache
      this.cache.set(name, {
        flag,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      return flag;
    } catch (error) {
      console.error('Error in getFlag:', error);
      return null;
    }
  }

  /**
   * Check if a feature is enabled for a user
   * Considers: global enabled state, pro-only targeting, percentage rollout, specific user targeting
   */
  async isEnabled(
    name: FeatureFlagName,
    options?: { userId?: string; isPro?: boolean }
  ): Promise<boolean> {
    const flag = await this.getFlag(name);

    if (!flag) {
      return false; // Flag doesn't exist, default to disabled
    }

    if (!flag.enabled) {
      return false; // Globally disabled
    }

    // Check pro-only targeting
    if (flag.targetProOnly && options?.isPro === false) {
      return false; // Feature is pro-only and user is not pro
    }

    // Check specific user targeting
    if (flag.targetUserIds.length > 0) {
      if (!options?.userId) {
        return false; // User targeting set but no userId provided
      }
      if (!flag.targetUserIds.includes(options.userId)) {
        return false; // User not in target list
      }
    }

    // Check percentage rollout (simple deterministic approach)
    if (flag.targetPercentage < 100 && options?.userId) {
      const hash = this.hashUserId(options.userId, name);
      if (hash > flag.targetPercentage) {
        return false; // User not in rollout percentage
      }
    }

    return true;
  }

  /**
   * Update a feature flag (admin only - uses API route)
   */
  async updateFlag(
    name: FeatureFlagName,
    updates: Partial<{
      enabled: boolean;
      description: string;
      targetPercentage: number;
      targetUserIds: string[];
      targetProOnly: boolean;
    }>
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/admin/flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          ...updates,
        }),
      });

      if (!response.ok) {
        console.error('Error updating feature flag:', await response.text());
        return false;
      }

      // Clear cache for this flag
      this.cache.delete(name);

      return true;
    } catch (error) {
      console.error('Error in updateFlag:', error);
      return false;
    }
  }

  /**
   * Create a new feature flag (admin only)
   */
  async createFlag(
    name: string,
    options?: {
      description?: string;
      enabled?: boolean;
      targetPercentage?: number;
      targetProOnly?: boolean;
    }
  ): Promise<FeatureFlag | null> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      const { data, error } = await supabaseAdmin
        .from('feature_flags')
        .insert({
          name,
          description: options?.description || null,
          enabled: options?.enabled ?? false,
          target_percentage: options?.targetPercentage ?? 100,
          target_pro_only: options?.targetProOnly ?? false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating feature flag:', error);
        return null;
      }

      return this.mapFlag(data);
    } catch (error) {
      console.error('Error in createFlag:', error);
      return null;
    }
  }

  /**
   * Map database row to FeatureFlag interface
   */
  private mapFlag(row: Record<string, unknown>): FeatureFlag {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      enabled: row.enabled as boolean,
      targetPercentage: row.target_percentage as number,
      targetUserIds: (row.target_user_ids as string[]) || [],
      targetProOnly: row.target_pro_only as boolean,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  /**
   * Generate a deterministic hash (0-100) for percentage rollouts
   */
  private hashUserId(userId: string, flagName: string): number {
    const str = `${userId}:${flagName}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash % 100);
  }

  /**
   * Clear the cache (useful for testing or after admin updates)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const featureFlagService = new FeatureFlagService();
