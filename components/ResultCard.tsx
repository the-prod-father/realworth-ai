
'use client';

import React, { useContext, useEffect, useState, useRef } from 'react';
import { AppraisalResult } from '@/lib/types';
import { SparklesIcon } from './icons';
import { AuthContext } from './contexts/AuthContext';
import { AppraisalContext } from './contexts/AppraisalContext';
import { SignInModal } from './SignInModal';
import { Confetti } from './Confetti';
import { getValueReaction, getFunComparison, shouldCelebrate, getShareText } from '@/lib/funComparisons';
import { AddPhotosModal } from './AddPhotosModal';
import ChatInterface from './ChatInterface';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
import { AuthProvider } from '@/services/authService';
import { trackLogin } from '@/lib/analytics';

interface ResultCardProps {
  result: AppraisalResult;
  onStartNew: () => void;
  isFromHistory?: boolean; // Don't show confetti for items clicked from history
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onStartNew, isFromHistory = false }) => {
  const { user, signInWithProvider } = useContext(AuthContext);
  const { addAppraisal, updateAppraisal } = useContext(AppraisalContext);
  const { isPro } = useSubscription(user?.id || null, user?.email);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAddPhotos, setShowAddPhotos] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [currentResult, setCurrentResult] = useState(result);
  const [isPublic, setIsPublic] = useState(result.isPublic ?? false);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const [valueChange, setValueChange] = useState<{ previous: { low: number; high: number }; new: { low: number; high: number } } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  const handleSelectProvider = async (provider: AuthProvider) => {
    setIsSignInModalOpen(false);
    trackLogin(provider);
    await signInWithProvider(provider);
  };

  // Animation on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const avgValue = (currentResult.priceRange.low + currentResult.priceRange.high) / 2;
  const imageCount = currentResult.images?.length || 1;

  // Get all available images (use images array if available, otherwise just the main image)
  const allImages = currentResult.images && currentResult.images.length > 0
    ? currentResult.images
    : [currentResult.image];

  const currentDisplayImage = allImages[currentImageIndex] || currentResult.image;

  const nextImage = () => {
    setCurrentImageIndex(prev => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
  };
  const reaction = getValueReaction(avgValue);
  const comparison = getFunComparison(avgValue);
  const celebrate = shouldCelebrate(avgValue);

  // Trigger confetti ONLY on first view (not from history)
  useEffect(() => {
    if (celebrate && !isFromHistory) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    }
  }, []); // Empty deps - only run once on mount

  // Effect to add the current appraisal to context once the user signs in
  useEffect(() => {
    if (user) {
      // Add to context (will dedupe if already exists)
      addAppraisal(result);
    }
  }, [user, result, addAppraisal]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: result.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleToggleVisibility = async () => {
    if (!user || isTogglingVisibility) return;

    setIsTogglingVisibility(true);
    const newIsPublic = !isPublic;

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No auth session');
        return;
      }

      // Call API to update visibility
      const response = await fetch(`/api/appraise/${currentResult.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ isPublic: newIsPublic }),
      });

      if (response.ok) {
        // Update local state
        setIsPublic(newIsPublic);
        // Update in global context
        updateAppraisal(currentResult.id, { isPublic: newIsPublic });
        // Update current result
        setCurrentResult(prev => ({ ...prev, isPublic: newIsPublic }));
      } else {
        console.error('Failed to update visibility');
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const handleShare = async () => {
    const shareText = getShareText(currentResult.itemName, avgValue);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${currentResult.itemName} - Worth ${formatCurrency(avgValue)}!`,
          text: shareText,
          url: window.location.origin,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddPhotosSuccess = (result: {
    imageCount: number;
    reanalyzed: boolean;
    appraisalData?: any;
    previousValue?: { low: number; high: number };
    newValue?: { low: number; high: number };
  }) => {
    setShowAddPhotos(false);

    if (result.reanalyzed && result.appraisalData) {
      // Update the current result with new analysis
      const updatedResult: AppraisalResult = {
        ...currentResult,
        itemName: result.appraisalData.itemName,
        author: result.appraisalData.author,
        era: result.appraisalData.era,
        category: result.appraisalData.category,
        description: result.appraisalData.description,
        priceRange: result.appraisalData.priceRange,
        currency: result.appraisalData.currency,
        reasoning: result.appraisalData.reasoning,
        references: result.appraisalData.references,
        images: new Array(result.imageCount).fill(''), // placeholder for image count
      };

      setCurrentResult(updatedResult);

      // Show value change if different
      if (result.previousValue && result.newValue) {
        const prevAvg = (result.previousValue.low + result.previousValue.high) / 2;
        const newAvg = (result.newValue.low + result.newValue.high) / 2;
        if (Math.abs(prevAvg - newAvg) > 1) {
          setValueChange({
            previous: result.previousValue,
            new: result.newValue,
          });
          // Clear value change message after 10 seconds
          setTimeout(() => setValueChange(null), 10000);
        }
      }

      // Update in global context
      updateAppraisal(currentResult.id, updatedResult);

      // Celebrate if value increased significantly
      if (result.newValue && result.previousValue) {
        const increase = result.newValue.high - result.previousValue.high;
        if (increase > 100) {
          setShowConfetti(true);
        }
      }
    } else {
      // Just update image count
      setCurrentResult(prev => ({
        ...prev,
        images: new Array(result.imageCount).fill(''),
      }));
    }
  };

  const isGreatFind = currentResult.priceRange.high >= 500;

  return (
    <>
      <Confetti trigger={showConfetti} />

      <div className={`p-4 sm:p-6 md:p-8 transition-all duration-300 w-full max-w-full overflow-hidden ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Reaction Header */}
        <div className="text-center mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800">{reaction.text}</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 items-start w-full">
          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 relative group">
            <img src={currentDisplayImage} alt={currentResult.itemName} className="w-full h-full object-cover transition-opacity" />
            {isGreatFind && (
              <div className="absolute top-4 left-4 bg-amber-400 text-amber-900 text-xs font-semibold px-3 py-1 rounded-full">
                Great Find
              </div>
            )}
            <div className="absolute top-4 right-4 bg-black/40 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
              {currentResult.category}
            </div>

            {/* Navigation arrows - only show if multiple images */}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-10 sm:h-10 bg-black/40 hover:bg-black/70 active:bg-black/80 text-white rounded-full flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm touch-manipulation min-h-[44px] min-w-[44px]"
                  aria-label="Previous image"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-10 sm:h-10 bg-black/40 hover:bg-black/70 active:bg-black/80 text-white rounded-full flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm touch-manipulation min-h-[44px] min-w-[44px]"
                  aria-label="Next image"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Image counter and dots */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <div className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">
                  {currentImageIndex + 1} / {allImages.length}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col h-full w-full min-w-0 result-card-content">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900">{currentResult.itemName}</h2>
            {currentResult.author && currentResult.author.toLowerCase() !== 'n/a' && (
              <p className="text-base sm:text-lg text-slate-600 -mt-1">by {currentResult.author}</p>
            )}
            <p className="text-base sm:text-lg text-slate-500 mt-1">{currentResult.era}</p>

            {/* Value Change Notification */}
            {valueChange && (
              <div className="my-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
                <div className="flex items-center gap-2 text-amber-800">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="font-semibold">Value Updated!</span>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  Previous: {formatCurrency(valueChange.previous.low)} - {formatCurrency(valueChange.previous.high)}
                </p>
              </div>
            )}

            {/* Value Card */}
            <div className="my-4 sm:my-6 p-4 sm:p-6 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider opacity-90">Estimated Value</p>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black mt-1">
                {formatCurrency(currentResult.priceRange.low)} - {formatCurrency(currentResult.priceRange.high)}
              </p>

              {/* Fun Comparison */}
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm opacity-90">
                  That's about <span className="font-bold">{comparison.count} {comparison.text}</span>
                </p>
              </div>
            </div>

            {/* Collection Opportunity Banner - Stewart's Smart Suggestion */}
            {currentResult.collectionOpportunity?.isPartOfSet && (
              <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 relative overflow-hidden">
                {/* Sparkle decoration */}
                <div className="absolute top-2 right-2 text-amber-400">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3L9.5 8.5L4 11l5.5 2.5L12 19l2.5-5.5L20 11l-5.5-2.5z"/>
                  </svg>
                </div>

                <div className="flex items-start gap-3">
                  {/* Stewart Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-white text-lg font-bold">S</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-amber-900">Stewart says...</span>
                      <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">Collection Found!</span>
                    </div>

                    <p className="text-amber-800 text-sm mb-2">
                      {currentResult.collectionOpportunity.userQuestion ||
                       `This looks like it's part of "${currentResult.collectionOpportunity.setName}"! Do you have more items from this collection?`}
                    </p>

                    {currentResult.collectionOpportunity.completeSetValueRange && (
                      <p className="text-xs text-amber-700 mb-3">
                        A complete set of {currentResult.collectionOpportunity.totalItemsInSet} items could be worth{' '}
                        <span className="font-bold">
                          {formatCurrency(currentResult.collectionOpportunity.completeSetValueRange.low)} - {formatCurrency(currentResult.collectionOpportunity.completeSetValueRange.high)}
                        </span>!
                      </p>
                    )}

                    {user && isPro ? (
                      <button
                        onClick={() => setShowChat(true)}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center gap-2 text-sm shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Chat with Stewart
                      </button>
                    ) : user ? (
                      <div className="text-xs text-amber-700 bg-amber-100 px-3 py-2 rounded-lg inline-block">
                        Upgrade to Pro to chat with Stewart about your collection
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsSignInModalOpen(true)}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center gap-2 text-sm shadow-md"
                      >
                        Sign in to explore your collection
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              {/* Add Photos Button - only show if logged in */}
              {user && (
                <button
                  onClick={() => setShowAddPhotos(true)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 touch-manipulation min-h-[48px]"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Photos
                </button>
              )}

              {/* Share Button */}
              <button
                onClick={handleShare}
                className={`${user ? 'flex-1' : 'w-full'} bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 touch-manipulation min-h-[48px]`}
              >
                {copied ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </>
                )}
              </button>
            </div>

            {/* Visibility Toggle - only show if logged in */}
            {user && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-4 border border-slate-200">
                <div className="flex items-center gap-2">
                  {isPublic ? (
                    <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                  <div>
                    <span className="text-sm font-medium text-slate-700">
                      {isPublic ? 'Public' : 'Private'}
                    </span>
                    <p className="text-xs text-slate-500">
                      {isPublic ? 'Anyone can see this treasure' : 'Only you can see this'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleVisibility}
                  disabled={isTogglingVisibility}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    isTogglingVisibility
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : isPublic
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                        : 'bg-teal-500 hover:bg-teal-600 text-white'
                  }`}
                >
                  {isTogglingVisibility ? 'Updating...' : isPublic ? 'Make Private' : 'Make Public'}
                </button>
              </div>
            )}

            {/* Chat Button - Pro Feature */}
            {user && isPro && (
              <button
                onClick={() => setShowChat(true)}
                className="w-full mb-4 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 active:from-violet-700 active:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 touch-manipulation min-h-[48px]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat about this item
              </button>
            )}

            {/* Chat Teaser for non-Pro users */}
            {user && !isPro && (
              <div className="w-full mb-4 p-3 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-sm text-violet-700 font-medium">AI Chat</span>
                  </div>
                  <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded font-medium">Pro</span>
                </div>
              </div>
            )}

            {!user && (
              <div className="mb-6 p-4 rounded-lg bg-teal-50 border border-teal-200 text-center">
                <h4 className="font-bold text-teal-800">Like what you see?</h4>
                <p className="text-sm text-teal-700 mt-1">Sign in to save this appraisal and build your collection.</p>
                <button onClick={() => setIsSignInModalOpen(true)} className="mt-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                  Sign in
                </button>
              </div>
            )}

            <div className="space-y-4 text-slate-600 flex-grow">
              <div>
                <h4 className="font-semibold text-slate-800">AI-Generated Description</h4>
                <p className="whitespace-pre-wrap overflow-wrap-anywhere">{currentResult.description}</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Valuation Rationale</h4>
                <p className="whitespace-pre-wrap overflow-wrap-anywhere">{currentResult.reasoning}</p>
              </div>

              {/* Care & Preservation Tips */}
              {currentResult.careTips && currentResult.careTips.length > 0 && (
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                  <h4 className="font-semibold text-emerald-800 flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Care & Preservation Tips
                  </h4>
                  <ul className="space-y-2">
                    {currentResult.careTips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-emerald-700">
                        <span className="w-5 h-5 bg-emerald-200 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sources & Verification Section */}
              {currentResult.references && currentResult.references.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Sources & Verification
                  </h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Our AI valuation is based on real market data from these trusted sources:
                  </p>
                  <div className="space-y-2">
                    {currentResult.references.map((ref, index) => (
                      <a
                        key={index}
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-sm text-slate-700 transition-all group"
                      >
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span className="flex-1 font-medium truncate">{ref.title}</span>
                        <svg className="w-3 h-3 text-slate-400 group-hover:text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Values based on recent sales data, auction results, and market trends
                  </p>
                </div>
              )}

              {/* Get Expert Opinion Section */}
              <div>
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Want a Second Opinion?
                </h4>
                <p className="text-sm text-slate-500 mb-3">
                  Get a professional appraisal from trusted experts:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(currentResult.itemName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm text-slate-700 transition-colors"
                  >
                    <span className="font-medium">Search eBay</span>
                    <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <a
                    href="https://www.valuemystuff.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm text-slate-700 transition-colors"
                  >
                    <span className="font-medium">ValueMyStuff</span>
                    <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <a
                    href="https://www.ha.com/free-auction-appraisal.s"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm text-slate-700 transition-colors"
                  >
                    <span className="font-medium">Heritage Auctions</span>
                    <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <a
                    href="https://www.mearto.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm text-slate-700 transition-colors"
                  >
                    <span className="font-medium">Mearto</span>
                    <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            <button
              onClick={onStartNew}
              className="mt-6 sm:mt-8 w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 active:from-teal-700 active:to-emerald-700 text-white font-black py-4 px-6 rounded-xl text-base sm:text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 touch-manipulation min-h-[48px]"
            >
              <SparklesIcon />
              Appraise Another Item
            </button>
          </div>
        </div>
      </div>

      {/* Add Photos Modal */}
      {showAddPhotos && (
        <AddPhotosModal
          appraisalId={currentResult.id}
          currentImageCount={imageCount}
          onClose={() => setShowAddPhotos(false)}
          onSuccess={handleAddPhotosSuccess}
          collectionContext={currentResult.collectionOpportunity ? {
            isPartOfSet: currentResult.collectionOpportunity.isPartOfSet,
            setName: currentResult.collectionOpportunity.setName,
            photographyTips: currentResult.collectionOpportunity.photographyTips,
            totalItemsInSet: currentResult.collectionOpportunity.totalItemsInSet,
          } : undefined}
        />
      )}

      {/* Chat Modal */}
      {showChat && user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg h-[600px] max-h-[80vh]">
            <ChatInterface
              userId={user.id}
              appraisalId={currentResult.id}
              appraisalContext={currentResult}
              onClose={() => setShowChat(false)}
              onAddToCollection={() => {
                // Close chat and open add photos modal for collection items
                setShowChat(false);
                setShowAddPhotos(true);
              }}
            />
          </div>
        </div>
      )}

      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        onSelectProvider={handleSelectProvider}
      />
    </>
  );
};
