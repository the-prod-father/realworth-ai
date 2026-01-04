
'use client';

import React, { useState, useEffect, useContext, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { GamificationStats } from '@/components/GamificationStats';
import { Achievements } from '@/components/Achievements';
import { DailyChallenges } from '@/components/DailyChallenges';
import { TreasureGrid } from '@/components/TreasureGrid';
import { AuthContext } from '@/components/contexts/AuthContext';
import { AppraisalContext } from '@/components/contexts/AppraisalContext';
import { LockIcon, MapIcon, CheckIcon, UsersIcon, UserIcon, SearchIcon } from '@/components/icons';
import { SubscriptionSection } from '@/components/SubscriptionSection';
import { useSubscription } from '@/hooks/useSubscription';
import { dbService } from '@/services/dbService';
import { supabase } from '@/lib/supabase';
import { AppraisalResult } from '@/lib/types';
import { ProfileHeaderSkeleton, GamificationStatsSkeleton, HistoryGridSkeleton } from '@/components/Skeleton';
import { Footer } from '@/components/Footer';

type ProfileTab = 'treasures' | 'friends';

export default function ProfilePage() {
  const { user, isAuthLoading } = useContext(AuthContext);
  const { appraisals: history, refreshAppraisals, isLoading: isAppraisalsLoading } = useContext(AppraisalContext);
  const [streaks, setStreaks] = useState({ currentStreak: 0, longestStreak: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<ProfileTab>('treasures');

  // Username state
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  // Friends state
  const [friends, setFriends] = useState<Array<{ id: string; name: string; picture: string; username?: string }>>([]);
  const [pendingRequests, setPendingRequests] = useState<Array<{ id: string; requester: { id: string; name: string; picture: string; username?: string }; created_at: string }>>([]);

  // Friend search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; picture: string; username?: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, string>>({});

  // Subscription state
  const {
    subscription,
    isPro,
    isLoading: isSubscriptionLoading,
    error: subscriptionError,
    openPortal,
    cancelSubscription,
    reactivateSubscription,
    refresh: refreshSubscription,
  } = useSubscription(user?.id ?? null, user?.email);

  useEffect(() => {
    // Only run when auth is done loading and we have a user
    if (isAuthLoading) return;

    if (user) {
      setIsLoading(true);
      const userId = user.id; // Capture user.id to avoid dependency on user object reference

      // Refresh appraisals from context (handles optimistic updates)
      refreshAppraisals(userId);

      // Load other profile data
      Promise.all([
        dbService.getUserStreaks(userId),
        dbService.getFriends(userId),
        dbService.getPendingRequests(userId),
        // Load username from users table
        supabase.from('users').select('username').eq('id', userId).single()
      ]).then(([streakData, friendsData, requestsData, usernameResult]) => {
        setStreaks(streakData || { currentStreak: 0, longestStreak: 0 });
        setFriends(friendsData || []);
        setPendingRequests(requestsData || []);
        // Set username if available
        if (usernameResult?.data?.username) {
          setUsername(usernameResult.data.username);
        }
        setIsLoading(false);
      }).catch((error) => {
        console.error('Error loading profile data:', error);
        // Always set loading to false, even on error
        setIsLoading(false);
        // Set defaults on error
        setStreaks({ currentStreak: 0, longestStreak: 0 });
        setFriends([]);
        setPendingRequests([]);
      });
    } else {
      setIsLoading(false);
    }
  }, [user?.id, isAuthLoading, refreshAppraisals]); // Use user?.id instead of user to prevent unnecessary re-renders

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

  // Friend search handler
  const handleSearch = async () => {
    if (!user || !searchQuery.trim()) return;

    setIsSearching(true);
    const results = await dbService.searchUsers(searchQuery.trim(), user.id);
    setSearchResults(results);

    // Check friendship status for each result
    const statuses: Record<string, string> = {};
    for (const result of results) {
      const statusResult = await dbService.getFriendshipStatus(user.id, result.id);
      statuses[result.id] = statusResult?.status || 'none';
    }
    setFriendshipStatuses(statuses);
    setIsSearching(false);
  };

  const handleSendRequest = async (targetUserId: string) => {
    if (!user) return;
    const success = await dbService.sendFriendRequest(user.id, targetUserId);
    if (success) {
      setFriendshipStatuses(prev => ({ ...prev, [targetUserId]: 'pending' }));
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

        {/* Subscription Management */}
        <SubscriptionSection
          subscription={subscription}
          isPro={isPro}
          isLoading={isSubscriptionLoading}
          error={subscriptionError}
          openPortal={openPortal}
          cancelSubscription={cancelSubscription}
          reactivateSubscription={reactivateSubscription}
          onRetry={refreshSubscription}
        />

        {/* Instagram-style Tab Navigation */}
        <div className="border-t border-slate-200 mt-4">
          <div className="flex">
            <button
              onClick={() => setActiveTab('treasures')}
              className={`flex-1 py-3 text-center text-sm font-semibold transition-colors relative ${
                activeTab === 'treasures'
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="hidden sm:inline">Treasures</span>
              </div>
              {activeTab === 'treasures' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-3 text-center text-sm font-semibold transition-colors relative ${
                activeTab === 'friends'
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <UsersIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Friends</span>
                {pendingRequests.length > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </div>
              {activeTab === 'friends' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'treasures' && (
            <div className="space-y-6">
              {/* Stats - compact version */}
              {history.length > 0 && (
                <GamificationStats
                  itemCount={itemCount}
                  totalValue={totalValue}
                  currency={history[0]?.currency || 'USD'}
                  currentStreak={streaks.currentStreak}
                  longestStreak={streaks.longestStreak}
                />
              )}

              {/* Instagram-style Treasure Grid */}
              {history.length > 0 ? (
                <TreasureGrid items={history} />
              ) : (
                <div className="text-center py-12">
                  <MapIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">Start Your Collection</h3>
                  <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm">
                    Snap photos of items to discover hidden treasures.
                  </p>
                  <Link
                    href="/?capture=true"
                    className="inline-block bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-md shadow-teal-500/30"
                  >
                    Find Your First Treasure
                  </Link>
                </div>
              )}

              {/* Achievements */}
              <Achievements history={history} />
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="space-y-4">
              {/* Search Friends */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or @username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 border-0 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {isSearching ? '...' : 'Search'}
                  </button>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {searchResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3">
                      <Link href={`/user/${result.id}`} className="flex items-center gap-3 hover:opacity-80">
                        {result.picture ? (
                          <img src={result.picture} alt={result.name} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{result.name}</p>
                          {result.username && (
                            <p className="text-xs text-slate-500">@{result.username}</p>
                          )}
                        </div>
                      </Link>
                      {friendshipStatuses[result.id] === 'accepted' ? (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <CheckIcon className="w-3 h-3" /> Friends
                        </span>
                      ) : friendshipStatuses[result.id] === 'pending' ? (
                        <span className="text-xs text-amber-600 font-medium">Pending</span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(result.id)}
                          className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
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
              {friends.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">
                    Your Friends ({friends.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {friends.map((friend) => (
                      <Link
                        key={friend.id}
                        href={`/user/${friend.id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors active:bg-slate-100"
                      >
                        {friend.picture ? (
                          <img src={friend.picture} alt={friend.name} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-slate-400" />
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
              ) : !searchResults.length && (
                <div className="text-center py-12 text-slate-400">
                  <UsersIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">Search to find and add friends</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
