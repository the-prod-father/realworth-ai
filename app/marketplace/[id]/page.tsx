'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AuthContext } from '@/components/contexts/AuthContext';
import { PaymentModal } from '@/components/PaymentModal';
import { MapIcon, HeartIcon, ShareIcon, CheckIcon } from '@/components/icons';
import type { Listing } from '@/services/listingService';
import { supabase } from '@/lib/supabase';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useContext(AuthContext);

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const response = await fetch(`/api/listings/${params.id}`);
        const data = await response.json();
        if (data.listing) {
          setListing(data.listing);
        }
      } catch (error) {
        console.error('Error fetching listing:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchListing();
    }
  }, [params.id]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const handleSave = async () => {
    if (!user) {
      // Could redirect to login
      return;
    }

    setIsSaved(!isSaved);
    // TODO: Call API to save/unsave with supabase.auth.getSession()
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing?.appraisal?.itemName || 'Check out this listing',
          url: window.location.href,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const handleBuyNow = () => {
    if (!user) {
      router.push('/');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (txId: string) => {
    setTransactionId(txId);
    setPurchaseSuccess(true);
    setShowPaymentModal(false);
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

  if (!listing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Listing Not Found</h1>
            <p className="text-slate-600 mb-4">This listing may have been removed or sold.</p>
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

  const isOwnListing = user?.id === listing.sellerId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <Header />
      <main className="flex-1 p-4 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Back Link */}
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 mb-4"
          >
            <span>&larr;</span> Back to Marketplace
          </Link>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Image */}
            <div className="aspect-square md:aspect-video relative bg-slate-100">
              {listing.appraisal?.aiImageUrl || listing.appraisal?.imageUrl ? (
                <Image
                  src={listing.appraisal.aiImageUrl || listing.appraisal.imageUrl}
                  alt={listing.appraisal?.itemName || 'Listing'}
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  No image
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Category & Actions */}
              <div className="flex items-center justify-between mb-2">
                {listing.appraisal?.category && (
                  <span className="bg-slate-100 text-slate-600 text-sm px-3 py-1 rounded-full">
                    {listing.appraisal.category}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    className={`p-2 rounded-full ${
                      isSaved ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-600'
                    } hover:bg-slate-200 transition-colors`}
                  >
                    <HeartIcon className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <ShareIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {listing.appraisal?.itemName || 'Untitled Item'}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-3xl font-bold text-teal-600">
                  {formatPrice(listing.askingPrice)}
                </span>
                {listing.acceptsOffers && (
                  <span className="text-slate-500">or best offer</span>
                )}
              </div>

              {/* AI Suggested Price */}
              {listing.aiSuggestedPrice && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 text-sm">AI Appraised Value:</span>
                    <span className="font-semibold text-amber-900">
                      {formatPrice(listing.aiSuggestedPrice)}
                    </span>
                  </div>
                </div>
              )}

              {/* Era & Details */}
              {listing.appraisal?.era && (
                <p className="text-slate-600 mb-4">
                  <span className="font-medium">Era:</span> {listing.appraisal.era}
                </p>
              )}

              {/* Location */}
              <div className="flex items-center gap-2 text-slate-600 mb-6">
                <MapIcon className="w-5 h-5" />
                <span>Pickup in {listing.pickupCity}, {listing.pickupState}</span>
              </div>

              {/* Seller Info */}
              {listing.seller && (
                <div className="border-t border-slate-200 pt-4 mb-6">
                  <h3 className="text-sm font-medium text-slate-500 mb-3">Seller</h3>
                  <div className="flex items-center gap-3">
                    {listing.seller.picture ? (
                      <Image
                        src={listing.seller.picture}
                        alt={listing.seller.name}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                        <span className="text-teal-600 font-semibold">
                          {listing.seller.name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{listing.seller.name}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        {listing.seller.sellerRating && (
                          <span className="flex items-center gap-1">
                            <span className="text-amber-500">&#9733;</span>
                            {listing.seller.sellerRating.toFixed(1)}
                          </span>
                        )}
                        <span>&#x2022;</span>
                        <span>{listing.seller.sellerTotalSales} sales</span>
                      </div>
                    </div>
                    <div className="ml-auto">
                      <CheckIcon className="w-5 h-5 text-teal-500" />
                    </div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span>{listing.viewsCount} views</span>
                <span>&#x2022;</span>
                <span>{listing.savesCount} saves</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fixed Bottom CTA */}
      {!isOwnListing && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
          <div className="max-w-4xl mx-auto flex gap-3">
            {listing.acceptsOffers && (
              <button
                onClick={() => {
                  // TODO: Implement offer flow
                  alert('Offer functionality coming soon! Use Buy Now for the asking price.');
                }}
                className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                Make Offer
              </button>
            )}
            <button
              onClick={handleBuyNow}
              className="flex-1 bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors"
            >
              Buy Now
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && listing && (
        <PaymentModal
          listing={listing}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          getAccessToken={getAccessToken}
        />
      )}

      {/* Purchase Success Banner */}
      {purchaseSuccess && transactionId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Purchase Started!</h2>
            <p className="text-slate-600 mb-6">
              Your payment has been authorized. The seller will contact you with pickup details.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPurchaseSuccess(false)}
                className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                Stay Here
              </button>
              <Link
                href={`/transactions/${transactionId}`}
                className="flex-1 bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors text-center"
              >
                View Transaction
              </Link>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
