'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SearchIcon, MapIcon } from '@/components/icons';
import type { Listing } from '@/services/listingService';

const CATEGORIES = [
  'All',
  'Books',
  'Art',
  'Collectibles',
  'Antiques',
  'Toys',
  'Coins',
  'Jewelry',
  'Fashion',
  'Electronics',
  'Other',
];

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState<[number | null, number | null]>([null, null]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') {
        params.set('category', selectedCategory);
      }
      if (priceRange[0]) {
        params.set('minPrice', (priceRange[0] * 100).toString());
      }
      if (priceRange[1]) {
        params.set('maxPrice', (priceRange[1] * 100).toString());
      }

      const response = await fetch(`/api/listings?${params.toString()}`);
      const data = await response.json();
      setListings(data.listings || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, priceRange]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Filter listings by search query (client-side)
  const filteredListings = listings.filter((listing) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      listing.appraisal?.itemName?.toLowerCase().includes(query) ||
      listing.appraisal?.category?.toLowerCase().includes(query) ||
      listing.pickupCity?.toLowerCase().includes(query)
    );
  });

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <Header />
      <main className="flex-1 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Marketplace</h1>
            <p className="text-slate-600">Find treasures from verified sellers near you</p>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            {/* Search */}
            <div className="relative mb-4">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items, categories, or locations..."
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Price Range */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">Price:</span>
              <input
                type="number"
                placeholder="Min"
                value={priceRange[0] || ''}
                onChange={(e) => setPriceRange([e.target.value ? parseInt(e.target.value) : null, priceRange[1]])}
                className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={priceRange[1] || ''}
                onChange={(e) => setPriceRange([priceRange[0], e.target.value ? parseInt(e.target.value) : null])}
                className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              <button
                onClick={fetchListings}
                className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4 text-sm text-slate-600">
            {loading ? 'Loading...' : `${filteredListings.length} items found`}
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow animate-pulse">
                  <div className="aspect-square bg-slate-200 rounded-t-xl" />
                  <div className="p-3">
                    <div className="h-4 bg-slate-200 rounded mb-2" />
                    <div className="h-6 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <SearchIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No listings found</h3>
              <p className="text-slate-600 mb-4">
                Try adjusting your filters or check back later for new items.
              </p>
              <Link
                href="/sell"
                className="inline-block bg-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-600 transition-colors"
              >
                List Your Items
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredListings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/marketplace/${listing.id}`}
                  className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow overflow-hidden group"
                >
                  {/* Image */}
                  <div className="aspect-square relative bg-slate-100">
                    {listing.appraisal?.aiImageUrl || listing.appraisal?.imageUrl ? (
                      <Image
                        src={listing.appraisal.aiImageUrl || listing.appraisal.imageUrl}
                        alt={listing.appraisal?.itemName || 'Listing'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        No image
                      </div>
                    )}
                    {/* Category Badge */}
                    {listing.appraisal?.category && (
                      <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                        {listing.appraisal.category}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-medium text-slate-900 truncate text-sm mb-1">
                      {listing.appraisal?.itemName || 'Untitled Item'}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-teal-600">
                        {formatPrice(listing.askingPrice)}
                      </span>
                      {listing.acceptsOffers && (
                        <span className="text-xs text-slate-500">or offer</span>
                      )}
                    </div>
                    {/* Location */}
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                      <MapIcon className="w-3 h-3" />
                      <span>{listing.pickupCity}, {listing.pickupState}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
