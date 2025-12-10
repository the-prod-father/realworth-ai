'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAllFeatureFlags } from '@/hooks/useFeatureFlag';
import { FeatureFlagName } from '@/services/featureFlagService';

// Feature flag display names and descriptions
const FLAG_METADATA: Record<string, { displayName: string; icon: string; color: string }> = {
  insurance_certificates: {
    displayName: 'Insurance Certificates',
    icon: '📄',
    color: 'teal',
  },
  dealer_network: {
    displayName: 'Dealer Network',
    icon: '🤝',
    color: 'blue',
  },
  one_click_selling: {
    displayName: 'One-Click Selling',
    icon: '🛒',
    color: 'purple',
  },
  price_tracking: {
    displayName: 'Price Tracking',
    icon: '📈',
    color: 'amber',
  },
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { flags, isLoading, updateFlag, refresh } = useAllFeatureFlags();
  const [updatingFlag, setUpdatingFlag] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    const adminToken = localStorage.getItem('realworth_admin_token');
    if (adminToken !== 'authenticated') {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('realworth_admin_token');
    router.push('/admin/login');
  };

  const handleToggle = async (flagName: string, currentEnabled: boolean) => {
    setUpdatingFlag(flagName);
    try {
      await updateFlag(flagName as FeatureFlagName, { enabled: !currentEnabled });
    } finally {
      setUpdatingFlag(null);
    }
  };

  if (isCheckingAuth || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              RealWorth<span className="text-slate-400 font-normal">.ai</span>
              <span className="ml-3 text-sm font-normal text-teal-400">Admin</span>
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Feature Flags</h2>
          <p className="text-slate-400 mt-1">
            Toggle features on and off for A/B testing and gradual rollouts
          </p>
        </div>

        {/* Feature Flags Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-800 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-slate-700 rounded w-1/2 mb-4" />
                <div className="h-4 bg-slate-700 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {flags.map((flag) => {
              const metadata = FLAG_METADATA[flag.name] || {
                displayName: flag.name,
                icon: '🔧',
                color: 'slate',
              };
              const isUpdating = updatingFlag === flag.name;

              return (
                <div
                  key={flag.id}
                  className={`bg-slate-800 rounded-xl p-6 border transition-all ${
                    flag.enabled
                      ? 'border-teal-500/30 shadow-lg shadow-teal-500/5'
                      : 'border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{metadata.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {metadata.displayName}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                          {flag.description || 'No description'}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggle(flag.name, flag.enabled)}
                      disabled={isUpdating}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                        flag.enabled ? 'bg-teal-500' : 'bg-slate-600'
                      } ${isUpdating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                          flag.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    <span className={`px-2 py-1 rounded-full ${
                      flag.enabled
                        ? 'bg-teal-500/10 text-teal-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    {flag.targetProOnly && (
                      <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-400">
                        Pro Only
                      </span>
                    )}
                    {flag.targetPercentage < 100 && (
                      <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400">
                        {flag.targetPercentage}% Rollout
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => refresh()}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Refresh Flags
          </button>
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">
            How Feature Flags Work
          </h3>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>• Toggle switches enable/disable features globally</li>
            <li>• "Pro Only" features require an active Pro subscription</li>
            <li>• Percentage rollouts gradually expose features to users</li>
            <li>• Changes take effect within 1 minute (cache TTL)</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
