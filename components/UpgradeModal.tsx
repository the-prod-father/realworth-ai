'use client';

import React, { useState, useEffect } from 'react';
import { trackUpgradeClick, trackCheckoutStart } from '@/lib/analytics';
import {
  SparklesIcon,
  GemIcon,
  ShieldIcon,
  CameraIcon,
  GridIcon,
  BoltIcon,
  CheckIcon,
  ClockIcon,
  TrendingUpIcon
} from '@/components/icons';

type BillingInterval = 'monthly' | 'annual';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  userName: string;
  feature?: string;
  onAccessCodeSuccess?: () => void;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  userName,
  feature,
  onAccessCodeSuccess,
}: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [accessCodeError, setAccessCodeError] = useState('');
  const [accessCodeSuccess, setAccessCodeSuccess] = useState('');
  const [mounted, setMounted] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('annual');

  // Ensure client-side only rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track when upgrade modal is opened
  useEffect(() => {
    if (isOpen && mounted) {
      trackUpgradeClick(feature || 'modal');
    }
  }, [isOpen, feature, mounted]);

  if (!isOpen || !mounted) return null;

  const handleUpgrade = async () => {
    setIsLoading(true);
    trackCheckoutStart();
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userEmail, userName, billingInterval }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setIsLoading(true);
    setAccessCodeError('');
    setAccessCodeSuccess('');

    try {
      const response = await fetch('/api/access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode, userId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAccessCodeSuccess(data.message);
        setTimeout(() => {
          onAccessCodeSuccess?.();
          onClose();
          window.location.reload();
        }, 1500);
      } else {
        setAccessCodeError(data.error || 'Invalid access code');
      }
    } catch (error) {
      console.error('Error redeeming access code:', error);
      setAccessCodeError('Failed to redeem code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 p-6 text-white text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 left-4 w-8 h-8 border-2 border-white rounded-full" />
            <div className="absolute top-8 right-8 w-4 h-4 bg-white rounded-full" />
            <div className="absolute bottom-4 left-12 w-6 h-6 border-2 border-white rotate-45" />
            <div className="absolute bottom-8 right-16 w-3 h-3 bg-white rounded-full" />
          </div>

          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <GemIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Unlock Your Fortune</h2>
            <p className="text-teal-100 text-sm">
              {feature ? `${feature} is a Pro feature` : 'Discover what your items are really worth'}
            </p>
          </div>
        </div>

        <div className="p-6">
          {/* Compelling stat */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <TrendingUpIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-slate-800 font-semibold text-sm">
                  1 in 4 households owns something worth $10,000+
                </p>
                <p className="text-slate-600 text-xs mt-0.5">
                  Most people never find out. Don&apos;t leave money on the table.
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-5">
            <Feature
              icon={<SparklesIcon className="w-4 h-4" />}
              text="AI Expert Analysis"
              description="Instant appraisals powered by advanced AI"
              highlight
            />
            <Feature
              icon={<BoltIcon className="w-4 h-4" />}
              text="Unlimited Appraisals"
              description="No monthly limits — appraise everything"
            />
            <Feature
              icon={<CameraIcon className="w-4 h-4" />}
              text="Unlimited Photos"
              description="Add as many angles as needed for accuracy"
            />
            <Feature
              icon={<GridIcon className="w-4 h-4" />}
              text="Collections & Catalog"
              description="Organize and track your items' values"
            />
            <Feature
              icon={<ShieldIcon className="w-4 h-4" />}
              text="Priority Support"
              description="Get expert help when you need it"
            />
          </div>

          {/* Comparison callout */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-5 justify-center">
            <ClockIcon className="w-4 h-4" />
            <span>Traditional appraisals cost $100-500 and take weeks</span>
          </div>

          {/* Billing Toggle */}
          <div className="mb-4">
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  billingInterval === 'monthly'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('annual')}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  billingInterval === 'annual'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Annual
                <span className="ml-1.5 text-xs text-emerald-600 font-semibold">Save 37%</span>
              </button>
            </div>
          </div>

          {/* Price */}
          <div className="text-center mb-5">
            {billingInterval === 'monthly' ? (
              <>
                <div className="text-4xl font-bold text-slate-900">
                  $19.99<span className="text-lg font-normal text-slate-500">/month</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">Cancel anytime. No commitment.</p>
              </>
            ) : (
              <>
                <div className="text-4xl font-bold text-slate-900">
                  $149.99<span className="text-lg font-normal text-slate-500">/year</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Just $12.50/month • <span className="text-emerald-600 font-medium">Save $90/year</span>
                </p>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                'Loading...'
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  Start Finding Hidden Value
                </>
              )}
            </button>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <CheckIcon className="w-3 h-3" />
                Cancel anytime
              </span>
              <span className="flex items-center gap-1">
                <ShieldIcon className="w-3 h-3" />
                Secure checkout
              </span>
            </div>

            {/* Access Code Section */}
            {!showAccessCode ? (
              <button
                onClick={() => setShowAccessCode(true)}
                className="w-full py-2 px-4 text-sm text-teal-600 hover:text-teal-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Have an access code?
              </button>
            ) : (
              <form onSubmit={handleAccessCodeSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="Enter access code"
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent uppercase tracking-wider"
                    disabled={isLoading}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="characters"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !accessCode.trim()}
                    className="px-5 py-3 bg-teal-500 text-white rounded-xl text-base font-medium hover:bg-teal-600 active:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? '...' : 'Redeem'}
                  </button>
                </div>
                {accessCodeError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {accessCodeError}
                  </p>
                )}
                {accessCodeSuccess && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {accessCodeSuccess}
                  </p>
                )}
              </form>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 px-4 text-slate-500 hover:text-slate-700 transition-colors text-sm"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeatureProps {
  icon: React.ReactNode;
  text: string;
  description: string;
  highlight?: boolean;
}

function Feature({ icon, text, description, highlight }: FeatureProps) {
  return (
    <div className={`flex items-start gap-3 ${highlight ? 'bg-teal-50 -mx-2 px-2 py-2 rounded-lg' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        highlight ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-600'
      }`}>
        {icon}
      </div>
      <div>
        <p className={`font-medium text-sm ${highlight ? 'text-teal-900' : 'text-slate-800'}`}>{text}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}
