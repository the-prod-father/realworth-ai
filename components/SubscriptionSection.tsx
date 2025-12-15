'use client';

import React from 'react';
import Link from 'next/link';
import { CheckIcon, SparklesIcon } from '@/components/icons';
import { UserSubscription, FREE_APPRAISAL_LIMIT } from '@/services/subscriptionService';

interface SubscriptionSectionProps {
  subscription: UserSubscription | null;
  isPro: boolean;
  isLoading: boolean;
  error?: string | null;
  openPortal: () => Promise<void>;
  cancelSubscription: () => Promise<{ success: boolean; cancelAt?: string; error?: string }>;
  reactivateSubscription: () => Promise<{ success: boolean; renewsAt?: string; error?: string }>;
  onRetry?: () => void;
}

export function SubscriptionSection({
  subscription,
  isPro,
  isLoading,
  error,
  openPortal,
  cancelSubscription,
  reactivateSubscription,
  onRetry,
}: SubscriptionSectionProps) {
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [isCanceling, setIsCanceling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);
  const [showReactivateModal, setShowReactivateModal] = React.useState(false);
  const [isReactivating, setIsReactivating] = React.useState(false);
  const [reactivateError, setReactivateError] = React.useState<string | null>(null);

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

  // Determine if subscription is annual based on expiration date
  // Annual subscriptions will have expiration > 60 days from now
  const isAnnualSubscription = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    const expiration = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiration = (expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiration > 60;
  };

  // Get status display info
  const getStatusDisplay = (status: string, cancelAtPeriodEnd?: boolean) => {
    // Show "Canceling" when subscription is active but scheduled for cancellation
    if (status === 'active' && cancelAtPeriodEnd) {
      return { text: 'Canceling', color: 'text-amber-600', bgColor: 'bg-amber-100' };
    }
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

  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    setCancelError(null);

    const result = await cancelSubscription();

    if (result.success) {
      setShowCancelModal(false);
      // The subscription data will be refreshed by the hook
    } else {
      setCancelError(result.error || 'Failed to cancel subscription');
    }

    setIsCanceling(false);
  };

  const handleReactivateSubscription = async () => {
    setIsReactivating(true);
    setReactivateError(null);

    const result = await reactivateSubscription();

    if (result.success) {
      setShowReactivateModal(false);
      // The subscription data will be refreshed by the hook
    } else {
      setReactivateError(result.error || 'Failed to reactivate subscription');
    }

    setIsReactivating(false);
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
    const limit = FREE_APPRAISAL_LIMIT;
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
          Upgrade to Pro
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

  const statusInfo = getStatusDisplay(subscription.subscriptionStatus, subscription.cancelAtPeriodEnd);

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
            {subscription.subscriptionStatus === 'canceled'
              ? 'Access until:'
              : subscription.cancelAtPeriodEnd
                ? 'Pro ends:'
                : 'Renews:'}
          </span>
          <span className="text-slate-800 font-medium">
            {formatDate(subscription.subscriptionExpiresAt)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Plan:</span>
          <span className="text-slate-800 font-medium">
            {isAnnualSubscription(subscription.subscriptionExpiresAt)
              ? 'Annual'
              : 'Monthly'}
          </span>
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

      {/* Scheduled cancellation info */}
      {subscription.subscriptionStatus === 'active' && subscription.cancelAtPeriodEnd && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800 text-xs">
            Your subscription is scheduled to end on <strong>{formatDate(subscription.subscriptionExpiresAt)}</strong>.
            You&apos;ll retain Pro access until then. Click &quot;Reactivate&quot; below to continue your subscription.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 space-y-2">
        {/* Update Payment button - always available */}
        <button
          onClick={handleManageSubscription}
          disabled={isRedirecting}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
        >
          {isRedirecting ? 'Redirecting...' : 'Update Payment Method'}
        </button>

        {/* Cancel button - only for active subscriptions NOT scheduled for cancellation */}
        {subscription.subscriptionStatus === 'active' && !subscription.cancelAtPeriodEnd && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full bg-white hover:bg-red-50 border border-red-200 text-red-600 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
          >
            Cancel Subscription
          </button>
        )}

        {/* Reactivate button - only when active but scheduled for cancellation */}
        {subscription.subscriptionStatus === 'active' && subscription.cancelAtPeriodEnd && (
          <button
            onClick={() => setShowReactivateModal(true)}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
          >
            Reactivate Subscription
          </button>
        )}
      </div>

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

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { setShowCancelModal(false); setCancelError(null); }}
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Cancel Subscription?
            </h3>
            <p className="text-slate-600 text-sm mb-4">
              Are you sure you want to cancel? You&apos;ll keep Pro access until{' '}
              <strong>{formatDate(subscription.subscriptionExpiresAt)}</strong>, then your account will revert to the free plan.
            </p>

            {cancelError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{cancelError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelError(null);
                }}
                disabled={isCanceling}
                className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 text-slate-700 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isCanceling}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                {isCanceling ? 'Canceling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Confirmation Modal */}
      {showReactivateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { setShowReactivateModal(false); setReactivateError(null); }}
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Reactivate Subscription?
            </h3>
            <p className="text-slate-600 text-sm mb-4">
              Your subscription will resume and automatically renew on{' '}
              <strong>{formatDate(subscription.subscriptionExpiresAt)}</strong>. You&apos;ll continue enjoying Pro features without interruption.
            </p>

            {reactivateError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{reactivateError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReactivateModal(false);
                  setReactivateError(null);
                }}
                disabled={isReactivating}
                className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 text-slate-700 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReactivateSubscription}
                disabled={isReactivating}
                className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                {isReactivating ? 'Reactivating...' : 'Yes, Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
