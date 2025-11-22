
'use client';

import React, { useState, useMemo, useContext, useEffect } from 'react';
import { AppraisalForm } from '@/components/AppraisalForm';
import { Header } from '@/components/Header';
import { AppraisalResult, AppraisalRequest } from '@/lib/types';
import { useAppraisal } from '@/hooks/useAppraisal';
import { Loader } from '@/components/Loader';
import { ResultCard } from '@/components/ResultCard';
import { HistoryList } from '@/components/HistoryList';
import { SparklesIcon } from '@/components/icons';
import { GamificationStats } from '@/components/GamificationStats';
import { AuthContext } from '@/components/contexts/AuthContext';
import { dbService } from '@/services/dbService';

type View = 'HOME' | 'FORM' | 'LOADING' | 'RESULT';

export default function Home() {
  const [view, setView] = useState<View>('HOME');
  const [history, setHistory] = useState<AppraisalResult[]>([]);
  const [currentResult, setCurrentResult] = useState<AppraisalResult | null>(null);
  const { getAppraisal, isLoading, error } = useAppraisal();
  const { user, isAuthLoading } = useContext(AuthContext);

  // Load history from database when user logs in or on initial load
  useEffect(() => {
    if (user && !isAuthLoading) {
      dbService.getHistory(user.id).then(setHistory);
    } else if (!user && !isAuthLoading) {
      setHistory([]); // Clear history on logout
    }
  }, [user, isAuthLoading]);

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
        const savedAppraisal = await dbService.saveAppraisal(user.id, newResult);
        if (savedAppraisal) {
          // Add the saved appraisal (with DB-generated ID) to history
          setHistory(prev => [savedAppraisal, ...prev]);
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
        return <AppraisalForm onSubmit={handleAppraisalRequest} isLoading={isLoading} error={error} />;
      case 'RESULT':
        return currentResult && <ResultCard result={currentResult} onStartNew={handleStartNew} setHistory={setHistory} />;
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
            <button
              onClick={() => setView('FORM')}
              className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-8 rounded-full text-xl transition-transform transform hover:scale-105 shadow-lg shadow-teal-500/30 inline-flex items-center gap-3"
            >
              <SparklesIcon />
              Start Your First Appraisal
            </button>
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
        {user && history.length > 0 && (
          <>
            <GamificationStats itemCount={itemCount} totalValue={totalValue} currency={history[0]?.currency || 'USD'} />
            <HistoryList
              history={history}
              onSelect={handleSelectHistoryItem}
              userId={user.id}
              onUpdate={(updatedItem) => {
                setHistory(prev => prev.map(item =>
                  item.id === updatedItem.id ? updatedItem : item
                ));
              }}
            />
          </>
        )}
      </main>
      <footer className="text-center p-4 text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} RealWorth.ai. All rights reserved.</p>
      </footer>
    </>
  );
}
