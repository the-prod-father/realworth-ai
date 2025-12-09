'use client';

import React, { useState } from 'react';
import { SpinnerIcon, CheckIcon, XIcon } from './icons';

interface QueueItem {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  result: {
    itemName: string;
    priceRange: { low: number; high: number };
    currency: string;
  } | null;
  appraisal_id: string | null;
  error_message: string | null;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

interface QueueStatusProps {
  items: QueueItem[];
  stats: QueueStats;
  onViewResult?: (appraisalId: string) => void;
}

export function QueueStatus({ items, stats, onViewResult }: QueueStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show if queue is empty
  if (stats.total === 0) {
    return null;
  }

  const activeCount = stats.pending + stats.processing;
  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="fixed bottom-24 sm:bottom-20 right-4 z-40 pb-safe">
      {/* Collapsed view - floating badge */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-white rounded-full shadow-lg border border-slate-200 p-3 flex items-center gap-2 hover:shadow-xl active:scale-95 transition-all"
        >
          {activeCount > 0 ? (
            <>
              <SpinnerIcon className="w-5 h-5 text-teal-500 animate-spin" />
              <span className="text-sm font-medium text-slate-700">
                {activeCount} processing
              </span>
            </>
          ) : (
            <>
              <CheckIcon className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-slate-700">
                {stats.completed} complete
              </span>
            </>
          )}
        </button>
      )}

      {/* Expanded view - queue list */}
      {isExpanded && (
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-[calc(100vw-2rem)] sm:w-80 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 text-sm">Processing Queue</h3>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {stats.total}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Stats bar */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex gap-4 text-xs">
            {stats.pending > 0 && (
              <span className="text-slate-500">
                <span className="font-medium text-slate-700">{stats.pending}</span> queued
              </span>
            )}
            {stats.processing > 0 && (
              <span className="text-teal-600">
                <span className="font-medium">{stats.processing}</span> processing
              </span>
            )}
            {stats.completed > 0 && (
              <span className="text-green-600">
                <span className="font-medium">{stats.completed}</span> done
              </span>
            )}
            {stats.failed > 0 && (
              <span className="text-red-600">
                <span className="font-medium">{stats.failed}</span> failed
              </span>
            )}
          </div>

          {/* Queue items */}
          <div className="overflow-y-auto max-h-64">
            {items.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="px-3 py-2 border-b border-slate-50 last:border-b-0 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  {/* Status indicator */}
                  {item.status === 'pending' && (
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  )}
                  {item.status === 'processing' && (
                    <SpinnerIcon className="w-4 h-4 text-teal-500 animate-spin" />
                  )}
                  {item.status === 'completed' && (
                    <CheckIcon className="w-4 h-4 text-green-500" />
                  )}
                  {item.status === 'failed' && (
                    <XIcon className="w-4 h-4 text-red-500" />
                  )}

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    {item.status === 'completed' && item.result ? (
                      <div>
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {item.result.itemName}
                        </p>
                        <p className="text-xs text-green-600">
                          {formatCurrency(
                            (item.result.priceRange.low + item.result.priceRange.high) / 2,
                            item.result.currency
                          )}
                        </p>
                      </div>
                    ) : item.status === 'failed' ? (
                      <p className="text-sm text-red-600 truncate">
                        {item.error_message || 'Processing failed'}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">
                        {item.status === 'processing' ? 'Analyzing...' : 'Queued'}
                      </p>
                    )}
                  </div>

                  {/* View button for completed items */}
                  {item.status === 'completed' && item.appraisal_id && onViewResult && (
                    <button
                      onClick={() => onViewResult(item.appraisal_id!)}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    >
                      View
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default QueueStatus;
