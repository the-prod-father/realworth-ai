
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppraisalResult } from '@/lib/types';
import { dbService } from '@/services/dbService';

const ITEMS_PER_PAGE = 12;

interface HistoryListProps {
  history: AppraisalResult[];
  onSelect: (item: AppraisalResult) => void;
  userId?: string;
  onUpdate?: (updatedItem: AppraisalResult) => void;
  archivedHistory?: AppraisalResult[];
  onArchiveChange?: () => void;
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

const ArchiveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

const UnarchiveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

interface HistoryItemProps {
  item: AppraisalResult;
  onSelect: () => void;
  userId?: string;
  onUpdate?: (updatedItem: AppraisalResult) => void;
  onArchive?: (itemId: string) => void;
  isArchived?: boolean;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ item, onSelect, userId, onUpdate, onArchive, isArchived }) => {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const imageUrl = item.image;

  const handleCardClick = () => {
    // Navigate to the treasure detail page
    router.push(`/treasure/${item.id}`);
  };

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

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || !onArchive) return;

    setIsArchiving(true);
    const success = isArchived
      ? await dbService.unarchiveAppraisal(userId, item.id)
      : await dbService.archiveAppraisal(userId, item.id);

    if (success) {
      onArchive(item.id);
    }
    setIsArchiving(false);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCardClick}
        className="w-full text-left p-4 rounded-xl bg-white shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 border border-slate-200 active:scale-[0.98] active:bg-slate-100"
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
            <div className="mt-2 inline-flex items-center px-2.5 py-1 bg-teal-500 text-white rounded-full">
              <span className="text-sm font-semibold">{formatCurrency(avgValue)}</span>
            </div>

            {/* Price Range */}
            <p className="text-xs text-slate-500 mt-1">
              Range: {formatCurrency(item.priceRange.low)} - {formatCurrency(item.priceRange.high)}
            </p>
          </div>
        </div>
      </button>

      {/* Action Buttons - always visible on mobile, hover-reveal on desktop */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 sm:pointer-events-none sm:group-hover:pointer-events-auto transition-opacity">
        {/* Public/Private Toggle */}
        <button
          onClick={handleTogglePublic}
          disabled={isToggling}
          className={`w-9 h-9 flex items-center justify-center rounded-full text-xs font-medium transition-all shadow-md border active:scale-95 ${
            item.isPublic
              ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
          }`}
          aria-label={item.isPublic ? 'Public - Tap to make private' : 'Private - Tap to make public'}
        >
          {item.isPublic ? <GlobeIcon /> : <LockIcon />}
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-all shadow-md border active:scale-95 ${
            copied
              ? 'bg-green-50 text-green-600 border-green-200'
              : 'bg-white text-teal-600 border-teal-200 hover:bg-teal-50'
          }`}
          aria-label={copied ? 'Link copied!' : 'Copy share link'}
        >
          {copied ? <CheckIcon /> : <ShareIcon />}
        </button>

        {/* Archive Button */}
        {onArchive && (
          <button
            onClick={handleArchive}
            disabled={isArchiving}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all shadow-md border active:scale-95 ${
              isArchived
                ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
            }`}
            aria-label={isArchived ? 'Unarchive' : 'Archive'}
          >
            {isArchived ? <UnarchiveIcon /> : <ArchiveIcon />}
          </button>
        )}
      </div>
    </div>
  );
};

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, userId, onUpdate, archivedHistory = [], onArchiveChange }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Determine which items to display
  const displayItems = showArchived ? archivedHistory : history;

  // Reset to page 1 when category, archive view, or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, showArchived, searchQuery]);

  // Get unique categories with counts
  const categories = useMemo(() => {
    const categoryMap = displayItems.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'All', count: displayItems.length },
      ...Object.entries(categoryMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    ];
  }, [displayItems]);

  // Filter history by selected category and search query
  const filteredHistory = useMemo(() => {
    let filtered = displayItems;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.itemName.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.author && item.author.toLowerCase().includes(query)) ||
        (item.era && item.era.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [displayItems, selectedCategory, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredHistory, currentPage]);

  const handleArchive = (itemId: string) => {
    if (onArchiveChange) {
      onArchiveChange();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-lg font-semibold text-slate-800">
          {showArchived ? 'Archived Treasures' : 'My Treasures'}
        </h3>
        <div className="flex items-center gap-3">
          {/* Archive Toggle */}
          {archivedHistory.length > 0 || showArchived ? (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`text-sm font-medium px-3 py-1 rounded-full transition-all ${
                showArchived
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {showArchived ? `Active (${history.length})` : `Archived (${archivedHistory.length})`}
            </button>
          ) : null}
          <span className="text-sm text-slate-500">
            {filteredHistory.length} {filteredHistory.length === 1 ? 'treasure' : 'treasures'}
          </span>
        </div>
      </div>

      {/* Search Input */}
      {displayItems.length > 3 && (
        <div className="px-2">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search treasures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 active:bg-slate-100 rounded-full"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

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
      {paginatedItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {paginatedItems.map((item) => (
            <HistoryItem
              key={item.id}
              item={item}
              onSelect={() => onSelect(item)}
              userId={userId}
              onUpdate={onUpdate}
              onArchive={handleArchive}
              isArchived={showArchived}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          {searchQuery ? (
            <div className="space-y-2">
              <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>No treasures found for &ldquo;{searchQuery}&rdquo;</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-teal-600 hover:text-teal-700 text-sm font-medium"
              >
                Clear search
              </button>
            </div>
          ) : showArchived ? (
            'No archived treasures.'
          ) : (
            'No treasures in this category yet.'
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 active:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Show first, last, current, and neighbors
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && (
                    <span className="px-1 text-slate-400">...</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`w-11 h-11 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                      currentPage === page
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 active:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Page Info */}
      {filteredHistory.length > ITEMS_PER_PAGE && (
        <p className="text-center text-sm text-slate-500 mt-2">
          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredHistory.length)} of {filteredHistory.length} treasures
        </p>
      )}
    </div>
  );
};
