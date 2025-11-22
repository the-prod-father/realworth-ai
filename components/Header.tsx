
'use client';

import React from 'react';
import Link from 'next/link';
import { LogoIcon } from './icons';
import { Auth } from './Auth';

export const Header: React.FC = () => {
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
          </nav>
        </div>
        <div className="flex items-center gap-3">
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
