
'use client';

import React, { useState, useEffect, useContext, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { GamificationStats } from '@/components/GamificationStats';
import { Achievements } from '@/components/Achievements';
import { DailyChallenges } from '@/components/DailyChallenges';
import { HistoryList } from '@/components/HistoryList';
import { AuthContext } from '@/components/contexts/AuthContext';
import { LockIcon, MapIcon, CheckIcon, UsersIcon, UserIcon } from '@/components/icons';
import { dbService } from '@/services/dbService';
import { AppraisalResult } from '@/lib/types';
import { ProfileHeaderSkeleton, GamificationStatsSkeleton, HistoryGridSkeleton } from '@/components/Skeleton';

export default function ProfilePage() {
  const { user, isAuthLoading } = useContext(AuthContext);
  const [history, setHistory] = useState<AppraisalResult[]>([]);
  const [streaks, setStreaks] = useState({ currentStreak: 0, longestStreak: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Username state
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  // Friends state
  const [friends, setFriends] = useState<Array<{ id: string; name: string; picture: string; username?: string }>>([]);
  const [pendingRequests, setPendingRequests] = useState<Array<{ id: string; requester: { id: string; name: string; picture: string; username?: string }; created_at: string }>>([]);

  useEffect(() => {
    if (user && !isAuthLoading) {
      setIsLoading(true);
      Promise.all([
        dbService.getHistory(user.id),
        dbService.getUserStreaks(user.id),
        dbService.getFriends(user.id),
        dbService.getPendingRequests(user.id)
      ]).then(([historyData, streakData, friendsData, requestsData]) => {
        setHistory(historyData);
        setStreaks(streakData);
        setFriends(friendsData);
        setPendingRequests(requestsData);
        setIsLoading(false);
      });
    } else if (!user && !isAuthLoading) {
      setIsLoading(false);
    }
  }, [user, isAuthLoading]);

  const handleSaveUsername = async () => {
    if (!user) return;

    const trimmed = usernameInput.trim().toLowerCase();
    if (trimmed.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (trimmed.length > 30) {
      setUsernameError('Username must be 30 characters or less');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setUsernameError('Only letters, numbers, and underscores allowed');
      return;
    }

    setSavingUsername(true);
    setUsernameError('');

    const isAvailable = await dbService.checkUsername(trimmed);
    if (!isAvailable && trimmed !== username) {
      setUsernameError('Username already taken');
      setSavingUsername(false);
      return;
    }

    const success = await dbService.updateUsername(user.id, trimmed);
    if (success) {
      setUsername(trimmed);
      setEditingUsername(false);
    } else {
      setUsernameError('Failed to save username');
    }
    setSavingUsername(false);
  };

  const handleAcceptRequest = async (requestId: string) => {
    const success = await dbService.respondToFriendRequest(requestId, 'accepted');
    if (success) {
      const request = pendingRequests.find(r => r.id === requestId);
      if (request) {
        setFriends(prev => [...prev, request.requester]);
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      }
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    const success = await dbService.respondToFriendRequest(requestId, 'declined');
    if (success) {
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    }
  };

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
          <ProfileHeaderSkeleton />
          <GamificationStatsSkeleton />
          <HistoryGridSkeleton count={4} />
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <main className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <LockIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Sign In Required</h2>
            <p className="text-slate-500 mb-6 text-sm">
              Sign in to view your profile and track your treasures.
            </p>
            <Link
              href="/"
              className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-medium py-2.5 px-5 rounded-lg transition-colors"
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

              {/* Username */}
              {editingUsername ? (
                <div className="mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">@</span>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
                      placeholder="username"
                      className="text-sm border border-slate-300 rounded px-2 py-1 w-40 focus:outline-none focus:border-teal-500"
                      maxLength={30}
                    />
                    <button
                      onClick={handleSaveUsername}
                      disabled={savingUsername}
                      className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                    >
                      {savingUsername ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingUsername(false);
                        setUsernameError('');
                      }}
                      className="text-slate-500 hover:text-slate-700 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  {usernameError && (
                    <p className="text-red-500 text-xs mt-1">{usernameError}</p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setUsernameInput(username);
                    setEditingUsername(true);
                  }}
                  className="text-sm text-slate-500 hover:text-teal-600 transition-colors"
                >
                  {username ? `@${username}` : 'Set username'}
                </button>
              )}

              <p className="text-slate-500 text-sm">{user.email}</p>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-slate-600">
                  <strong className="text-teal-600">{itemCount}</strong> treasures
                </span>
                <span className="text-slate-600">
                  <strong className="text-emerald-600">{publicCount}</strong> shared
                </span>
                <span className="text-slate-600">
                  <strong className="text-blue-600">{friends.length}</strong> friends
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Friend Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-teal-500" />
              Friend Requests ({pendingRequests.length})
            </h3>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between">
                  <Link href={`/user/${request.requester.id}`} className="flex items-center gap-3 hover:opacity-80">
                    {request.requester.picture ? (
                      <img src={request.requester.picture} alt={request.requester.name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{request.requester.name}</p>
                      {request.requester.username && (
                        <p className="text-xs text-slate-500">@{request.requester.username}</p>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(request.id)}
                      className="text-xs text-slate-500 hover:text-red-500 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        {friends.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-green-500" />
              Friends ({friends.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {friends.map((friend) => (
                <Link
                  key={friend.id}
                  href={`/user/${friend.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {friend.picture ? (
                    <img src={friend.picture} alt={friend.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{friend.name}</p>
                    {friend.username && (
                      <p className="text-xs text-slate-500 truncate">@{friend.username}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {history.length > 0 && (
          <>
            <GamificationStats
              itemCount={itemCount}
              totalValue={totalValue}
              currency={history[0]?.currency || 'USD'}
              currentStreak={streaks.currentStreak}
              longestStreak={streaks.longestStreak}
            />
            <DailyChallenges
              history={history}
              currentStreak={streaks.currentStreak}
              longestStreak={streaks.longestStreak}
            />
          </>
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
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <MapIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Start Your Collection</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm">
              Your collection is empty. Snap photos of items to discover hidden treasures.
            </p>
            <Link
              href="/"
              className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-medium py-2.5 px-5 rounded-lg transition-colors"
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
