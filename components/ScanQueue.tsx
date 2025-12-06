'use client';

import React, { useState } from 'react';
import { QueuedItem } from '@/hooks/useScanQueue';
import { CollectionSummary } from '@/lib/types';
import { QuickAddToCollection } from './QuickAddToCollection';

interface ScanQueueProps {
  queue: QueuedItem[];
  stats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  onClearCompleted: () => void;
  onRemoveItem: (id: string) => void;
  userId?: string;
  collections?: CollectionSummary[];
  onCollectionCreated?: (collection: CollectionSummary) => void;
}

export const ScanQueue: React.FC<ScanQueueProps> = ({
  queue,
  stats,
  onClearCompleted,
  onRemoveItem,
  userId,
  collections = [],
  onCollectionCreated,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  // Don't show if queue is empty
  if (stats.total === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-40">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors touch-manipulation"
          style={{ touchAction: 'manipulation' }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              {stats.processing > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-900 text-sm">
                Scan Queue
              </div>
              <div className="text-xs text-slate-500">
                {stats.completed} completed • {stats.processing} processing • {stats.pending} pending
              </div>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t border-slate-200 max-h-96 overflow-y-auto">
            {/* Stats summary */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-slate-900">{stats.total}</div>
                  <div className="text-xs text-slate-500">Total</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-yellow-600">{stats.pending}</div>
                  <div className="text-xs text-slate-500">Pending</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">{stats.processing}</div>
                  <div className="text-xs text-slate-500">Active</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{stats.completed}</div>
                  <div className="text-xs text-slate-500">Done</div>
                </div>
              </div>
            </div>

            {/* Queue items */}
            <div className="divide-y divide-slate-100">
              {queue.slice().reverse().map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {item.status === 'pending' && (
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    )}
                    {item.status === 'processing' && (
                      <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                    )}
                    {item.status === 'completed' && (
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    )}
                    {item.status === 'failed' && (
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                    )}
                  </div>

                  {/* Item preview */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={item.imageData}
                      alt="Scan preview"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {item.status === 'pending' && 'Waiting...'}
                      {item.status === 'processing' && 'Processing...'}
                      {item.status === 'completed' && (item.result?.itemName || 'Completed')}
                      {item.status === 'failed' && 'Failed'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.status === 'completed' && item.result?.priceRange ? (
                        <span className="text-green-600 font-medium">
                          ${item.result.priceRange.low} - ${item.result.priceRange.high}
                        </span>
                      ) : (
                        new Date(item.timestamp).toLocaleTimeString()
                      )}
                    </div>
                    {item.error && (
                      <div className="text-xs text-red-600 mt-1 truncate">{item.error}</div>
                    )}
                  </div>

                  {/* Quick Add to Collection - for completed items */}
                  {item.status === 'completed' && userId && item.result?.id && !addedItems.has(item.id) && (
                    <QuickAddToCollection
                      appraisalId={item.result.id}
                      userId={userId}
                      collections={collections}
                      compact
                      onSuccess={(collectionId, collectionName) => {
                        setAddedItems(prev => new Set(prev).add(item.id));
                        console.log(`Added to ${collectionName}`);
                      }}
                      onCollectionCreated={onCollectionCreated}
                    />
                  )}

                  {/* Show "Added" badge if already added */}
                  {item.status === 'completed' && addedItems.has(item.id) && (
                    <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded">
                      Added
                    </span>
                  )}

                  {/* Remove button */}
                  {(item.status === 'completed' || item.status === 'failed') && (
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="flex-shrink-0 p-1 text-slate-400 hover:text-red-500 transition-colors touch-manipulation"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            {stats.completed > 0 && (
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={onClearCompleted}
                  className="w-full text-sm text-slate-600 hover:text-slate-900 font-medium py-2 px-3 rounded-lg hover:bg-white transition-colors touch-manipulation"
                  style={{ touchAction: 'manipulation' }}
                >
                  Clear Completed ({stats.completed})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

