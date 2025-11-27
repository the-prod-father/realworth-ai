'use client';

import React from 'react';

// Base skeleton with shimmer animation
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

// Skeleton for a single appraisal card in the history
export const AppraisalCardSkeleton: React.FC = () => (
  <div className="p-4 rounded-xl bg-white shadow-sm border border-slate-200">
    <div className="flex items-start gap-4">
      {/* Image skeleton */}
      <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />

      {/* Content skeleton */}
      <div className="flex-grow space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  </div>
);

// Skeleton for the history grid
export const HistoryGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="space-y-4">
    {/* Header skeleton */}
    <div className="flex items-center justify-between px-2">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-5 w-20" />
    </div>

    {/* Category pills skeleton */}
    <div className="flex flex-wrap gap-2 px-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-10 w-24 rounded-full" />
      ))}
    </div>

    {/* Grid skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <AppraisalCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Skeleton for the main appraisal result
export const ResultCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
    {/* Image skeleton */}
    <Skeleton className="w-full aspect-square" />

    {/* Content skeleton */}
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Price skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-32 rounded-xl" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Description skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Reasoning skeleton */}
      <div className="space-y-2 pt-4 border-t">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  </div>
);

// Skeleton for stats cards
export const StatsCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl p-4 border border-slate-200">
    <Skeleton className="h-4 w-20 mb-2" />
    <Skeleton className="h-8 w-24" />
  </div>
);

// Skeleton for gamification stats row
export const GamificationStatsSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Skeleton for profile header
export const ProfileHeaderSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
    <div className="flex items-center gap-4">
      <Skeleton className="w-20 h-20 rounded-full" />
      <div className="flex-grow space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-4 mt-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  </div>
);

// Full page loading skeleton
export const PageLoadingSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
    <ProfileHeaderSkeleton />
    <GamificationStatsSkeleton />
    <HistoryGridSkeleton count={4} />
  </div>
);
