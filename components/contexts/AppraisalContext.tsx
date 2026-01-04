'use client';

import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { AppraisalResult } from '@/lib/types';
import { dbService } from '@/services/dbService';

interface AppraisalContextType {
  appraisals: AppraisalResult[];
  isLoading: boolean;
  addAppraisal: (appraisal: AppraisalResult) => void;
  updateAppraisal: (id: string, updates: Partial<AppraisalResult>) => void;
  refreshAppraisals: (userId: string) => Promise<void>;
  clearAppraisals: () => void;
}

export const AppraisalContext = createContext<AppraisalContextType>({
  appraisals: [],
  isLoading: false,
  addAppraisal: () => {},
  updateAppraisal: () => {},
  refreshAppraisals: async () => {},
  clearAppraisals: () => {},
});

export const AppraisalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appraisals, setAppraisals] = useState<AppraisalResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Add a new appraisal optimistically (used after creating a new appraisal)
  const addAppraisal = useCallback((appraisal: AppraisalResult) => {
    setAppraisals(prev => {
      // Avoid duplicates by ID
      const filtered = prev.filter(a => a.id !== appraisal.id);
      // Add new appraisal at the front (most recent first)
      return [appraisal, ...filtered];
    });
  }, []);

  // Update an existing appraisal (used for toggling isPublic, etc.)
  const updateAppraisal = useCallback((id: string, updates: Partial<AppraisalResult>) => {
    setAppraisals(prev => prev.map(a =>
      a.id === id ? { ...a, ...updates } : a
    ));
  }, []);

  // Refresh appraisals from the database
  const refreshAppraisals = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const dbAppraisals = await dbService.getHistory(userId);

      setAppraisals(prev => {
        // Get IDs of what's in the database
        const dbIds = new Set(dbAppraisals.map(a => a.id));

        // Keep any optimistic entries that aren't in DB yet
        // (these were just created and haven't propagated)
        const optimisticPending = prev.filter(a => !dbIds.has(a.id));

        // Merge: optimistic pending items + database items
        const merged = [...optimisticPending, ...dbAppraisals];

        // Sort by timestamp descending (most recent first)
        return merged.sort((a, b) => b.timestamp - a.timestamp);
      });
    } catch (error) {
      console.error('Error refreshing appraisals:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear all appraisals (used on sign out)
  const clearAppraisals = useCallback(() => {
    setAppraisals([]);
  }, []);

  return (
    <AppraisalContext.Provider
      value={{
        appraisals,
        isLoading,
        addAppraisal,
        updateAppraisal,
        refreshAppraisals,
        clearAppraisals
      }}
    >
      {children}
    </AppraisalContext.Provider>
  );
};
