
'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { LogoIcon, SparklesIcon } from './icons';
import { Auth } from './Auth';
import { AuthContext } from './contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import ProBadge from './ProBadge';

interface HeaderProps {
  onUpgradeClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onUpgradeClick }) => {
  const { user } = useContext(AuthContext);
  const { isPro } = useSubscription(user?.id || null, user?.email);

  return (
    <header className="p-4 sm:p-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <LogoIcon />
            <h1 className="text-2xl font-bold tracking-tighter text-slate-900">
              RealWorth<span className="font-light text-slate-500">.ai</span>
            </h1>
          </Link>
          <nav className="hidden sm:flex items-center gap-4">
            <Link
              href="/discover"
              className="text-slate-600 hover:text-teal-600 font-medium transition-colors"
            >
              Discover
            </Link>
            <Link
              href="/collections"
              className="text-slate-600 hover:text-teal-600 font-medium transition-colors"
            >
              Collections
            </Link>
            <Link
              href="/leaderboard"
              className="text-slate-600 hover:text-teal-600 font-medium transition-colors"
            >
              Leaderboard
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* Upgrade to Pro button - show for logged in non-Pro users */}
          {user && !isPro && onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-2 px-4 rounded-full text-sm transition-all shadow-md shadow-teal-500/20 hover:shadow-lg hover:shadow-teal-500/30"
            >
              <SparklesIcon className="w-4 h-4" />
              Go Pro
            </button>
          )}
          {/* Pro badge for Pro users */}
          {user && isPro && (
            <ProBadge />
          )}
          <Link
            href="/discover"
            className="sm:hidden text-slate-600 hover:text-teal-600 font-medium transition-colors text-sm"
          >
            Discover
          </Link>
          <Auth />
        </div>
      </div>
    </header>
  );
};
