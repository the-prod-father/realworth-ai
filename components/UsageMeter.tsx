'use client';

import React from 'react';

interface UsageMeterProps {
  used: number;
  limit: number;
  isPro?: boolean;
  onUpgrade?: () => void;
}

export default function UsageMeter({ used, limit, isPro, onUpgrade }: UsageMeterProps) {
  if (isPro) {
    return (
      <div className="flex items-center gap-2 text-sm text-teal-600">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        <span className="font-medium">Unlimited appraisals</span>
      </div>
    );
  }

  const percentage = Math.min((used / limit) * 100, 100);
  const remaining = Math.max(limit - used, 0);
  const isLow = remaining <= 3;
  const isExhausted = remaining === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className={`font-medium ${isExhausted ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-700'}`}>
          {used}/{limit} appraisals used
        </span>
        {!isPro && onUpgrade && (
          <button
            onClick={onUpgrade}
            className="text-teal-600 hover:text-teal-700 font-medium text-xs"
          >
            Go Pro
          </button>
        )}
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isExhausted
              ? 'bg-red-500'
              : isLow
              ? 'bg-amber-500'
              : 'bg-teal-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isExhausted && (
        <p className="text-xs text-red-600">
          You&apos;ve reached your monthly limit.{' '}
          {onUpgrade && (
            <button onClick={onUpgrade} className="underline font-medium">
              Upgrade to Pro
            </button>
          )}
        </p>
      )}
      {isLow && !isExhausted && (
        <p className="text-xs text-amber-600">
          Only {remaining} appraisal{remaining !== 1 ? 's' : ''} left this month
        </p>
      )}
    </div>
  );
}
