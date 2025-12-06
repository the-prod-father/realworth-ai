'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GemIcon, CheckIcon, ChevronRightIcon, SpinnerIcon } from './icons';
import { CollectionSummary } from '@/lib/types';
import { collectionService } from '@/services/collectionService';

interface QuickAddToCollectionProps {
  appraisalId: string;
  userId: string;
  collections: CollectionSummary[];
  onSuccess: (collectionId: string, collectionName: string) => void;
  onCollectionCreated?: (collection: CollectionSummary) => void;
  compact?: boolean;
}

export function QuickAddToCollection({
  appraisalId,
  userId,
  collections,
  onSuccess,
  onCollectionCreated,
  compact = false,
}: QuickAddToCollectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [addedTo, setAddedTo] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setNewCollectionName('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when creating new collection
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleAddToCollection = async (collectionId: string, collectionName: string) => {
    setIsLoading(true);
    try {
      const success = await collectionService.addToCollection(userId, appraisalId, collectionId);
      if (success) {
        setAddedTo(collectionName);
        onSuccess(collectionId, collectionName);
        setTimeout(() => {
          setIsOpen(false);
          setAddedTo(null);
        }, 1500);
      }
    } catch (error) {
      console.error('Error adding to collection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newCollectionName.trim()) return;

    setIsLoading(true);
    try {
      // Create new collection
      const newCollection = await collectionService.createCollection(userId, {
        name: newCollectionName.trim(),
      });

      if (newCollection) {
        // Add item to the new collection
        const success = await collectionService.addToCollection(userId, appraisalId, newCollection.id);
        if (success) {
          setAddedTo(newCollectionName.trim());
          onSuccess(newCollection.id, newCollectionName.trim());

          // Notify parent about new collection
          if (onCollectionCreated) {
            onCollectionCreated({
              id: newCollection.id,
              name: newCollection.name,
              description: newCollection.description,
              category: newCollection.category,
              itemCount: 1,
              expectedCount: newCollection.expectedCount,
              completionPercentage: 0,
              totalValueLow: 0,
              totalValueHigh: 0,
              visibility: newCollection.visibility,
              goalDate: newCollection.goalDate,
            });
          }

          setTimeout(() => {
            setIsOpen(false);
            setIsCreating(false);
            setNewCollectionName('');
            setAddedTo(null);
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error creating collection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Already added state
  if (addedTo) {
    return (
      <div className={`flex items-center gap-1.5 ${compact ? 'text-xs' : 'text-sm'} text-green-600`}>
        <CheckIcon className="w-4 h-4" />
        <span>Added to {addedTo}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`flex items-center gap-1.5 ${
          compact
            ? 'text-xs px-2 py-1 rounded'
            : 'text-sm px-3 py-1.5 rounded-lg'
        } bg-teal-50 hover:bg-teal-100 text-teal-700 font-medium transition-colors touch-manipulation`}
        style={{ touchAction: 'manipulation' }}
      >
        <GemIcon className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        {compact ? 'Add' : 'Add to Collection'}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-slide-up">
          {/* Creating new collection */}
          {isCreating ? (
            <div className="p-3">
              <p className="text-xs font-medium text-slate-500 mb-2">New Collection Name</p>
              <input
                ref={inputRef}
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateAndAdd();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewCollectionName('');
                  }
                }}
                placeholder="e.g., Vinyl Records"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                disabled={isLoading}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewCollectionName('');
                  }}
                  className="flex-1 text-xs text-slate-500 hover:text-slate-700 py-1.5"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAndAdd}
                  disabled={!newCollectionName.trim() || isLoading}
                  className="flex-1 flex items-center justify-center gap-1 text-xs bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 text-white font-medium py-1.5 px-3 rounded-lg transition-colors"
                >
                  {isLoading ? (
                    <SpinnerIcon className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <CheckIcon className="w-3 h-3" />
                      Create & Add
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Existing Collections */}
              <div className="max-h-48 overflow-y-auto">
                {collections.length > 0 ? (
                  collections.map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => handleAddToCollection(collection.id, collection.name)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors text-left disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <GemIcon className="w-4 h-4 text-teal-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{collection.name}</p>
                          <p className="text-xs text-slate-500">{collection.itemCount} items</p>
                        </div>
                      </div>
                      <ChevronRightIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center">
                    <p className="text-sm text-slate-500">No collections yet</p>
                  </div>
                )}
              </div>

              {/* Create New Option */}
              <div className="border-t border-slate-100">
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <span className="text-slate-500 text-lg font-light">+</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">Create New Collection</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default QuickAddToCollection;
