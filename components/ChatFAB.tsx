'use client';

import React, { useState, useContext } from 'react';
import Link from 'next/link';
import { AuthContext } from './contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import ChatInterface from './ChatInterface';
import { SparklesIcon } from './icons';

export default function ChatFAB() {
  const { user } = useContext(AuthContext);
  const { isPro } = useSubscription(user?.id || null);
  const [showChat, setShowChat] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);

  // Only show for logged-in users
  if (!user) return null;

  const handleClick = () => {
    if (isPro) {
      setShowChat(true);
    } else {
      setShowUpsell(true);
    }
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={handleClick}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-full shadow-lg shadow-purple-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        title="Chat with AI"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>

        {/* Pro Badge for non-Pro users */}
        {!isPro && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            PRO
          </span>
        )}
      </button>

      {/* Chat Modal - Pro Users */}
      {showChat && isPro && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="w-full md:max-w-lg h-[85vh] md:h-[600px] md:max-h-[80vh]">
            <ChatInterface
              userId={user.id}
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}

      {/* Upsell Modal - Free Users */}
      {showUpsell && !isPro && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl animate-slide-up">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">AI Collection Assistant</h3>
              <p className="text-slate-600 text-sm">
                Get personalized advice about your treasures from our AI expert.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-slate-700">Ask questions about any appraised item</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-slate-700">Get selling advice and market insights</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-slate-700">Learn preservation and care tips</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-slate-700">Collection portfolio analysis</p>
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/profile#upgrade"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-semibold py-3 px-4 rounded-xl transition-all"
              onClick={() => setShowUpsell(false)}
            >
              <SparklesIcon className="w-5 h-5" />
              Upgrade to Pro
            </Link>

            {/* Close */}
            <button
              onClick={() => setShowUpsell(false)}
              className="w-full mt-3 text-slate-500 hover:text-slate-700 text-sm py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </>
  );
}
