'use client';

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/components/contexts/AuthContext';
import { CollectionCard } from '@/components/CollectionCard';
import { CollectionForm } from '@/components/CollectionForm';
import { CollectionDashboard } from '@/components/CollectionDashboard';
import { collectionService } from '@/services/collectionService';
import { Collection, CollectionSummary, CollectionVisibility, AppraisalResult } from '@/lib/types';
import Link from 'next/link';

export default function CollectionsPage() {
  const { user, isAuthLoading } = useContext(AuthContext);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Load collections
  useEffect(() => {
    if (user) {
      loadCollections();
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [user, isAuthLoading]);

  const loadCollections = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await collectionService.getCollections(user.id);
      setCollections(data);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCollection = async (data: {
    name: string;
    description?: string;
    category?: string;
    expectedCount?: number;
    visibility: CollectionVisibility;
    goalDate?: string;
  }) => {
    if (!user) return;
    setIsCreating(true);
    try {
      const newCollection = await collectionService.createCollection(user.id, data);
      if (newCollection) {
        await loadCollections();
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Error creating collection:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectCollection = async (collectionId: string) => {
    if (!user) return;
    try {
      const collection = await collectionService.getCollection(collectionId, user.id);
      setSelectedCollection(collection);
    } catch (error) {
      console.error('Error loading collection:', error);
    }
  };

  const handleAddItem = () => {
    // Navigate to appraisal form with collection context
    if (selectedCollection) {
      window.location.href = `/?collection=${selectedCollection.id}`;
    }
  };

  const handleItemClick = (item: AppraisalResult) => {
    // Navigate to item detail
    window.location.href = `/treasure/${item.id}`;
  };

  const handleShare = () => {
    if (!selectedCollection) return;

    const baseUrl = window.location.origin;
    const link = selectedCollection.shareToken
      ? `${baseUrl}/collection/${selectedCollection.shareToken}`
      : `${baseUrl}/collections/${selectedCollection.id}`;

    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  // Not logged in
  if (!isAuthLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign in to view collections</h1>
          <p className="text-slate-500 mb-4">Create and manage your treasure collections</p>
          <Link
            href="/"
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  // Viewing single collection
  if (selectedCollection) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 px-4">
        <CollectionDashboard
          collection={selectedCollection}
          onAddItem={handleAddItem}
          onEditCollection={() => {
            // TODO: Implement edit modal
          }}
          onShare={handleShare}
          onItemClick={handleItemClick}
          onBack={() => setSelectedCollection(null)}
          isOwner={selectedCollection.userId === user?.id}
        />
      </div>
    );
  }

  // Collections list view
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Header - Mobile optimized */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-2xl font-bold text-slate-900 mb-1">My Collections</h1>
          <p className="text-slate-500 text-sm sm:text-base">Build and track your treasure collections</p>
        </div>

        {/* New Collection Button - Full width on mobile */}
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full sm:w-auto mb-6 px-6 py-4 sm:py-3 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 active:bg-teal-700 transition flex items-center justify-center gap-2 text-lg sm:text-base shadow-lg shadow-teal-500/20"
        >
          <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Collection
        </button>

        {/* Collections Grid - Single column on mobile */}
        {collections.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onClick={() => handleSelectCollection(collection.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 sm:py-12 bg-white rounded-2xl border border-slate-200">
            <svg className="w-16 h-16 sm:w-12 sm:h-12 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-slate-600 text-lg sm:text-base mb-4">No collections yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-teal-600 font-semibold hover:text-teal-700 text-lg sm:text-base py-2 px-4"
            >
              Create your first collection
            </button>
          </div>
        )}

        {/* Create Collection Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Create Collection</h2>
              <CollectionForm
                onSubmit={handleCreateCollection}
                onCancel={() => setShowCreateForm(false)}
                isLoading={isCreating}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
