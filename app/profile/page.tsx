
'use client';

import React, { useState, useEffect, useContext, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { GamificationStats } from '@/components/GamificationStats';
import { Achievements } from '@/components/Achievements';
import { HistoryList } from '@/components/HistoryList';
import { AuthContext } from '@/components/contexts/AuthContext';
import { dbService } from '@/services/dbService';
import { AppraisalResult } from '@/lib/types';

export default function ProfilePage() {
  const { user, isAuthLoading } = useContext(AuthContext);
  const [history, setHistory] = useState<AppraisalResult[]>([]);
  const [streaks, setStreaks] = useState({ currentStreak: 0, longestStreak: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && !isAuthLoading) {
      setIsLoading(true);
      Promise.all([
        dbService.getHistory(user.id),
        dbService.getUserStreaks(user.id)
      ]).then(([historyData, streakData]) => {
        setHistory(historyData);
        setStreaks(streakData);
        setIsLoading(false);
      });
    } else if (!user && !isAuthLoading) {
      setIsLoading(false);
    }
  }, [user, isAuthLoading]);

  const { totalValue, itemCount } = useMemo(() => {
    const total = history.reduce((acc, item) => acc + (item.priceRange.high + item.priceRange.low) / 2, 0);
    return { totalValue: total, itemCount: history.length };
  }, [history]);

  const publicCount = useMemo(() => {
    return history.filter(item => item.isPublic).length;
  }, [history]);

  if (isAuthLoading || isLoading) {
    return (
      <>
        <Header />
        <main className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
          <div className="animate-pulse">
            <div className="h-32 bg-slate-200 rounded-xl mb-6"></div>
            <div className="h-48 bg-slate-200 rounded-xl"></div>
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <main className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Sign In Required</h2>
            <p className="text-slate-600 mb-6">
              Sign in to view your profile, track your treasures, and compete on the leaderboard!
            </p>
            <Link
              href="/"
              className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-full transition-transform transform hover:scale-105"
            >
              Go to Home
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-20 h-20 rounded-full border-4 border-teal-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center text-3xl">
                {user.name?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex-grow">
              <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
              <p className="text-slate-500 text-sm">{user.email}</p>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-slate-600">
                  <strong className="text-teal-600">{itemCount}</strong> treasures
                </span>
                <span className="text-slate-600">
                  <strong className="text-emerald-600">{publicCount}</strong> shared
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {history.length > 0 && (
          <GamificationStats
            itemCount={itemCount}
            totalValue={totalValue}
            currency={history[0]?.currency || 'USD'}
            currentStreak={streaks.currentStreak}
            longestStreak={streaks.longestStreak}
          />
        )}

        {/* Achievements */}
        <Achievements history={history} />

        {/* Treasure Collection */}
        {history.length > 0 ? (
          <HistoryList
            history={history}
            onSelect={() => {}}
            userId={user.id}
            onUpdate={(updatedItem) => {
              setHistory(prev => prev.map(item =>
                item.id === updatedItem.id ? updatedItem : item
              ));
            }}
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Start Your Treasure Hunt!</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Your collection is empty. Snap photos of items around your home to discover hidden treasures!
            </p>
            <Link
              href="/"
              className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-full transition-transform transform hover:scale-105 shadow-lg shadow-teal-500/30"
            >
              Find Your First Treasure
            </Link>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-transform transform hover:scale-105 shadow-lg shadow-teal-500/30"
          >
            Appraise More Treasures
          </Link>
        </div>
      </main>

      <footer className="text-center p-4 text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} RealWorth.ai. All rights reserved.</p>
      </footer>
    </>
  );
}
