'use client';

import React, { useEffect, useState } from 'react';
import { FlameIcon, TrophyIcon, GemIcon, SparklesIcon } from './icons';
import { Confetti } from './Confetti';

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  isNewDay: boolean;
  streakIncreased: boolean;
  streakBroken: boolean;
}

interface CelebrationScreenProps {
  itemName: string;
  value: number;
  currency?: string;
  streakInfo?: StreakInfo | null;
  triviaPoints?: number;
  onContinue: () => void;
}

// Fun messages based on value
const getValueMessage = (value: number): { emoji: string; message: string; subtext: string } => {
  if (value >= 10000) {
    return {
      emoji: '',
      message: 'Jackpot!',
      subtext: "You might be sitting on a goldmine!",
    };
  }
  if (value >= 5000) {
    return {
      emoji: '',
      message: 'Amazing Find!',
      subtext: "This could be worth a small fortune!",
    };
  }
  if (value >= 1000) {
    return {
      emoji: '',
      message: 'Great Discovery!',
      subtext: "That's some serious value right there!",
    };
  }
  if (value >= 500) {
    return {
      emoji: '',
      message: 'Nice Find!',
      subtext: "Not bad at all - worth keeping an eye on!",
    };
  }
  if (value >= 100) {
    return {
      emoji: '',
      message: 'Interesting!',
      subtext: "Every treasure counts!",
    };
  }
  return {
    emoji: '',
    message: 'Appraised!',
    subtext: "Knowledge is the real treasure!",
  };
};

// Streak messages
const getStreakMessage = (streakInfo: StreakInfo): string | null => {
  if (streakInfo.streakBroken) {
    return "Streak reset - let's build a new one!";
  }
  if (streakInfo.streakIncreased) {
    if (streakInfo.currentStreak === 1) {
      return "Day 1 - Your journey begins!";
    }
    if (streakInfo.currentStreak === 7) {
      return "1 Week Streak! You're on fire!";
    }
    if (streakInfo.currentStreak === 30) {
      return "30 Day Streak! Legendary!";
    }
    if (streakInfo.currentStreak >= 2) {
      return `${streakInfo.currentStreak} day streak! Keep it up!`;
    }
  }
  return null;
};

export function CelebrationScreen({
  itemName,
  value,
  currency = 'USD',
  streakInfo,
  triviaPoints = 0,
  onContinue,
}: CelebrationScreenProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const valueMessage = getValueMessage(value);
  const streakMessage = streakInfo ? getStreakMessage(streakInfo) : null;
  const shouldCelebrate = value >= 500 || (streakInfo?.currentStreak || 0) >= 7;

  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);

  useEffect(() => {
    // Trigger animations
    setTimeout(() => setIsVisible(true), 100);
    if (shouldCelebrate) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }
  }, [shouldCelebrate]);

  return (
    <>
      <Confetti trigger={showConfetti} />

      <div className={`fixed inset-0 bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center z-50 p-4 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
          {/* Success Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <SparklesIcon className="w-10 h-10 text-white" />
          </div>

          {/* Main Message */}
          <h2 className="text-3xl font-black text-slate-900 mb-2">
            {valueMessage.message}
          </h2>
          <p className="text-slate-600 mb-6">
            {valueMessage.subtext}
          </p>

          {/* Item Value Card */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 mb-6 text-white">
            <p className="text-sm text-slate-400 mb-1 truncate">{itemName}</p>
            <p className="text-4xl font-black">{formattedValue}</p>
            <p className="text-xs text-slate-400 mt-1">Estimated Value</p>
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-4 mb-6">
            {/* Streak */}
            {streakInfo && streakInfo.currentStreak > 0 && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                streakInfo.streakIncreased ? 'bg-orange-100' : 'bg-slate-100'
              }`}>
                <FlameIcon className={`w-5 h-5 ${
                  streakInfo.streakIncreased ? 'text-orange-500' : 'text-slate-400'
                }`} />
                <span className={`font-bold ${
                  streakInfo.streakIncreased ? 'text-orange-700' : 'text-slate-600'
                }`}>
                  {streakInfo.currentStreak}
                </span>
              </div>
            )}

            {/* Trivia Points */}
            {triviaPoints > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100">
                <GemIcon className="w-5 h-5 text-amber-500" />
                <span className="font-bold text-amber-700">+{triviaPoints}</span>
              </div>
            )}

            {/* Best Streak */}
            {streakInfo && streakInfo.longestStreak > 0 && streakInfo.currentStreak === streakInfo.longestStreak && streakInfo.currentStreak > 1 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100">
                <TrophyIcon className="w-5 h-5 text-purple-500" />
                <span className="text-xs font-medium text-purple-700">New Record!</span>
              </div>
            )}
          </div>

          {/* Streak Message */}
          {streakMessage && (
            <p className={`text-sm font-medium mb-6 ${
              streakInfo?.streakBroken ? 'text-slate-500' : 'text-orange-600'
            }`}>
              {streakMessage}
            </p>
          )}

          {/* Continue Button */}
          <button
            onClick={onContinue}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-teal-500/30"
          >
            View Full Appraisal
          </button>

          {/* Motivational footer */}
          <p className="text-xs text-slate-400 mt-4">
            Keep appraising to build your streak!
          </p>
        </div>
      </div>
    </>
  );
}

export default CelebrationScreen;
