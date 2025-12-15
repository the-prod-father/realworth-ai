
'use client';

import React, { useContext, useState } from 'react';
import Link from 'next/link';
import { LogoIcon, SparklesIcon } from './icons';
import { Auth } from './Auth';
import { AuthContext } from './contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import ProBadge from './ProBadge';
import PWAInstallButton from './PWAInstallButton';
import { HelpButton, HelpChatWidget } from './HelpChatWidget';

interface HeaderProps {
  onUpgradeClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onUpgradeClick }) => {
  const { user } = useContext(AuthContext);
  const { isPro, isVerifying } = useSubscription(user?.id || null, user?.email);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <HelpChatWidget isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
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
          {/* PWA Install Button - shows only when install is available */}
          <PWAInstallButton variant="compact" />
          {/* Activating Pro indicator - shows during post-checkout verification */}
          {user && isVerifying && (
            <span className="hidden sm:flex items-center gap-2 text-teal-600 font-medium text-sm animate-pulse">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Activating Pro...
            </span>
          )}
          {/* Upgrade to Pro button - show for logged in non-Pro users (not during verification) */}
          {user && !isPro && !isVerifying && onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-2 px-4 rounded-full text-sm transition-all shadow-md shadow-teal-500/20 hover:shadow-lg hover:shadow-teal-500/30"
            >
              <SparklesIcon className="w-4 h-4" />
              Go Pro
            </button>
          )}
          {/* Pro badge for Pro users */}
          {user && isPro && !isVerifying && (
            <ProBadge />
          )}
          <Link
            href="/discover"
            className="sm:hidden text-slate-600 hover:text-teal-600 font-medium transition-colors text-sm"
          >
            Discover
          </Link>
          <HelpButton onClick={() => setIsHelpOpen(true)} />
          <Auth />
        </div>
      </div>
    </header>
    </>
  );
};
