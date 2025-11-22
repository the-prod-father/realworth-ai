
'use client';

import React, { useContext, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AuthContext } from './contexts/AuthContext';
import { SpinnerIcon } from './icons';
import { isSupabaseConfigured } from '@/services/authService';

export const Auth: React.FC = () => {
  const { user, isAuthLoading, signIn, signOut } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isAuthLoading) {
    return <div className="w-24 h-10 flex items-center justify-center"><SpinnerIcon /></div>;
  }

  if (user) {
    return (
      <div className="relative" ref={menuRef}>
        <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-full transition-opacity hover:opacity-80">
          <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-slate-200">
            <div className="px-4 py-2 text-sm text-slate-700 border-b">
              <p className="font-semibold truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              My Profile
            </Link>
            <button
              onClick={() => {
                signOut();
                setMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={signIn}
        disabled={!isSupabaseConfigured}
        className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        Sign In with Google
      </button>
      {!isSupabaseConfigured && (
        <div className="absolute bottom-full mb-2 right-0 w-64 bg-slate-800 text-white text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="font-bold">Developer Notice:</span> Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your `.env.local` file.
          <svg className="absolute text-slate-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
        </div>
      )}
    </div>
  );
};
