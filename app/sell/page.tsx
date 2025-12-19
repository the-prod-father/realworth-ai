'use client';

import React, { useState, useEffect, useContext, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AuthContext } from '@/components/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useSeller } from '@/hooks/useSeller';
import { CheckIcon, LockIcon } from '@/components/icons';

type OnboardingStep = 'phone' | 'stripe' | 'complete';

function SellPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthLoading } = useContext(AuthContext);
  const { isPro, isLoading: isSubscriptionLoading } = useSubscription(user?.id ?? null, user?.email);
  const {
    status,
    loading: isSellerLoading,
    isVerifiedSeller,
    sendPhoneVerification,
    confirmPhoneVerification,
    startStripeConnect,
    refreshStatus,
    fetchConnectStatus,
  } = useSeller();

  // Phone verification state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Stripe state
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');

  // Check for Stripe Connect return
  useEffect(() => {
    const success = searchParams.get('success');
    const refresh = searchParams.get('refresh');

    if (success === 'true' || refresh === 'true') {
      // Refresh status after Stripe Connect return
      refreshStatus();
      fetchConnectStatus();
      // Clear URL params
      router.replace('/sell');
    }
  }, [searchParams, refreshStatus, fetchConnectStatus, router]);

  // Determine current step
  const getCurrentStep = (): OnboardingStep => {
    if (!status) return 'phone';
    if (status.isVerifiedSeller) return 'complete';
    if (!status.phoneVerified) return 'phone';
    if (!status.stripeConnectOnboarded) return 'stripe';
    return 'complete';
  };

  const currentStep = getCurrentStep();

  const handleSendCode = async () => {
    setPhoneError('');
    setPhoneLoading(true);

    const result = await sendPhoneVerification(phoneNumber);

    if (result.success) {
      setCodeSent(true);
    } else {
      setPhoneError(result.error || 'Failed to send code');
    }

    setPhoneLoading(false);
  };

  const handleVerifyCode = async () => {
    setPhoneError('');
    setPhoneLoading(true);

    const result = await confirmPhoneVerification(verificationCode);

    if (!result.success) {
      setPhoneError(result.error || 'Invalid code');
    }

    setPhoneLoading(false);
  };

  const handleStartStripeConnect = async () => {
    setStripeError('');
    setStripeLoading(true);

    const result = await startStripeConnect();

    if (result.url) {
      window.location.href = result.url;
    } else {
      setStripeError(result.error || 'Failed to start onboarding');
      setStripeLoading(false);
    }
  };

  // Loading state
  if (isAuthLoading || isSubscriptionLoading || isSellerLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-200" />
            <div className="h-4 w-32 rounded bg-slate-200" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <LockIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign In Required</h1>
            <p className="text-slate-600 mb-6">
              Please sign in to become a seller on RealWorth.
            </p>
            <Link
              href="/"
              className="inline-block bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not Pro subscriber
  if (!isPro) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">&#x1F451;</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Pro Required</h1>
            <p className="text-slate-600 mb-6">
              Selling on RealWorth requires a Pro subscription. Upgrade now to list your items and start earning!
            </p>
            <Link
              href="/profile"
              className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              Upgrade to Pro
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Already verified seller
  if (isVerifiedSeller) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
        <Header />
        <main className="flex-1 p-4">
          <div className="max-w-2xl mx-auto">
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-6 text-white mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckIcon className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold">You&apos;re a Verified Seller!</h1>
              </div>
              <p className="text-teal-50">
                You can now list items for sale on RealWorth. Head to any of your appraisals to list them.
              </p>
            </div>

            {/* Seller Stats */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Seller Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-teal-500">{status?.totalSales || 0}</div>
                  <div className="text-sm text-slate-600">Total Sales</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-amber-500">
                    {status?.sellerRating ? status.sellerRating.toFixed(1) : '-'}
                  </div>
                  <div className="text-sm text-slate-600">Rating</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/profile"
                  className="block w-full bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold text-center hover:bg-teal-600 transition-colors"
                >
                  View Your Appraisals to List
                </Link>
                <Link
                  href="/sell/listings"
                  className="block w-full bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold text-center hover:bg-slate-200 transition-colors"
                >
                  Manage Your Listings
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Onboarding Flow
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <Header />
      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto">
          {/* Progress Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Become a Seller</h1>
            <p className="text-slate-600">Complete these steps to start selling on RealWorth</p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
              status?.phoneVerified
                ? 'bg-teal-500 text-white'
                : currentStep === 'phone'
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-200 text-slate-500'
            }`}>
              {status?.phoneVerified ? <CheckIcon className="w-5 h-5" /> : '1'}
            </div>
            <div className={`w-16 h-1 rounded ${status?.phoneVerified ? 'bg-teal-500' : 'bg-slate-200'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
              status?.stripeConnectOnboarded
                ? 'bg-teal-500 text-white'
                : currentStep === 'stripe'
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-200 text-slate-500'
            }`}>
              {status?.stripeConnectOnboarded ? <CheckIcon className="w-5 h-5" /> : '2'}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            {currentStep === 'phone' && (
              <>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Verify Your Phone</h2>
                <p className="text-slate-600 mb-6">
                  We&apos;ll send you a verification code to confirm your phone number.
                </p>

                {!codeSent ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                      />
                    </div>
                    {phoneError && (
                      <p className="text-red-500 text-sm">{phoneError}</p>
                    )}
                    <button
                      onClick={handleSendCode}
                      disabled={phoneLoading || !phoneNumber}
                      className="w-full bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {phoneLoading ? 'Sending...' : 'Send Verification Code'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Verification Code
                      </label>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        maxLength={6}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-center text-2xl tracking-widest"
                      />
                      <p className="text-sm text-slate-500 mt-2">
                        Code sent to {phoneNumber}.{' '}
                        <button
                          onClick={() => setCodeSent(false)}
                          className="text-teal-500 hover:underline"
                        >
                          Change number
                        </button>
                      </p>
                      {/* MVP hint */}
                      <p className="text-xs text-slate-400 mt-1">
                        (For testing, enter any 6-digit code)
                      </p>
                    </div>
                    {phoneError && (
                      <p className="text-red-500 text-sm">{phoneError}</p>
                    )}
                    <button
                      onClick={handleVerifyCode}
                      disabled={phoneLoading || verificationCode.length !== 6}
                      className="w-full bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {phoneLoading ? 'Verifying...' : 'Verify Code'}
                    </button>
                  </div>
                )}
              </>
            )}

            {currentStep === 'stripe' && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-sm text-teal-600 font-medium">Phone Verified</span>
                </div>

                <h2 className="text-xl font-semibold text-slate-900 mb-2">Connect Your Bank</h2>
                <p className="text-slate-600 mb-6">
                  Set up Stripe to receive payments when you sell items. This takes about 2 minutes.
                </p>

                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <h3 className="font-medium text-slate-900 mb-2">What you&apos;ll need:</h3>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>&#x2022; Bank account or debit card for payouts</li>
                    <li>&#x2022; Last 4 digits of your SSN</li>
                    <li>&#x2022; Home address</li>
                  </ul>
                </div>

                {stripeError && (
                  <p className="text-red-500 text-sm mb-4">{stripeError}</p>
                )}

                <button
                  onClick={handleStartStripeConnect}
                  disabled={stripeLoading}
                  className="w-full bg-[#635BFF] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#5851db] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {stripeLoading ? (
                    'Loading...'
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                      </svg>
                      Continue with Stripe
                    </>
                  )}
                </button>

                <p className="text-xs text-slate-500 text-center mt-4">
                  Secured by Stripe. Your banking info is never shared with RealWorth.
                </p>
              </>
            )}
          </div>

          {/* Fee Info */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-medium text-amber-900 mb-1">Selling Fees</h3>
            <p className="text-sm text-amber-800">
              RealWorth charges a <strong>2.5% fee</strong> on each sale. You keep 97.5% of the sale price!
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Loading fallback component
function SellPageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-200" />
          <div className="h-4 w-32 rounded bg-slate-200" />
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Main export wrapped in Suspense
export default function SellPage() {
  return (
    <Suspense fallback={<SellPageLoading />}>
      <SellPageContent />
    </Suspense>
  );
}
