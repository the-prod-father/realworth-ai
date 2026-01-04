
'use client';

import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AppraisalForm } from '@/components/AppraisalForm';
import { Header } from '@/components/Header';
import { AppraisalResult, AppraisalRequest } from '@/lib/types';
import { useAppraisal } from '@/hooks/useAppraisal';
import { useQueue } from '@/hooks/useQueue';
import { Loader } from '@/components/Loader';
import { ResultCard } from '@/components/ResultCard';
import { CelebrationScreen } from '@/components/CelebrationScreen';
import { HomeFeed } from '@/components/HomeFeed';
import { SparklesIcon } from '@/components/icons';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { AuthContext } from '@/components/contexts/AuthContext';
import { AppraisalContext } from '@/components/contexts/AppraisalContext';
import { SignInModal } from '@/components/SignInModal';
import { dbService } from '@/services/dbService';
import { useSubscription } from '@/hooks/useSubscription';
import UpgradeModal from '@/components/UpgradeModal';
import UsageMeter from '@/components/UsageMeter';
import { SurveyModal } from '@/components/SurveyModal';
import { useSurvey } from '@/hooks/useSurvey';
import { QueueStatus } from '@/components/QueueStatus';
import { FREE_APPRAISAL_LIMIT } from '@/lib/constants';
import { AuthProvider } from '@/services/authService';
import { trackLogin } from '@/lib/analytics';

type View = 'HOME' | 'FORM' | 'LOADING' | 'CELEBRATION' | 'RESULT';

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  isNewDay: boolean;
  streakIncreased: boolean;
  streakBroken: boolean;
}

export default function Home() {
  const [view, setView] = useState<View>('HOME');
  const { appraisals: history, addAppraisal, updateAppraisal, refreshAppraisals, clearAppraisals } = useContext(AppraisalContext);
  const [currentResult, setCurrentResult] = useState<AppraisalResult | null>(null);
  const [isFromHistory, setIsFromHistory] = useState(false);
  const [streaks, setStreaks] = useState({ currentStreak: 0, longestStreak: 0 });
  // Celebration screen state
  const [celebrationStreakInfo, setCelebrationStreakInfo] = useState<StreakInfo | null>(null);
  const [triviaPointsEarned, setTriviaPointsEarned] = useState(0);
  const [celebrationItemName, setCelebrationItemName] = useState<string>('');
  const [celebrationValue, setCelebrationValue] = useState<number>(0);
  const [celebrationCurrency, setCelebrationCurrency] = useState<string>('USD');
  const { getAppraisal, isLoading, error } = useAppraisal();
  const { user, isAuthLoading, signInWithProvider } = useContext(AuthContext);
  const { isPro, isVerifying, usageCount, checkCanAppraise, refresh: refreshSubscription, verifySubscriptionActive } = useSubscription(user?.id || null, user?.email);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  const handleSelectProvider = async (provider: AuthProvider) => {
    setIsSignInModalOpen(false);
    trackLogin(provider);
    await signInWithProvider(provider);
  };

  // Handle queue item completion - show celebration
  const handleQueueItemComplete = useCallback((item: { id: string; appraisalId: string | null; itemName: string; value: number; currency: string }) => {
    console.log('[Queue] Item completed:', item);
    // Refresh history to include new appraisal
    if (user) {
      refreshAppraisals(user.id);
      dbService.getUserStreaks(user.id).then(setStreaks);
      // Note: incrementUsage() removed - server-side increment in /api/appraise handles this
      refreshSubscription();
    }
    // Show celebration for completed item
    setCelebrationItemName(item.itemName);
    setCelebrationValue(item.value);
    setCelebrationCurrency(item.currency);
    setView('CELEBRATION');
  }, [user, refreshSubscription, refreshAppraisals]);

  // Queue system for async processing
  const { items: queueItems, stats: queueStats } = useQueue({
    userId: user?.id,
    onItemComplete: handleQueueItemComplete,
    pollInterval: 3000,
  });

  // Survey system - triggers after certain appraisal counts
  const { activeSurvey, checkForSurvey, dismissSurvey, completeSurvey } = useSurvey({
    userId: user?.id,
    appraisalCount: history.length,
  });

  // Load history and streaks from database when user logs in
  useEffect(() => {
    if (user && !isAuthLoading) {
      refreshAppraisals(user.id);
      dbService.getUserStreaks(user.id).then(setStreaks);
    } else if (!user && !isAuthLoading) {
      clearAppraisals();
      setStreaks({ currentStreak: 0, longestStreak: 0 });
    }
  }, [user, isAuthLoading, refreshAppraisals, clearAppraisals]);

  // Check for subscription success from Stripe redirect
  // Uses verification loop to poll until subscription is confirmed active
  // IMPORTANT: Must wait for auth to load before processing, otherwise userId is null
  const [pendingSubscriptionSuccess, setPendingSubscriptionSuccess] = useState(false);

  // Step 1: Detect subscription success and store it (runs once on mount)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      console.log('[Subscription] Checkout success detected, storing for verification...');
      setPendingSubscriptionSuccess(true);
      // Clear URL params immediately to prevent re-triggering on refresh
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Step 2: Process subscription success after auth is ready
  useEffect(() => {
    // Wait for auth to finish loading
    if (isAuthLoading) {
      console.log('[Subscription] Waiting for auth to load...');
      return;
    }

    // Only process if we have a pending success and a user
    if (!pendingSubscriptionSuccess) return;

    if (!user) {
      console.warn('[Subscription] No user after auth loaded - cannot verify subscription');
      setPendingSubscriptionSuccess(false);
      return;
    }

    console.log('[Subscription] Auth ready, starting subscription verification for user:', user.id);
    setPendingSubscriptionSuccess(false);

    // Start verification loop - polls DB until subscription is active
    verifySubscriptionActive().then((verified) => {
      if (verified) {
        console.log('[Subscription] Pro subscription verified and UI updated!');
      } else {
        console.warn('[Subscription] Verification timed out - user may need to refresh');
        // Final fallback refresh
        refreshSubscription();
      }
    });
  }, [isAuthLoading, user, pendingSubscriptionSuccess, verifySubscriptionActive, refreshSubscription]);

  // Check for ?capture=true to auto-open capture form
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('capture') === 'true') {
      setView('FORM');
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Show upgrade modal with specific feature
  const promptUpgrade = (feature?: string) => {
    setUpgradeFeature(feature);
    setShowUpgradeModal(true);
  };

  const handleAppraisalRequest = async (request: AppraisalRequest) => {
    // Check if user can create appraisal (for logged-in users)
    if (user) {
      const { canCreate } = await checkCanAppraise();
      if (!canCreate) {
        promptUpgrade('Unlimited Appraisals');
        return;
      }
    }

    // Synchronous flow: Upload → Process → Show Result
    setView('LOADING');
    setIsFromHistory(false);

    try {
      const result = await getAppraisal(request);

      if (result) {
        // Build the appraisal result object
        const allImages = result.imageUrls || [];
        const appraisalResult: AppraisalResult = {
          id: crypto.randomUUID(),
          image: result.imageDataUrl,
          images: allImages.length > 0 ? [...allImages, result.imageDataUrl] : [result.imageDataUrl],
          itemName: result.appraisalData.itemName,
          author: result.appraisalData.author,
          era: result.appraisalData.era,
          category: result.appraisalData.category,
          description: result.appraisalData.description,
          priceRange: result.appraisalData.priceRange,
          currency: result.appraisalData.currency,
          reasoning: result.appraisalData.reasoning,
          references: result.appraisalData.references,
          confidenceScore: result.appraisalData.confidenceScore,
          confidenceFactors: result.appraisalData.confidenceFactors,
          timestamp: Date.now(),
        };

        // Save to database if user is logged in
        if (user) {
          const savedResult = await dbService.saveAppraisal(user.id, appraisalResult);
          if (savedResult) {
            appraisalResult.id = savedResult.id;
            // Optimistically add to global context immediately
            addAppraisal(savedResult);
          }
          // Also refresh to ensure sync, and update streaks
          setStreaks(await dbService.getUserStreaks(user.id));
          // Note: incrementUsage() removed - server-side increment in /api/appraise handles this
          refreshSubscription();
        }

        // Set up celebration
        setCurrentResult(appraisalResult);
        const avgValue = (appraisalResult.priceRange.low + appraisalResult.priceRange.high) / 2;
        setCelebrationItemName(appraisalResult.itemName);
        setCelebrationValue(avgValue);
        setCelebrationCurrency(appraisalResult.currency);

        // Store streak info if returned
        if (result.streakInfo) {
          setCelebrationStreakInfo(result.streakInfo);
        }

        // Show celebration screen
        setView('CELEBRATION');
      } else {
        // Error - stay on form to show error message
        setView('FORM');
      }
    } catch (e) {
      console.error('[Appraisal] Error:', e);
      setView('FORM');
    }
  };

  const handleStartNew = () => {
    setCurrentResult(null);
    setCelebrationStreakInfo(null);
    setTriviaPointsEarned(0);
    setView('FORM');
  };

  // Handler for trivia points earned during loading
  const handleTriviaPoints = (points: number) => {
    setTriviaPointsEarned(prev => prev + points);
  };

  // Handler for continuing from celebration - show the result
  const handleCelebrationContinue = () => {
    // Show the result after celebration
    if (currentResult) {
      setView('RESULT');
    } else {
      // Fallback to form if no result
      setView('FORM');
    }
    // Reset celebration state
    setCelebrationItemName('');
    setCelebrationValue(0);
    setCelebrationCurrency('USD');
  };
  
  const handleSelectHistoryItem = (item: AppraisalResult) => {
    setIsFromHistory(true);
    setCurrentResult(item);
    setView('RESULT');
  }

  const renderView = () => {
    switch (view) {
      case 'LOADING':
        return <Loader onPointsEarned={handleTriviaPoints} />;
      case 'CELEBRATION':
        // Queue-based celebration uses dedicated state variables
        if (celebrationItemName) {
          return (
            <CelebrationScreen
              itemName={celebrationItemName}
              value={celebrationValue}
              currency={celebrationCurrency}
              streakInfo={celebrationStreakInfo}
              triviaPoints={triviaPointsEarned}
              onContinue={handleCelebrationContinue}
            />
          );
        }
        // Fallback for legacy sync mode (if currentResult exists)
        if (currentResult) {
          const avgValue = (currentResult.priceRange.low + currentResult.priceRange.high) / 2;
          return (
            <CelebrationScreen
              itemName={currentResult.itemName}
              value={avgValue}
              currency={currentResult.currency}
              streakInfo={celebrationStreakInfo}
              triviaPoints={triviaPointsEarned}
              onContinue={handleCelebrationContinue}
            />
          );
        }
        return null;
      case 'FORM':
        return <AppraisalForm onSubmit={handleAppraisalRequest} isLoading={isLoading} error={error} />;
      case 'RESULT':
        return currentResult && <ResultCard result={currentResult} onStartNew={handleStartNew} isFromHistory={isFromHistory} />;
      case 'HOME':
      default:
        return (
          <div className="text-center p-4 sm:p-6 md:p-8">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 text-slate-900 px-2">
                Turn Clutter into <span className="gradient-text">Cash</span>!
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto px-4">
                It's a win-win! Declutter your home and discover hidden treasures. Snap a photo to see what your items are worth. It's fun, easy, and you might just find a fortune!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
              <Button
                onClick={() => {
                  if (!user) {
                    setIsSignInModalOpen(true);
                  } else {
                    setView('FORM');
                  }
                }}
                size="xl"
                className="w-full sm:w-auto"
              >
                <SparklesIcon />
                {user ? 'Start Appraisal' : 'Sign in to Start'}
              </Button>
            </div>
            {/* Mobile upgrade button - visible only on mobile where header button is hidden */}
            {user && !isPro && (
              <Button
                onClick={() => promptUpgrade()}
                variant="premium"
                className="sm:hidden mt-6"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Upgrade to Pro - $19.99/mo
              </Button>
            )}
          </div>
        );
    }
  };

  return (
    <>
      <Header onUpgradeClick={() => promptUpgrade()} />
      <main className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="w-full bg-white rounded-2xl shadow-lg mb-8 overflow-hidden">
          {renderView()}
        </div>

        {/* Usage meter for free logged-in users */}
        {user && !isPro && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <UsageMeter
              used={usageCount}
              limit={FREE_APPRAISAL_LIMIT}
              isPro={isPro}
              onUpgrade={() => promptUpgrade()}
            />
          </div>
        )}

        {/* HomeFeed - Discover & My Treasures tabs */}
        <HomeFeed
          userHistory={history}
          isLoggedIn={!!user}
          onSelectItem={handleSelectHistoryItem}
        />
      </main>
      <Footer />

      {/* Queue Status - floating indicator for background processing */}
      {user && (
        <QueueStatus
          items={queueItems}
          stats={queueStats}
          onViewResult={(appraisalId) => {
            // Find the appraisal in history and show it
            const item = history.find(h => h.id === appraisalId);
            if (item) {
              handleSelectHistoryItem(item);
            }
          }}
        />
      )}

      {/* Upgrade Modal */}
      {user && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          userId={user.id}
          userEmail={user.email}
          userName={user.name}
          feature={upgradeFeature}
        />
      )}

      {/* Survey Modal */}
      {activeSurvey && (
        <SurveyModal
          survey={activeSurvey}
          userId={user?.id}
          appraisalCount={history.length}
          onComplete={completeSurvey}
          onDismiss={dismissSurvey}
        />
      )}

      {/* Sign In Modal */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        onSelectProvider={handleSelectProvider}
      />
    </>
  );
}