'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '@/components/contexts/AuthContext';
import { dbService } from '@/services/dbService';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

interface UserProfile {
  id: string;
  name: string;
  picture: string;
  username?: string;
}

interface FriendRequest {
  id: string;
  requester: UserProfile;
  created_at: string;
}

interface SentRequest {
  id: string;
  addressee: UserProfile;
  created_at: string;
}

type Tab = 'search' | 'requests' | 'friends';

export default function FriendsPage() {
  const { user, isAuthLoading } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, {
    status: string;
    friendshipId?: string;
    isRequester?: boolean;
  }>>({});
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

  // Load friends and requests data
  const loadData = useCallback(async () => {
    if (!user) return;

    const [friendsData, requestsData, sentData] = await Promise.all([
      dbService.getFriends(user.id),
      dbService.getPendingRequests(user.id),
      dbService.getSentRequests(user.id),
    ]);

    setFriends(friendsData);
    setPendingRequests(requestsData);
    setSentRequests(sentData);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search users with debounce
  useEffect(() => {
    if (!user || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      const results = await dbService.searchUsers(searchQuery, user.id);
      setSearchResults(results);

      // Get friendship status for each result
      const statuses: Record<string, any> = {};
      await Promise.all(
        results.map(async (result) => {
          const status = await dbService.getFriendshipStatus(user.id, result.id);
          if (status) {
            statuses[result.id] = status;
          }
        })
      );
      setFriendshipStatuses(statuses);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, user]);

  // Send friend request
  const handleSendRequest = async (addresseeId: string) => {
    if (!user) return;
    setLoadingActions(prev => ({ ...prev, [addresseeId]: true }));

    const success = await dbService.sendFriendRequest(user.id, addresseeId);
    if (success) {
      // Update status locally
      const status = await dbService.getFriendshipStatus(user.id, addresseeId);
      if (status) {
        setFriendshipStatuses(prev => ({ ...prev, [addresseeId]: status }));
      }
      // Reload sent requests
      const sentData = await dbService.getSentRequests(user.id);
      setSentRequests(sentData);
    }

    setLoadingActions(prev => ({ ...prev, [addresseeId]: false }));
  };

  // Accept friend request
  const handleAcceptRequest = async (friendshipId: string, requesterId: string) => {
    setLoadingActions(prev => ({ ...prev, [friendshipId]: true }));

    const success = await dbService.respondToFriendRequest(friendshipId, 'accepted');
    if (success) {
      await loadData();
    }

    setLoadingActions(prev => ({ ...prev, [friendshipId]: false }));
  };

  // Decline friend request
  const handleDeclineRequest = async (friendshipId: string) => {
    setLoadingActions(prev => ({ ...prev, [friendshipId]: true }));

    const success = await dbService.respondToFriendRequest(friendshipId, 'declined');
    if (success) {
      setPendingRequests(prev => prev.filter(r => r.id !== friendshipId));
    }

    setLoadingActions(prev => ({ ...prev, [friendshipId]: false }));
  };

  // Cancel sent request
  const handleCancelRequest = async (friendshipId: string, addresseeId: string) => {
    setLoadingActions(prev => ({ ...prev, [friendshipId]: true }));

    const success = await dbService.cancelFriendRequest(friendshipId);
    if (success) {
      setSentRequests(prev => prev.filter(r => r.id !== friendshipId));
      setFriendshipStatuses(prev => {
        const updated = { ...prev };
        delete updated[addresseeId];
        return updated;
      });
    }

    setLoadingActions(prev => ({ ...prev, [friendshipId]: false }));
  };

  // Remove friend
  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;
    setLoadingActions(prev => ({ ...prev, [friendId]: true }));

    const status = await dbService.getFriendshipStatus(user.id, friendId);
    if (status?.friendshipId) {
      const success = await dbService.removeFriend(status.friendshipId);
      if (success) {
        setFriends(prev => prev.filter(f => f.id !== friendId));
        setFriendshipStatuses(prev => {
          const updated = { ...prev };
          delete updated[friendId];
          return updated;
        });
      }
    }

    setLoadingActions(prev => ({ ...prev, [friendId]: false }));
  };

  // Get button state for search results
  const getActionButton = (userId: string) => {
    const status = friendshipStatuses[userId];
    const isLoading = loadingActions[userId];

    if (isLoading) {
      return (
        <button disabled className="px-4 py-2 rounded-full bg-slate-100 text-slate-400 text-sm font-medium">
          <span className="animate-pulse">...</span>
        </button>
      );
    }

    if (!status) {
      return (
        <button
          onClick={() => handleSendRequest(userId)}
          className="px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition-colors"
        >
          Add Friend
        </button>
      );
    }

    if (status.status === 'pending') {
      if (status.isRequester) {
        return (
          <button
            onClick={() => handleCancelRequest(status.friendshipId!, userId)}
            className="px-4 py-2 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium transition-colors"
          >
            Cancel Request
          </button>
        );
      } else {
        return (
          <div className="flex gap-2">
            <button
              onClick={() => handleAcceptRequest(status.friendshipId!, userId)}
              className="px-3 py-2 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => handleDeclineRequest(status.friendshipId!)}
              className="px-3 py-2 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium transition-colors"
            >
              Decline
            </button>
          </div>
        );
      }
    }

    if (status.status === 'accepted') {
      return (
        <span className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium">
          Friends
        </span>
      );
    }

    return (
      <button
        onClick={() => handleSendRequest(userId)}
        className="px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition-colors"
      >
        Add Friend
      </button>
    );
  };

  // Format relative time
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (isAuthLoading) {
    return (
      <>
        <Header />
        <main className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <main className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Sign in to Find Friends</h2>
            <p className="text-slate-500 mb-6">Connect with other treasure hunters and share your discoveries!</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 pb-24">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Friends</h1>
          <p className="text-slate-500">Connect with other treasure hunters</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'search'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors relative ${
              activeTab === 'requests'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Requests
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'friends'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Friends ({friends.length})
            </span>
          </button>
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            {/* Search Input */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name or @username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-800 placeholder-slate-400"
              />
              {isSearching && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <div className="animate-spin w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full" />
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchQuery.length < 2 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-slate-500">Type at least 2 characters to search</p>
              </div>
            ) : searchResults.length === 0 && !isSearching ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-500">No users found for "{searchQuery}"</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <Link href={`/user/${result.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <img
                        src={result.picture || '/default-avatar.png'}
                        alt={result.name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{result.name}</p>
                        {result.username && (
                          <p className="text-sm text-slate-500 truncate">@{result.username}</p>
                        )}
                      </div>
                    </Link>
                    <div className="flex-shrink-0 ml-4">
                      {getActionButton(result.id)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* Incoming Requests */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Incoming Requests
                {pendingRequests.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    {pendingRequests.length}
                  </span>
                )}
              </h3>

              {pendingRequests.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-slate-500">No pending friend requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                    >
                      <Link href={`/user/${request.requester.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <img
                          src={request.requester.picture || '/default-avatar.png'}
                          alt={request.requester.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{request.requester.name}</p>
                          <p className="text-sm text-slate-500">{formatTimeAgo(request.created_at)}</p>
                        </div>
                      </Link>
                      <div className="flex gap-2 flex-shrink-0 ml-4">
                        <button
                          onClick={() => handleAcceptRequest(request.id, request.requester.id)}
                          disabled={loadingActions[request.id]}
                          className="px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(request.id)}
                          disabled={loadingActions[request.id]}
                          className="px-4 py-2 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Requests */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Sent Requests
              </h3>

              {sentRequests.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-slate-500">No pending sent requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                    >
                      <Link href={`/user/${request.addressee.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <img
                          src={request.addressee.picture || '/default-avatar.png'}
                          alt={request.addressee.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{request.addressee.name}</p>
                          <p className="text-sm text-slate-500">Sent {formatTimeAgo(request.created_at)}</p>
                        </div>
                      </Link>
                      <div className="flex-shrink-0 ml-4">
                        <button
                          onClick={() => handleCancelRequest(request.id, request.addressee.id)}
                          disabled={loadingActions[request.id]}
                          className="px-4 py-2 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Your Friends ({friends.length})
            </h3>

            {friends.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-slate-500 mb-4">You haven't added any friends yet</p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-6 py-2.5 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-medium transition-colors"
                >
                  Find Friends
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <Link href={`/user/${friend.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <img
                        src={friend.picture || '/default-avatar.png'}
                        alt={friend.name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{friend.name}</p>
                        {friend.username && (
                          <p className="text-sm text-slate-500 truncate">@{friend.username}</p>
                        )}
                      </div>
                    </Link>
                    <div className="flex gap-2 flex-shrink-0 ml-4">
                      <Link
                        href={`/user/${friend.id}`}
                        className="px-4 py-2 rounded-full bg-teal-100 hover:bg-teal-200 text-teal-700 text-sm font-medium transition-colors"
                      >
                        View Profile
                      </Link>
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        disabled={loadingActions[friend.id]}
                        className="px-4 py-2 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
