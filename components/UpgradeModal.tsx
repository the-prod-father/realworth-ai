'use client';

import React, { useState } from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  userName: string;
  feature?: string;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  userName,
  feature,
}: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userEmail, userName }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Upgrade to Pro</h2>
          {feature && (
            <p className="text-gray-600 mt-2">
              <span className="font-medium">{feature}</span> is a Pro feature
            </p>
          )}
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          <Feature icon="chat" text="AI Chat Assistant" description="Ask questions about any item" />
          <Feature icon="infinity" text="Unlimited Appraisals" description="No monthly limits" />
          <Feature icon="images" text="Unlimited Photos" description="Add as many photos as needed" />
          <Feature icon="collection" text="Collections" description="Organize your items" />
          <Feature icon="support" text="Priority Support" description="Get help when you need it" />
        </div>

        {/* Price */}
        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-gray-900">
            $9.99<span className="text-lg font-normal text-gray-500">/month</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Cancel anytime</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Loading...' : 'Upgrade Now'}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 px-4 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text, description }: { icon: string; text: string; description: string }) {
  const icons: Record<string, React.ReactNode> = {
    chat: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    infinity: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    images: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    collection: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    support: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  };

  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center text-teal-500">
        {icons[icon]}
      </div>
      <div>
        <p className="font-medium text-gray-900 text-sm">{text}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );
}
