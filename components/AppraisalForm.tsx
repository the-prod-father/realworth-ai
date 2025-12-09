
'use client';

import React, { useState } from 'react';
import { AppraisalRequest } from '@/lib/types';
import { CONDITIONS } from '@/lib/constants';
import { FileUpload } from './FileUpload';
import { SparklesIcon, SpinnerIcon } from './icons';

interface AppraisalFormProps {
  onSubmit: (request: AppraisalRequest) => void;
  isLoading: boolean;
  error: string | null;
}

export const AppraisalForm: React.FC<AppraisalFormProps> = ({
  onSubmit,
  isLoading,
  error,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [condition, setCondition] = useState(CONDITIONS[2]); // Default to 'Good'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length > 0) {
      onSubmit({ files, condition });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">Appraise an Item</h2>
        <p className="text-slate-500 mt-1">Upload a photo, select the condition, and get an instant valuation.</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg" role="alert">
          <strong className="font-bold">Oops! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <FileUpload files={files} setFiles={setFiles} />

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2 text-center">1. What's the item's condition?</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-w-md mx-auto">
          {CONDITIONS.map((cond) => (
            <button
              key={cond}
              type="button"
              onClick={() => setCondition(cond)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                condition === cond
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              {cond}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4">
        <p className="text-center text-sm text-slate-500 mb-4">2. Get your AI-powered appraisal!</p>
        <button
          type="submit"
          disabled={files.length === 0 || isLoading}
          className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl text-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
        >
          {isLoading ? <SpinnerIcon /> : <SparklesIcon />}
          {isLoading ? 'Uploading...' : 'Get Appraisal'}
        </button>
      </div>
    </form>
  );
};
