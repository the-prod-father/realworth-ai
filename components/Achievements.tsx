
'use client';

import React from 'react';
import { AppraisalResult } from '@/lib/types';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  total?: number;
}

interface AchievementsProps {
  history: AppraisalResult[];
}

function calculateAchievements(history: AppraisalResult[]): Achievement[] {
  const totalItems = history.length;
  const totalValue = history.reduce((sum, item) => sum + (item.priceRange.low + item.priceRange.high) / 2, 0);
  const maxValue = history.reduce((max, item) => Math.max(max, (item.priceRange.low + item.priceRange.high) / 2), 0);
  const categories = new Set(history.map(item => item.category)).size;
  const publicItems = history.filter(item => item.isPublic).length;

  return [
    {
      id: 'first-treasure',
      name: 'First Discovery',
      description: 'Appraise your first item',
      icon: '🎯',
      unlocked: totalItems >= 1,
    },
    {
      id: 'five-treasures',
      name: 'Treasure Hunter',
      description: 'Appraise 5 items',
      icon: '🔍',
      unlocked: totalItems >= 5,
      progress: Math.min(totalItems, 5),
      total: 5,
    },
    {
      id: 'ten-treasures',
      name: 'Expert Appraiser',
      description: 'Appraise 10 items',
      icon: '🏆',
      unlocked: totalItems >= 10,
      progress: Math.min(totalItems, 10),
      total: 10,
    },
    {
      id: 'twenty-five-treasures',
      name: 'Master Collector',
      description: 'Appraise 25 items',
      icon: '👑',
      unlocked: totalItems >= 25,
      progress: Math.min(totalItems, 25),
      total: 25,
    },
    {
      id: 'hundred-dollar',
      name: 'Nice Find',
      description: 'Find an item worth $100+',
      icon: '💵',
      unlocked: maxValue >= 100,
    },
    {
      id: 'five-hundred-dollar',
      name: 'Valuable Discovery',
      description: 'Find an item worth $500+',
      icon: '💰',
      unlocked: maxValue >= 500,
    },
    {
      id: 'thousand-dollar',
      name: 'Jackpot!',
      description: 'Find an item worth $1,000+',
      icon: '🤑',
      unlocked: maxValue >= 1000,
    },
    {
      id: 'five-thousand-dollar',
      name: 'Hidden Fortune',
      description: 'Find an item worth $5,000+',
      icon: '💎',
      unlocked: maxValue >= 5000,
    },
    {
      id: 'total-thousand',
      name: 'Building Wealth',
      description: 'Accumulate $1,000 total value',
      icon: '📈',
      unlocked: totalValue >= 1000,
    },
    {
      id: 'total-five-thousand',
      name: 'Treasure Vault',
      description: 'Accumulate $5,000 total value',
      icon: '🏦',
      unlocked: totalValue >= 5000,
    },
    {
      id: 'category-explorer',
      name: 'Category Explorer',
      description: 'Appraise items in 3 different categories',
      icon: '🗂️',
      unlocked: categories >= 3,
      progress: Math.min(categories, 3),
      total: 3,
    },
    {
      id: 'category-master',
      name: 'Diverse Collector',
      description: 'Appraise items in 5 different categories',
      icon: '🌈',
      unlocked: categories >= 5,
      progress: Math.min(categories, 5),
      total: 5,
    },
    {
      id: 'first-share',
      name: 'Show & Tell',
      description: 'Share your first treasure publicly',
      icon: '📢',
      unlocked: publicItems >= 1,
    },
    {
      id: 'social-butterfly',
      name: 'Social Butterfly',
      description: 'Share 5 treasures publicly',
      icon: '🦋',
      unlocked: publicItems >= 5,
      progress: Math.min(publicItems, 5),
      total: 5,
    },
  ];
}

export const Achievements: React.FC<AchievementsProps> = ({ history }) => {
  const achievements = calculateAchievements(history);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span>🏅</span> Achievements
        </h3>
        <span className="text-sm text-slate-500">
          {unlockedCount}/{achievements.length} unlocked
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`relative p-3 rounded-xl border-2 transition-all ${
              achievement.unlocked
                ? 'border-teal-200 bg-teal-50'
                : 'border-slate-200 bg-slate-50 opacity-60'
            }`}
            title={achievement.description}
          >
            <div className="text-center">
              <div className={`text-2xl mb-1 ${achievement.unlocked ? '' : 'grayscale'}`}>
                {achievement.icon}
              </div>
              <p className={`text-xs font-semibold truncate ${
                achievement.unlocked ? 'text-slate-800' : 'text-slate-500'
              }`}>
                {achievement.name}
              </p>
              {achievement.progress !== undefined && !achievement.unlocked && (
                <div className="mt-1">
                  <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${(achievement.progress / (achievement.total || 1)) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {achievement.progress}/{achievement.total}
                  </p>
                </div>
              )}
              {achievement.unlocked && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
