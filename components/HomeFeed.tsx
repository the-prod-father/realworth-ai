'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppraisalResult } from '@/lib/types';
import { GemIcon, CompassIcon } from '@/components/icons';
import { supabase } from '@/lib/supabase';

interface HomeFeedProps {
  userHistory: AppraisalResult[];
  isLoggedIn: boolean;
  onSelectItem?: (item: AppraisalResult) => void;
}

type FeedTab = 'discover' | 'my-treasures';
type ViewMode = 'cards' | 'grid';

interface PublicTreasure {
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

// Icons
const GridIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const CardsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

export function HomeFeed({ userHistory, isLoggedIn, onSelectItem }: HomeFeedProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>('discover');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [publicTreasures, setPublicTreasures] = useState<PublicTreasure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch public treasures
  useEffect(() => {
    async function fetchPublicTreasures() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          id, item_name, image_url, price_low, price_high, currency, category, era, created_at,
          users:user_id (name, picture)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        setPublicTreasures(data as unknown as PublicTreasure[]);
      }
      setIsLoading(false);
    }

    fetchPublicTreasures();
  }, []);

  // Calculate totals for My Treasures
  const totalValue = userHistory.reduce((acc, item) => acc + (item.priceRange.high + item.priceRange.low) / 2, 0);

  const currentItems = activeTab === 'discover' ? publicTreasures : userHistory;
  const isEmpty = currentItems.length === 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Tab Header */}
      <div className="border-b border-slate-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-3.5 text-center text-sm font-semibold transition-colors relative ${
              activeTab === 'discover'
                ? 'text-teal-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CompassIcon className="w-5 h-5" />
              <span>Discover</span>
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                {publicTreasures.length}
              </span>
            </div>
            {activeTab === 'discover' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('my-treasures')}
            className={`flex-1 py-3.5 text-center text-sm font-semibold transition-colors relative ${
              activeTab === 'my-treasures'
                ? 'text-teal-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <UserIcon />
              <span>My Treasures</span>
              {userHistory.length > 0 && (
                <span className="text-xs bg-teal-100 text-teal-600 px-1.5 py-0.5 rounded-full">
                  {userHistory.length}
                </span>
              )}
            </div>
            {activeTab === 'my-treasures' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
            )}
          </button>
        </div>
      </div>

      {/* Stats Bar & View Toggle */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <div className="text-sm text-slate-600">
          {activeTab === 'discover' ? (
            <span>See what others are finding</span>
          ) : isLoggedIn ? (
            userHistory.length > 0 ? (
              <span>
                <strong className="text-teal-600">{formatCurrency(totalValue)}</strong> total value
              </span>
            ) : (
              <span>Start your collection</span>
            )
          ) : (
            <span>Sign in to see your treasures</span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 border border-slate-200">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-all ${
              viewMode === 'grid'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            aria-label="Grid view"
          >
            <GridIcon />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-1.5 rounded transition-all ${
              viewMode === 'cards'
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            aria-label="Card view"
          >
            <CardsIcon />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-2 sm:p-3">
        {isLoading && activeTab === 'discover' ? (
          <div className="py-12 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Loading treasures...</p>
          </div>
        ) : isEmpty ? (
          <div className="py-12 text-center">
            {activeTab === 'discover' ? (
              <>
                <CompassIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No public treasures yet</p>
                <p className="text-slate-400 text-xs mt-1">Be the first to share!</p>
              </>
            ) : !isLoggedIn ? (
              <>
                <GemIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Sign in to start your collection</p>
              </>
            ) : (
              <>
                <GemIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No treasures yet</p>
                <p className="text-slate-400 text-xs mt-1">Tap the + button to capture your first!</p>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {activeTab === 'discover'
              ? publicTreasures.map((treasure) => {
                  const avgValue = (treasure.price_low + treasure.price_high) / 2;
                  return (
                    <Link
                      key={treasure.id}
                      href={`/treasure/${treasure.id}`}
                      className="relative aspect-square bg-slate-100 overflow-hidden group"
                    >
                      <img
                        src={treasure.image_url}
                        alt={treasure.item_name}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="text-white text-center px-1">
                          <p className="font-bold text-sm drop-shadow-lg">
                            {formatCurrency(avgValue, treasure.currency)}
                          </p>
                        </div>
                      </div>
                      {treasure.users?.picture && (
                        <div className="absolute bottom-1 left-1 w-5 h-5 rounded-full border-2 border-white overflow-hidden shadow-sm">
                          <img src={treasure.users.picture} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </Link>
                  );
                })
              : userHistory.map((item) => {
                  const avgValue = (item.priceRange.low + item.priceRange.high) / 2;
                  return (
                    <Link
                      key={item.id}
                      href={`/treasure/${item.id}`}
                      className="relative aspect-square bg-slate-100 overflow-hidden group"
                    >
                      <img
                        src={item.image}
                        alt={item.itemName}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="text-white text-center px-1">
                          <p className="font-bold text-sm drop-shadow-lg">
                            {formatCurrency(avgValue, item.currency)}
                          </p>
                        </div>
                      </div>
                      {item.isPublic && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </Link>
                  );
                })}
          </div>
        ) : (
          /* Cards View */
          <div className="space-y-2">
            {activeTab === 'discover'
              ? publicTreasures.slice(0, 10).map((treasure) => {
                  const avgValue = (treasure.price_low + treasure.price_high) / 2;
                  return (
                    <Link
                      key={treasure.id}
                      href={`/treasure/${treasure.id}`}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors active:bg-slate-100"
                    >
                      <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        <img src={treasure.image_url} alt={treasure.item_name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-semibold text-slate-800 text-sm truncate">{treasure.item_name}</h4>
                        <p className="text-xs text-slate-500">{treasure.category} {treasure.era ? `· ${treasure.era}` : ''}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold text-teal-600">{formatCurrency(avgValue, treasure.currency)}</span>
                          <span className="text-xs text-slate-400">{timeAgo(treasure.created_at)}</span>
                        </div>
                      </div>
                      {treasure.users?.picture && (
                        <img src={treasure.users.picture} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                      )}
                    </Link>
                  );
                })
              : userHistory.slice(0, 10).map((item) => {
                  const avgValue = (item.priceRange.low + item.priceRange.high) / 2;
                  return (
                    <Link
                      key={item.id}
                      href={`/treasure/${item.id}`}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors active:bg-slate-100"
                    >
                      <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.itemName} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-semibold text-slate-800 text-sm truncate">{item.itemName}</h4>
                        <p className="text-xs text-slate-500">{item.category} {item.era ? `· ${item.era}` : ''}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold text-teal-600">{formatCurrency(avgValue, item.currency)}</span>
                          {item.isPublic && (
                            <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">Public</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}

            {/* See More Link */}
            {currentItems.length > 10 && (
              <Link
                href={activeTab === 'discover' ? '/discover' : '/profile'}
                className="block text-center py-3 text-teal-600 font-medium text-sm hover:bg-slate-50 rounded-lg transition-colors"
              >
                See all {currentItems.length} treasures →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* See More for Grid View */}
      {viewMode === 'grid' && currentItems.length > 0 && (
        <div className="border-t border-slate-100 p-3">
          <Link
            href={activeTab === 'discover' ? '/discover' : '/profile'}
            className="block text-center text-teal-600 font-medium text-sm hover:text-teal-700 transition-colors"
          >
            {activeTab === 'discover' ? 'Explore more treasures' : 'View all my treasures'} →
          </Link>
        </div>
      )}
    </div>
  );
}

export default HomeFeed;
