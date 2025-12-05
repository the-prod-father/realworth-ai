'use client';

import React from 'react';
import Link from 'next/link';
import { CheckIcon, SparklesIcon } from '@/components/icons';
import { UserSubscription } from '@/services/subscriptionService';

interface SubscriptionSectionProps {
  subscription: UserSubscription | null;
  isPro: boolean;
  isLoading: boolean;
  error?: string | null;
  openPortal: () => Promise<void>;
  onRetry?: () => void;
}

export function SubscriptionSection({
  subscription,
  isPro,
  isLoading,
  error,
  openPortal,
  onRetry,
}: SubscriptionSectionProps) {
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  // Format the renewal date nicely
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get status display info
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return { text: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'past_due':
        return { text: 'Past Due', color: 'text-amber-600', bgColor: 'bg-amber-100' };
      case 'canceled':
        return { text: 'Canceled', color: 'text-red-600', bgColor: 'bg-red-100' };
      default:
        return { text: 'Inactive', color: 'text-slate-600', bgColor: 'bg-slate-100' };
    }
  };

  const handleManageSubscription = async () => {
    setIsRedirecting(true);
    try {
      await openPortal();
    } catch (err) {
      console.error('Error opening portal:', err);
      setIsRedirecting(false);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-40 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 rounded w-24"></div>
          <div className="h-4 bg-slate-200 rounded w-32"></div>
          <div className="h-4 bg-slate-200 rounded w-20"></div>
        </div>
        <div className="h-10 bg-slate-200 rounded w-full mt-4"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-4 mb-6">
        <div className="text-center">
          <p className="text-red-600 text-sm mb-3">Failed to load subscription info</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-teal-600 hover:text-teal-700 text-sm font-medium underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  // Determine user tier type
  const hasStripeSubscription = subscription?.stripeCustomerId && isPro;
  const hasAccessCode = subscription?.accessCodeUsed && isPro;
  const isFreeUser = !isPro;

  // ═══════════════════════════════════════════════════════════
  // FREE USER - Show upgrade prompt
  // ═══════════════════════════════════════════════════════════
  if (isFreeUser) {
    const usageCount = subscription?.monthlyAppraisalCount || 0;
    const limit = 10;
    const remaining = Math.max(0, limit - usageCount);

    return (
      <div className="bg-gradient-to-br from-slate-50 to-teal-50 rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center gap-1.5 bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full text-xs font-semibold">
            Free Plan
          </span>
        </div>

        <div className="mb-4">
          <p className="text-slate-700 text-sm mb-2">
            <span className="font-semibold">{remaining}</span> of {limit} free appraisals remaining this month
          </p>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-teal-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, (usageCount / limit) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 mb-4 border border-teal-200">
          <div className="flex items-start gap-2">
            <SparklesIcon className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-800 font-semibold text-sm">Upgrade to Pro</p>
              <ul className="text-slate-600 text-xs mt-1 space-y-1">
                <li>• Unlimited appraisals</li>
                <li>• AI chat with your collection</li>
                <li>• Priority support</li>
              </ul>
            </div>
          </div>
        </div>

        <Link
          href="/#pricing"
          className="block w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm text-center"
        >
          Upgrade for $9.99/month
        </Link>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ACCESS CODE USER - Show Pro via Access Code
  // ═══════════════════════════════════════════════════════════
  if (hasAccessCode && !hasStripeSubscription) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-xs font-semibold">
              <CheckIcon className="w-3.5 h-3.5" />
              Pro via Access Code
            </span>
          </h3>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Status:</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-600">
              Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Access Code:</span>
            <span className="text-slate-800 font-medium font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
              {subscription.accessCodeUsed}
            </span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-purple-800 text-xs">
            You have Pro access via an access code. Enjoy unlimited appraisals and all Pro features!
          </p>
        </div>

        <p className="mt-3 text-center text-xs text-slate-400">
          Questions?{' '}
          <a
            href="mailto:support@realworth.ai"
            className="text-teal-600 hover:text-teal-700 underline"
          >
            Contact support@realworth.ai
          </a>
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // STRIPE PRO USER - Show full subscription management
  // ═══════════════════════════════════════════════════════════
  if (!subscription) {
    return null;
  }

  const statusInfo = getStatusDisplay(subscription.subscriptionStatus);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
      {/* Header with Pro badge */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span className="flex items-center gap-1.5 bg-teal-100 text-teal-700 px-2.5 py-1 rounded-full text-xs font-semibold">
            <CheckIcon className="w-3.5 h-3.5" />
            Pro Subscription
          </span>
        </h3>
      </div>

      {/* Subscription details */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Status:</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">
            {subscription.subscriptionStatus === 'canceled' ? 'Access until:' : 'Renews:'}
          </span>
          <span className="text-slate-800 font-medium">
            {formatDate(subscription.subscriptionExpiresAt)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Price:</span>
          <span className="text-slate-800 font-medium">$9.99/month</span>
        </div>
      </div>

      {/* Past due warning */}
      {subscription.subscriptionStatus === 'past_due' && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800 text-xs">
            Your payment is past due. Please update your payment method to continue enjoying Pro features.
          </p>
        </div>
      )}

      {/* Canceled info */}
      {subscription.subscriptionStatus === 'canceled' && (
        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-slate-600 text-xs">
            Your subscription has been canceled. You&apos;ll retain Pro access until the expiration date above.
          </p>
        </div>
      )}

      {/* Manage button */}
      <button
        onClick={handleManageSubscription}
        disabled={isRedirecting}
        className="mt-4 w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
      >
        {isRedirecting ? 'Redirecting...' : 'Manage Subscription'}
      </button>

      {/* Support link */}
      <p className="mt-3 text-center text-xs text-slate-400">
        Questions?{' '}
        <a
          href="mailto:support@realworth.ai"
          className="text-teal-600 hover:text-teal-700 underline"
        >
          Contact support@realworth.ai
        </a>
      </p>
    </div>
  );
}
