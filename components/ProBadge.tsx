'use client';

import React from 'react';

interface ProBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ProBadge({ size = 'sm', className = '' }: ProBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-full ${sizeClasses[size]} ${className}`}
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      PRO
    </span>
  );
}

export function ProFeatureLock({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="relative group"
    >
      <div className="opacity-50 pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <ProBadge size="md" />
      </div>
    </button>
  );
}
