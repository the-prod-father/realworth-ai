
'use client';

import React, { useState, useMemo, useContext, useEffect } from 'react';
import { AppraisalForm } from '@/components/AppraisalForm';
import { Header } from '@/components/Header';
import { AppraisalResult, AppraisalRequest, CollectionSummary } from '@/lib/types';
import { useAppraisal } from '@/hooks/useAppraisal';
import { Loader } from '@/components/Loader';
import { ResultCard } from '@/components/ResultCard';
import { HistoryList } from '@/components/HistoryList';
import { SparklesIcon, GemIcon } from '@/components/icons';
import { GamificationStats } from '@/components/GamificationStats';
import { Achievements } from '@/components/Achievements';
import { DailyChallenges } from '@/components/DailyChallenges';
import { ScanMode } from '@/components/ScanMode';
import { AuthContext } from '@/components/contexts/AuthContext';
import { dbService } from '@/services/dbService';
import { collectionService } from '@/services/collectionService';
import { useScanQueue } from '@/hooks/useScanQueue';
import { ScanQueue } from '@/components/ScanQueue';

type View = 'HOME' | 'FORM' | 'LOADING' | 'RESULT' | 'SCAN';

export default function Home() {
  const [view, setView] = useState<View>('HOME');
  const [history, setHistory] = useState<AppraisalResult[]>([]);
  const [archivedHistory, setArchivedHistory] = useState<AppraisalResult[]>([]);
  const [currentResult, setCurrentResult] = useState<AppraisalResult | null>(null);
  const [streaks, setStreaks] = useState({ currentStreak: 0, longestStreak: 0 });
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const { getAppraisal, isLoading, error } = useAppraisal();
  const { user, isAuthLoading } = useContext(AuthContext);

  // Queue system for bulk scanning
  const scanQueue = useScanQueue({
    onItemComplete: (item) => {
      console.log('Scan completed:', item.id);
    },
    onItemError: (item, error) => {
      console.error('Scan error:', item.id, error);
    },
    maxConcurrent: 2, // Process 2 items at a time
  });

  // Process items from queue
  useEffect(() => {
    if (!user) return;

    const processItem = async (imageData: string) => {
      // Convert base64 to File for the appraisal API
      const response = await fetch(imageData);
      const blob = await response.blob();
      const file = new File([blob], 'scan-capture.jpg', { type: 'image/jpeg' });

      const result = await getAppraisal({
        files: [file],
        condition: 'Good' // Default condition for scan mode
      });

      if (!result || !result.appraisalData || !result.imageDataUrl) {
        throw new Error('Failed to get appraisal result');
      }

      const allImages = [
        ...(result.imageUrls || []),
        result.imageDataUrl
      ].filter((url, index, self) => self.indexOf(url) === index);

      const newResult = {
        ...result.appraisalData,
        id: Date.now().toString(),
        image: result.imageDataUrl,
        images: allImages
      };

      const savedAppraisal = await dbService.saveAppraisal(user.id, newResult);
      if (savedAppraisal) {
        // Use functional update to prevent race conditions with concurrent saves
        setHistory(prev => {
          // Check if already exists (prevent duplicates)
          if (prev.some(item => item.id === savedAppraisal.id)) {
            return prev;
          }
          return [savedAppraisal, ...prev];
        });
        // Update streaks (non-blocking)
        dbService.getUserStreaks(user.id).then(setStreaks).catch(err => {
          console.error('Error updating streaks:', err);
          // Don't fail the entire operation if streak update fails
        });
        return savedAppraisal;
      }

      throw new Error('Failed to save appraisal to database');
    };

    // Process queue items when there are pending items and capacity
    const pendingCount = scanQueue.stats.pending;
    const processingCount = scanQueue.stats.processing;
    
    if (pendingCount > 0 && processingCount < 2) {
      scanQueue.processNext(processItem);
    }
  }, [scanQueue.stats.pending, scanQueue.stats.processing, user, getAppraisal, scanQueue.processNext]);

  // Handle scan mode capture - add to queue instead of processing immediately
  const handleScanCapture = (imageData: string) => {
    if (!user) return;
    scanQueue.addToQueue(imageData);
  };

  // Load history, streaks, and collections from database when user logs in
  useEffect(() => {
    if (user && !isAuthLoading) {
      dbService.getHistory(user.id).then(setHistory);
      dbService.getArchivedHistory(user.id).then(setArchivedHistory);
      dbService.getUserStreaks(user.id).then(setStreaks);
      collectionService.getCollections(user.id).then(setCollections);
    } else if (!user && !isAuthLoading) {
      setHistory([]);
      setArchivedHistory([]);
      setStreaks({ currentStreak: 0, longestStreak: 0 });
      setCollections([]);
    }
  }, [user, isAuthLoading]);

  // Reload histories when archive status changes
  const handleArchiveChange = () => {
    if (user) {
      dbService.getHistory(user.id).then(setHistory);
      dbService.getArchivedHistory(user.id).then(setArchivedHistory);
    }
  };

  const handleAppraisalRequest = async (request: AppraisalRequest) => {
    setView('LOADING');
    const result = await getAppraisal(request);
    if (result && result.appraisalData && result.imageDataUrl) {
      // Combine all images: uploaded images + result image
      const allImages = [
        ...(result.imageUrls || []),
        result.imageDataUrl
      ].filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates

      const newResult = {
        ...result.appraisalData,
        id: Date.now().toString(),
        image: result.imageDataUrl,
        images: allImages
      };
      setCurrentResult(newResult);
      // If user is logged in, save to database immediately
      if (user) {
        // Prepare collection data if adding to a collection
        const collectionData = request.collectionId ? {
          collectionId: request.collectionId,
          seriesIdentifier: result.validation?.seriesIdentifier,
          validationStatus: result.validation?.status,
          validationNotes: result.validation?.notes,
        } : undefined;

        const savedAppraisal = await dbService.saveAppraisal(user.id, newResult, collectionData);
        if (savedAppraisal) {
          // Add the saved appraisal (with DB-generated ID) to history
          setHistory(prev => [savedAppraisal, ...prev]);
          // Refresh streaks after new appraisal
          dbService.getUserStreaks(user.id).then(setStreaks);
          // Refresh collections if we added to one
          if (request.collectionId) {
            collectionService.getCollections(user.id).then(setCollections);
          }
        } else {
          // Show error if save failed
          console.error('Failed to save appraisal to database');
          alert('Your appraisal was generated but failed to save. Please try again or contact support.');
        }
      }
      setView('RESULT');
    } else {
      setView('FORM');
    }
  };

  const handleStartNew = () => {
    setCurrentResult(null);
    setView('FORM');
  };
  
  const handleSelectHistoryItem = (item: AppraisalResult) => {
    setCurrentResult(item);
    setView('RESULT');
  }

  const { totalValue, itemCount } = useMemo(() => {
    const total = history.reduce((acc, item) => acc + (item.priceRange.high + item.priceRange.low) / 2, 0);
    return { totalValue: total, itemCount: history.length };
  }, [history]);

  const renderView = () => {
    switch (view) {
      case 'LOADING':
        return <Loader />;
      case 'FORM':
        return <AppraisalForm onSubmit={handleAppraisalRequest} isLoading={isLoading} error={error} collections={collections} />;
      case 'RESULT':
        return currentResult && <ResultCard result={currentResult} onStartNew={handleStartNew} setHistory={setHistory} />;
      case 'SCAN':
        return null; // ScanMode is rendered as overlay
      case 'HOME':
      default:
        return (
          <div className="text-center p-8">
            <div className="mb-8">
              <h1 className="text-5xl md:text-6xl font-black mb-4 text-slate-900">
                Turn Clutter into <span className="gradient-text">Cash</span>!
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                It's a win-win! Declutter your home and discover hidden treasures. Snap a photo to see what your items are worth. It's fun, easy, and you might just find a fortune!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setView('FORM')}
                className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-8 rounded-full text-xl transition-transform transform hover:scale-105 shadow-lg shadow-teal-500/30 inline-flex items-center gap-3"
              >
                <SparklesIcon />
                Start Appraisal
              </button>
              {user && (
                <button
                  onClick={() => setView('SCAN')}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-8 rounded-full text-xl transition-transform transform hover:scale-105 shadow-lg shadow-slate-800/30 inline-flex items-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Scan Mode
                </button>
              )}
            </div>
            {user && (
              <p className="text-sm text-slate-500 mt-4">
                Scan Mode: Auto-detect and bulk scan items with AI
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="w-full bg-white rounded-2xl shadow-lg mb-8">
          {renderView()}
        </div>

      {/* Scan Mode Overlay */}
      {view === 'SCAN' && (
        <>
          <ScanMode
            onCapture={handleScanCapture}
            onClose={() => setView('HOME')}
            isProcessing={scanQueue.stats.processing > 0}
          />
          {/* Queue status overlay - only show when there are items */}
          {scanQueue.stats.total > 0 && (
            <ScanQueue
              queue={scanQueue.queue}
              stats={scanQueue.stats}
              onClearCompleted={scanQueue.clearCompleted}
              onRemoveItem={scanQueue.removeItem}
            />
          )}
        </>
      )}
        {user && (
          <>
            {history.length > 0 ? (
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
                <Achievements history={history} />
                <HistoryList
                  history={history}
                  onSelect={handleSelectHistoryItem}
                  userId={user.id}
                  onUpdate={(updatedItem) => {
                    setHistory(prev => prev.map(item =>
                      item.id === updatedItem.id ? updatedItem : item
                    ));
                  }}
                  archivedHistory={archivedHistory}
                  onArchiveChange={handleArchiveChange}
                />
              </>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <GemIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Your Collection is Empty</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm">
                  Start discovering hidden treasures. Snap photos of items around your home to find out what they're worth.
                </p>
                <button
                  onClick={() => setView('FORM')}
                  className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2.5 px-5 rounded-lg transition-colors"
                >
                  Find Your First Treasure
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="text-center p-4 text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} RealWorth.ai. All rights reserved.</p>
      </footer>
    </>
  );
}
