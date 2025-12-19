'use client';

import React, { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import Image from 'next/image';
import { CloseIcon, CheckIcon, LockIcon } from '@/components/icons';
import type { Listing } from '@/services/listingService';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentModalProps {
  listing: Listing;
  onClose: () => void;
  onSuccess: (transactionId: string) => void;
  getAccessToken: () => Promise<string | null>;
}

interface PaymentFormProps {
  listing: Listing;
  clientSecret: string;
  transactionId: string;
  onSuccess: (transactionId: string) => void;
  onCancel: () => void;
  getAccessToken: () => Promise<string | null>;
}

function PaymentForm({
  listing,
  clientSecret,
  transactionId,
  onSuccess,
  onCancel,
  getAccessToken,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/transactions/${transactionId}`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'requires_capture') {
        // Payment authorized successfully - confirm with our API
        const token = await getAccessToken();
        await fetch(`/api/transactions/${transactionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'confirm_payment',
            paymentIntentId: paymentIntent.id,
          }),
        });

        onSuccess(transactionId);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('An unexpected error occurred');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="bg-slate-50 rounded-xl p-4">
        <div className="flex items-center gap-3">
          {(listing.appraisal?.aiImageUrl || listing.appraisal?.imageUrl) && (
            <div className="w-16 h-16 relative rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={listing.appraisal.aiImageUrl || listing.appraisal.imageUrl}
                alt={listing.appraisal?.itemName || 'Item'}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-slate-900 truncate">
              {listing.appraisal?.itemName || 'Item'}
            </h3>
            <p className="text-sm text-slate-500">
              {listing.pickupCity}, {listing.pickupState}
            </p>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-teal-600">
              {formatPrice(listing.askingPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Element */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Payment Details
        </label>
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Info */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <LockIcon className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-teal-800">
            <p className="font-medium mb-1">Secure Authorization</p>
            <p>
              Your payment is authorized but won't be charged until you confirm
              pickup. If the transaction is cancelled, your card won't be charged.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || processing}
          className="flex-1 bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Processing...
            </>
          ) : (
            <>Authorize {formatPrice(listing.askingPrice)}</>
          )}
        </button>
      </div>
    </form>
  );
}

function SuccessView({
  listing,
  transactionId,
  onClose,
}: {
  listing: Listing;
  transactionId: string;
  onClose: () => void;
}) {
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckIcon className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Authorized!</h3>
      <p className="text-slate-600 mb-6">
        Your payment has been authorized. The seller will provide pickup details soon.
      </p>

      <div className="bg-slate-50 rounded-xl p-4 text-left mb-6">
        <h4 className="font-medium text-slate-900 mb-3">What happens next?</h4>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
            <span>Seller will send you pickup address and time</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
            <span>Pick up the item at the scheduled time</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
            <span>Confirm pickup to release payment to seller</span>
          </li>
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
        >
          Close
        </button>
        <a
          href={`/transactions/${transactionId}`}
          className="flex-1 bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors text-center"
        >
          View Transaction
        </a>
      </div>
    </div>
  );
}

export function PaymentModal({
  listing,
  onClose,
  onSuccess,
  getAccessToken,
}: PaymentModalProps) {
  const [step, setStep] = useState<'loading' | 'payment' | 'success' | 'error'>('loading');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initTransaction = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setError('You must be logged in to make a purchase');
          setStep('error');
          return;
        }

        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            listingId: listing.id,
            amount: listing.askingPrice,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to initiate purchase');
          setStep('error');
          return;
        }

        setClientSecret(data.clientSecret);
        setTransactionId(data.transaction.id);
        setStep('payment');
      } catch (err) {
        console.error('Error initiating transaction:', err);
        setError('Failed to initiate purchase');
        setStep('error');
      }
    };

    initTransaction();
  }, [listing.id, listing.askingPrice, getAccessToken]);

  const handleSuccess = (txId: string) => {
    setStep('success');
    onSuccess(txId);
  };

  const handleCancel = async () => {
    if (transactionId) {
      try {
        const token = await getAccessToken();
        await fetch(`/api/transactions/${transactionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'cancel',
            reason: 'Buyer cancelled before payment',
          }),
        });
      } catch (err) {
        console.error('Error cancelling transaction:', err);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {step === 'success' ? 'Success!' : 'Complete Purchase'}
          </h2>
          {step !== 'success' && (
            <button
              onClick={handleCancel}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <CloseIcon className="w-5 h-5 text-slate-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {step === 'loading' && (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="animate-spin h-10 w-10 border-4 border-teal-500 border-t-transparent rounded-full mb-4" />
              <p className="text-slate-600">Setting up your purchase...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CloseIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Unable to Purchase</h3>
              <p className="text-slate-600 mb-6">{error}</p>
              <button
                onClick={onClose}
                className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {step === 'payment' && clientSecret && transactionId && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#14B8A6',
                    borderRadius: '12px',
                  },
                },
              }}
            >
              <PaymentForm
                listing={listing}
                clientSecret={clientSecret}
                transactionId={transactionId}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
                getAccessToken={getAccessToken}
              />
            </Elements>
          )}

          {step === 'success' && transactionId && (
            <SuccessView
              listing={listing}
              transactionId={transactionId}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
