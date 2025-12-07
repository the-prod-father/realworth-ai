'use client';

import React, { useState, useEffect } from 'react';
import { TriviaQuiz } from './TriviaQuiz';
import { GemIcon } from './icons';

const loadingMessages = [
  "Analyzing item details",
  "Consulting market data",
  "Researching comparable sales",
  "Checking auction records",
  "Calculating estimated value",
  "Finalizing appraisal",
];

interface LoaderProps {
  onPointsEarned?: (points: number) => void;
}

export const Loader: React.FC<LoaderProps> = ({ onPointsEarned }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(messageInterval);
  }, []);

  const handlePointsEarned = (points: number) => {
    setTotalPoints(prev => prev + points);
    onPointsEarned?.(points);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      {/* Animated loader */}
      <div className="relative w-14 h-14 mb-6">
        <div className="absolute inset-0 border-2 border-slate-200 rounded-full"></div>
        <div className="absolute inset-0 border-2 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <GemIcon className="w-5 h-5 text-teal-500" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-slate-900 mb-1">
        Appraising Your Item
      </h3>
      <p className="text-sm text-slate-500 mb-6 transition-opacity duration-500">
        {loadingMessages[messageIndex]}...
      </p>

      {/* Trivia Quiz Section */}
      <div className="w-full">
        <div className="text-center mb-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            While you wait, test your knowledge!
          </p>
        </div>
        <TriviaQuiz onPointsEarned={handlePointsEarned} maxQuestions={5} />
      </div>

      {/* Progress indicator */}
      <div className="mt-6 flex gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i <= messageIndex ? 'bg-teal-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
