
'use client';

import React, { useState, useMemo } from 'react';
import { AppraisalResult } from '@/lib/types';

interface HistoryListProps {
  history: AppraisalResult[];
  onSelect: (item: AppraisalResult) => void;
}

const HistoryItem: React.FC<{ item: AppraisalResult; onSelect: () => void }> = ({ item, onSelect }) => {
  const imageUrl = item.image;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: item.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <button onClick={onSelect} className="w-full text-left p-4 rounded-xl bg-white shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 flex items-center gap-4 border border-slate-200">
      <div className="w-16 h-16 rounded-lg bg-slate-200 flex-shrink-0 relative overflow-hidden">
        <img src={imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 right-0 px-1.5 py-0.5 bg-black/40 text-white text-xs font-semibold backdrop-blur-sm rounded-tl-md">
            {item.category}
        </div>
      </div>
      <div className="flex-grow overflow-hidden">
        <h4 className="font-bold text-slate-800 truncate">{item.itemName}</h4>
        <p className="text-sm text-slate-500">{item.era}</p>
        <p className="text-md font-semibold text-teal-600 mt-1">
          {formatCurrency(item.priceRange.low)} - {formatCurrency(item.priceRange.high)}
        </p>
      </div>
    </button>
  );
};

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect }) => {
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
        <h3 className="text-2xl font-bold text-slate-800">Your Treasure Chest</h3>
        <span className="text-sm text-slate-500">
          {filteredHistory.length} {filteredHistory.length === 1 ? 'item' : 'items'}
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

      {/* Appraisal Grid */}
      {filteredHistory.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredHistory.map((item) => (
            <HistoryItem key={item.id} item={item} onSelect={() => onSelect(item)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          No items in this category yet.
        </div>
      )}
    </div>
  );
};
