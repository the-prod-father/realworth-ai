'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AuthContext } from '@/components/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MapIcon, CheckIcon, CloseIcon } from '@/components/icons';
import type { Transaction, TransactionStatus } from '@/services/transactionService';

const STATUS_STEPS: { status: TransactionStatus; label: string; buyerLabel?: string; sellerLabel?: string }[] = [
  { status: 'pending', label: 'Payment Pending' },
  { status: 'payment_authorized', label: 'Payment Authorized', buyerLabel: 'Waiting for Pickup Details', sellerLabel: 'Provide Pickup Details' },
  { status: 'pickup_scheduled', label: 'Pickup Scheduled', buyerLabel: 'Ready for Pickup', sellerLabel: 'Awaiting Buyer Pickup' },
  { status: 'completed', label: 'Completed' },
];

const STATUS_COLORS: Record<TransactionStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  payment_authorized: 'bg-blue-100 text-blue-800',
  pickup_scheduled: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  paid_out: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  disputed: 'bg-red-100 text-red-800',
};

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useContext(AuthContext);

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const fetchTransaction = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`/api/transactions/${params.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setTransaction(null);
        return;
      }

      const data = await response.json();
      setTransaction(data.transaction);
    } catch (error) {
      console.error('Error fetching transaction:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id, getAccessToken, router]);

  useEffect(() => {
    if (params.id) {
      fetchTransaction();
    }
  }, [params.id, fetchTransaction]);

  const isBuyer = user?.id === transaction?.buyerId;
  const isSeller = user?.id === transaction?.sellerId;

  const handleSetPickup = async () => {
    if (!pickupAddress) return;

    setActionLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/transactions/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'set_pickup',
          pickupAddress,
          pickupScheduledAt: pickupDate || null,
        }),
      });

      if (response.ok) {
        setShowPickupModal(false);
        fetchTransaction();
      }
    } catch (error) {
      console.error('Error setting pickup:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPickup = async () => {
    setActionLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/transactions/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'confirm_complete',
        }),
      });

      if (response.ok) {
        setShowConfirmModal(false);
        fetchTransaction();
      }
    } catch (error) {
      console.error('Error confirming pickup:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/transactions/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'cancel',
          reason: cancelReason,
        }),
      });

      if (response.ok) {
        setShowCancelModal(false);
        fetchTransaction();
      }
    } catch (error) {
      console.error('Error cancelling:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getCurrentStepIndex = () => {
    if (!transaction) return 0;
    const index = STATUS_STEPS.findIndex(s => s.status === transaction.status);
    return index >= 0 ? index : 0;
  };

  if (loading) {
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

  if (!transaction) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Transaction Not Found</h1>
            <p className="text-slate-600 mb-4">This transaction doesn't exist or you don't have access.</p>
            <Link
              href="/marketplace"
              className="inline-block bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors"
            >
              Browse Marketplace
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentStep = getCurrentStepIndex();
  const isCompleted = transaction.status === 'completed' || transaction.status === 'paid_out';
  const isCancelled = transaction.status === 'cancelled' || transaction.status === 'disputed';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <Header />
      <main className="flex-1 p-4 pb-24">
        <div className="max-w-2xl mx-auto">
          {/* Back Link */}
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 mb-4"
          >
            <span>&larr;</span> Back to Marketplace
          </Link>

          {/* Status Badge */}
          <div className="mb-4">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[transaction.status]}`}>
              {transaction.status === 'cancelled' ? 'Cancelled' :
               transaction.status === 'disputed' ? 'Disputed' :
               isBuyer ? STATUS_STEPS[currentStep]?.buyerLabel || STATUS_STEPS[currentStep]?.label :
               STATUS_STEPS[currentStep]?.sellerLabel || STATUS_STEPS[currentStep]?.label}
            </span>
          </div>

          {/* Item Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            <div className="p-4 flex gap-4">
              {(transaction.listing?.appraisal?.aiImageUrl || transaction.listing?.appraisal?.imageUrl) && (
                <div className="w-20 h-20 relative rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={transaction.listing.appraisal.aiImageUrl || transaction.listing.appraisal.imageUrl}
                    alt={transaction.listing.appraisal?.itemName || 'Item'}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-slate-900 truncate">
                  {transaction.listing?.appraisal?.itemName || 'Item'}
                </h1>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <MapIcon className="w-4 h-4" />
                  <span>{transaction.listing?.pickupCity}, {transaction.listing?.pickupState}</span>
                </div>
                <div className="mt-2 text-xl font-bold text-teal-600">
                  {formatPrice(transaction.amount)}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Steps (not for cancelled/disputed) */}
          {!isCancelled && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="font-semibold text-slate-900 mb-4">Transaction Progress</h2>
              <div className="space-y-4">
                {STATUS_STEPS.map((step, index) => {
                  const isActive = index === currentStep;
                  const isDone = index < currentStep || isCompleted;
                  return (
                    <div key={step.status} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isDone ? 'bg-green-500 text-white' :
                        isActive ? 'bg-teal-500 text-white' :
                        'bg-slate-200 text-slate-400'
                      }`}>
                        {isDone ? <CheckIcon className="w-5 h-5" /> : index + 1}
                      </div>
                      <div className={`flex-1 ${isActive ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
                        {isBuyer && step.buyerLabel ? step.buyerLabel :
                         isSeller && step.sellerLabel ? step.sellerLabel :
                         step.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pickup Details */}
          {transaction.pickupAddress && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="font-semibold text-slate-900 mb-3">Pickup Details</h2>
              <p className="text-slate-700">{transaction.pickupAddress}</p>
              {transaction.pickupScheduledAt && (
                <p className="text-sm text-slate-500 mt-2">
                  Scheduled: {formatDate(transaction.pickupScheduledAt)}
                </p>
              )}
              {transaction.pickupNotes && (
                <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-lg">
                  {transaction.pickupNotes}
                </p>
              )}
            </div>
          )}

          {/* Parties */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="font-semibold text-slate-900 mb-4">
              {isBuyer ? 'Seller' : 'Buyer'}
            </h2>
            <div className="flex items-center gap-3">
              {(isBuyer ? transaction.seller : transaction.buyer)?.picture ? (
                <Image
                  src={(isBuyer ? transaction.seller : transaction.buyer)!.picture}
                  alt={(isBuyer ? transaction.seller : transaction.buyer)!.name}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                  <span className="text-teal-600 font-semibold">
                    {(isBuyer ? transaction.seller : transaction.buyer)?.name?.charAt(0) || '?'}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-slate-900">
                  {(isBuyer ? transaction.seller : transaction.buyer)?.name}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isCancelled && !isCompleted && (
            <div className="space-y-3">
              {/* Seller: Set Pickup (when payment authorized) */}
              {isSeller && transaction.status === 'payment_authorized' && (
                <button
                  onClick={() => setShowPickupModal(true)}
                  className="w-full bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors"
                >
                  Set Pickup Details
                </button>
              )}

              {/* Buyer: Confirm Pickup (when pickup scheduled) */}
              {isBuyer && transaction.status === 'pickup_scheduled' && (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors"
                >
                  Confirm Pickup Complete
                </button>
              )}

              {/* Both: Cancel */}
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancel Transaction
              </button>
            </div>
          )}

          {/* Completed Message */}
          {isCompleted && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-800">Transaction Complete!</p>
              <p className="text-sm text-green-600 mt-1">
                {isSeller ? 'Payment has been released to your account.' : 'Thank you for your purchase!'}
              </p>
            </div>
          )}

          {/* Cancelled Message */}
          {isCancelled && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <CloseIcon className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="font-medium text-red-800">Transaction Cancelled</p>
              <p className="text-sm text-red-600 mt-1">
                This transaction has been cancelled. No charges were made.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Set Pickup Modal */}
      {showPickupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Set Pickup Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pickup Address *
                </label>
                <textarea
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Enter the pickup address..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Preferred Date/Time (optional)
                </label>
                <input
                  type="datetime-local"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPickupModal(false)}
                disabled={actionLoading}
                className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSetPickup}
                disabled={!pickupAddress || actionLoading}
                className="flex-1 bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Pickup Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Confirm Pickup Complete</h2>
            <p className="text-slate-600 mb-4">
              By confirming, you acknowledge that you have received the item and are satisfied with your purchase.
              The payment will be released to the seller.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
              <p className="text-sm text-amber-800">
                This action cannot be undone. Only confirm if you have the item in hand.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={actionLoading}
                className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPickup}
                disabled={actionLoading}
                className="flex-1 bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Confirming...' : 'Confirm Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Cancel Transaction</h2>
            <p className="text-slate-600 mb-4">
              Are you sure you want to cancel this transaction?
              {isBuyer ? ' Your payment authorization will be released.' : ' The buyer\'s payment will be refunded.'}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why are you cancelling?"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none"
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading}
                className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Keep Transaction
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex-1 bg-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Cancel Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
