
'use client';

import React, { useState, useMemo } from 'react';
import { AppraisalResult } from '@/lib/types';
import { dbService } from '@/services/dbService';

interface HistoryListProps {
  history: AppraisalResult[];
  onSelect: (item: AppraisalResult) => void;
  userId?: string;
  onUpdate?: (updatedItem: AppraisalResult) => void;
}

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

interface HistoryItemProps {
  item: AppraisalResult;
  onSelect: () => void;
  userId?: string;
  onUpdate?: (updatedItem: AppraisalResult) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ item, onSelect, userId, onUpdate }) => {
  const [copied, setCopied] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const imageUrl = item.image;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: item.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const avgValue = (item.priceRange.low + item.priceRange.high) / 2;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!item.isPublic && userId) {
      // Make it public first
      setIsToggling(true);
      const success = await dbService.togglePublic(userId, item.id, true);
      if (success && onUpdate) {
        onUpdate({ ...item, isPublic: true });
      }
      setIsToggling(false);
    }

    const url = `${window.location.origin}/treasure/${item.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTogglePublic = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;

    setIsToggling(true);
    const newStatus = !item.isPublic;
    const success = await dbService.togglePublic(userId, item.id, newStatus);
    if (success && onUpdate) {
      onUpdate({ ...item, isPublic: newStatus });
    }
    setIsToggling(false);
  };

  return (
    <div className="relative group">
      <button
        onClick={onSelect}
        className="w-full text-left p-4 rounded-xl bg-white shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 border border-slate-200"
      >
        <div className="flex items-start gap-4">
          {/* Image */}
          <div className="w-20 h-20 rounded-lg bg-slate-200 flex-shrink-0 relative overflow-hidden">
            <img src={imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
          </div>

          {/* Content */}
          <div className="flex-grow overflow-hidden min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-bold text-slate-800 truncate">{item.itemName}</h4>
              <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 bg-teal-100 text-teal-800 text-xs font-semibold rounded-full">
                {item.category}
              </span>
            </div>

            {item.era && (
              <p className="text-sm text-slate-500 mt-0.5">{item.era}</p>
            )}

            {/* Value Badge */}
            <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-full">
              <span className="text-xs">💎</span>
              <span className="text-sm font-bold">{formatCurrency(avgValue)}</span>
            </div>

            {/* Price Range */}
            <p className="text-xs text-slate-500 mt-1">
              Range: {formatCurrency(item.priceRange.low)} - {formatCurrency(item.priceRange.high)}
            </p>
          </div>
        </div>
      </button>

      {/* Action Buttons */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Public/Private Toggle */}
        <button
          onClick={handleTogglePublic}
          disabled={isToggling}
          className={`p-1.5 rounded-full text-xs font-medium transition-all ${
            item.isPublic
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
          title={item.isPublic ? 'Public - Click to make private' : 'Private - Click to make public'}
        >
          {item.isPublic ? <GlobeIcon /> : <LockIcon />}
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className={`p-1.5 rounded-full transition-all ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
          }`}
          title={copied ? 'Link copied!' : 'Copy share link'}
        >
          {copied ? <CheckIcon /> : <ShareIcon />}
        </button>
      </div>
    </div>
  );
};

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, userId, onUpdate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Get unique categories with counts
  const categories = useMemo(() => {
    const categoryMap = history.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'All', count: history.length },
      ...Object.entries(categoryMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    ];
  }, [history]);

  // Filter history by selected category
  const filteredHistory = useMemo(() => {
    if (selectedCategory === 'All') return history;
    return history.filter(item => item.category === selectedCategory);
  }, [history, selectedCategory]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <span>💎</span> My Treasures
        </h3>
        <span className="text-sm text-slate-500">
          {filteredHistory.length} {filteredHistory.length === 1 ? 'treasure' : 'treasures'}
        </span>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 px-2">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                selectedCategory === category.name
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      )}

      {/* Treasure Grid */}
      {filteredHistory.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredHistory.map((item) => (
            <HistoryItem
              key={item.id}
              item={item}
              onSelect={() => onSelect(item)}
              userId={userId}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          No treasures in this category yet.
        </div>
      )}
    </div>
  );
};
