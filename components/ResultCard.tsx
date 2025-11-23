
'use client';

import React, { useContext, useEffect, useState, useRef } from 'react';
import { AppraisalResult } from '@/lib/types';
import { SparklesIcon } from './icons';
import { AuthContext } from './contexts/AuthContext';
import { Confetti } from './Confetti';
import { getValueReaction, getFunComparison, shouldCelebrate, getShareText } from '@/lib/funComparisons';
import { AddPhotosModal } from './AddPhotosModal';

interface ResultCardProps {
  result: AppraisalResult;
  onStartNew: () => void;
  setHistory: React.Dispatch<React.SetStateAction<AppraisalResult[]>>;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, onStartNew, setHistory }) => {
  const { user, signIn } = useContext(AuthContext);
  const [showConfetti, setShowConfetti] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAddPhotos, setShowAddPhotos] = useState(false);
  const [currentResult, setCurrentResult] = useState(result);
  const [valueChange, setValueChange] = useState<{ previous: { low: number; high: number }; new: { low: number; high: number } } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const hasCelebratedRef = useRef<string | null>(null);

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

  // Trigger confetti on mount for valuable items (only once per result)
  useEffect(() => {
    if (celebrate && hasCelebratedRef.current !== result.id) {
      hasCelebratedRef.current = result.id;
      setShowConfetti(true);
      // Reset showConfetti after animation completes to prevent re-triggering
      setTimeout(() => setShowConfetti(false), 3500);
    }
  }, [celebrate, result.id]);

  // Effect to auto-save the current appraisal once the user signs in
  useEffect(() => {
    if (user) {
      setHistory(prevHistory => {
        if (!prevHistory.some(item => item.id === result.id)) {
          return [result, ...prevHistory];
        }
        return prevHistory;
      });
    }
  }, [user, result, setHistory]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: result.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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

      // Update history
      setHistory(prev => prev.map(item =>
        item.id === currentResult.id ? updatedResult : item
      ));

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

      <div className="p-6 sm:p-8">
        {/* Reaction Header */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-slate-800">{reaction.text}</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
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
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
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

          <div className="flex flex-col h-full">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">{currentResult.itemName}</h2>
            {currentResult.author && currentResult.author.toLowerCase() !== 'n/a' && (
              <p className="text-lg text-slate-600 -mt-1">by {currentResult.author}</p>
            )}
            <p className="text-lg text-slate-500 mt-1">{currentResult.era}</p>

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
            <div className="my-6 p-6 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white">
              <p className="text-sm font-semibold uppercase tracking-wider opacity-90">Estimated Value</p>
              <p className="text-4xl sm:text-5xl font-black mt-1">
                {formatCurrency(currentResult.priceRange.low)} - {formatCurrency(currentResult.priceRange.high)}
              </p>

              {/* Fun Comparison */}
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm opacity-90">
                  That's about <span className="font-bold">{comparison.count} {comparison.text}</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-4">
              {/* Add Photos Button - only show if logged in */}
              {user && (
                <button
                  onClick={() => setShowAddPhotos(true)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
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
                className={`${user ? 'flex-1' : 'w-full'} bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2`}
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

            {!user && (
              <div className="mb-6 p-4 rounded-lg bg-teal-50 border border-teal-200 text-center">
                <h4 className="font-bold text-teal-800">Like what you see?</h4>
                <p className="text-sm text-teal-700 mt-1">Sign in to save this appraisal and build your collection.</p>
                <button onClick={signIn} className="mt-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                  Sign in with Google
                </button>
              </div>
            )}

            <div className="space-y-4 text-slate-600 flex-grow">
              <div>
                <h4 className="font-semibold text-slate-800">AI-Generated Description</h4>
                <p className="whitespace-pre-wrap">{currentResult.description}</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Valuation Rationale</h4>
                <p className="whitespace-pre-wrap">{currentResult.reasoning}</p>
              </div>
              {currentResult.references && currentResult.references.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Price References
                  </h4>
                  <p className="text-sm text-slate-500 mb-2">
                    Our AI found these sources to support the estimated value:
                  </p>
                  <ul className="space-y-2">
                    {currentResult.references.map((ref, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-teal-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                        >
                          {ref.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={onStartNew}
              className="mt-8 w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all flex items-center justify-center gap-2"
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
        />
      )}
    </>
  );
};
