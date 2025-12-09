'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GemIcon } from '@/components/icons';

interface Treasure {
  id: string;
  item_name: string;
  image_url: string;
  price_low: number;
  price_high: number;
  currency: string;
  category: string;
  era: string | null;
  created_at: string;
  users: {
    name: string;
    picture: string;
  } | null;
}

interface DiscoverFeedProps {
  treasures: Treasure[];
}

type ViewMode = 'cards' | 'grid';

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

// Grid icon (for gallery view)
const GridIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

// List/Cards icon
const CardsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

export function DiscoverFeed({ treasures }: DiscoverFeedProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  if (treasures.length === 0) {
    return (
      <div className="text-center py-16 sm:py-12 bg-white rounded-2xl border border-slate-200">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">No Public Treasures Yet</h2>
        <p className="text-slate-500 text-sm mb-6">Be the first to share your discoveries!</p>
        <Link
          href="/"
          className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Start Appraising
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          {treasures.length} treasure{treasures.length !== 1 ? 's' : ''} found
        </p>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded-md transition-all ${
              viewMode === 'cards'
                ? 'bg-white text-teal-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            aria-label="Card view"
          >
            <CardsIcon />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-all ${
              viewMode === 'grid'
                ? 'bg-white text-teal-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            aria-label="Grid view"
          >
            <GridIcon />
          </button>
        </div>
      </div>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {treasures.map((treasure) => {
            const avgValue = (treasure.price_low + treasure.price_high) / 2;

            return (
              <Link
                key={treasure.id}
                href={`/treasure/${treasure.id}`}
                className="bg-white rounded-2xl border border-slate-200 hover:shadow-lg transition-all duration-300 overflow-hidden group active:scale-[0.98]"
              >
                {/* Image */}
                <div className="relative aspect-square bg-slate-100 overflow-hidden">
                  {treasure.image_url && (
                    <img
                      src={treasure.image_url}
                      alt={treasure.item_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {/* Value Badge */}
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
                    <span className="text-sm font-bold flex items-center gap-1">
                      <GemIcon className="w-3.5 h-3.5" />
                      {formatCurrency(avgValue, treasure.currency)}
                    </span>
                  </div>

                  {/* Category */}
                  <div className="absolute bottom-3 left-3">
                    <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-semibold px-2 py-1 rounded-full">
                      {treasure.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-slate-900 truncate group-hover:text-teal-600 transition-colors">
                    {treasure.item_name}
                  </h3>

                  {treasure.era && (
                    <p className="text-sm text-slate-500 mt-0.5">{treasure.era}</p>
                  )}

                  {/* Owner & Time */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      {treasure.users?.picture ? (
                        <img
                          src={treasure.users.picture}
                          alt={treasure.users.name}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-200" />
                      )}
                      <span className="text-xs text-slate-600 truncate max-w-[100px]">
                        {treasure.users?.name || 'Anonymous'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {timeAgo(treasure.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Instagram Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
          {treasures.map((treasure) => {
            const avgValue = (treasure.price_low + treasure.price_high) / 2;

            return (
              <Link
                key={treasure.id}
                href={`/treasure/${treasure.id}`}
                className="relative aspect-square bg-slate-100 overflow-hidden group"
              >
                {/* Image */}
                {treasure.image_url && (
                  <img
                    src={treasure.image_url}
                    alt={treasure.item_name}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 group-active:scale-100"
                    loading="lazy"
                  />
                )}

                {/* Hover/Tap overlay with value and name */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 group-active:bg-black/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="text-white text-center transform scale-90 group-hover:scale-100 transition-transform px-2">
                    <p className="font-bold text-sm sm:text-base drop-shadow-lg">
                      {formatCurrency(avgValue, treasure.currency)}
                    </p>
                    <p className="text-xs sm:text-sm mt-1 truncate max-w-full drop-shadow-lg">
                      {treasure.item_name}
                    </p>
                  </div>
                </div>

                {/* Owner avatar - bottom left */}
                {treasure.users?.picture && (
                  <div className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full border-2 border-white overflow-hidden shadow-sm">
                    <img
                      src={treasure.users.picture}
                      alt={treasure.users.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 text-center">
        <p className="text-slate-500 mb-4 text-sm">Think you have hidden treasures?</p>
        <Link
          href="/"
          className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Start Finding Treasures
        </Link>
      </div>
    </div>
  );
}

export default DiscoverFeed;
