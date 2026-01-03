'use client';

import React, { useEffect, useCallback } from 'react';
import { XIcon, GoogleIcon, AppleIcon } from './icons';
import { AuthProvider } from '@/services/authService';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProvider: (provider: AuthProvider) => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onSelectProvider,
}) => {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors touch-manipulation"
          aria-label="Close"
        >
          <XIcon className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Sign in to continue</h2>
          <p className="text-sm text-slate-500 mt-1">
            Choose your preferred sign-in method
          </p>
        </div>

        {/* Provider buttons */}
        <div className="space-y-3">
          {/* Google */}
          <button
            onClick={() => onSelectProvider('google')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors touch-manipulation min-h-[48px]"
          >
            <GoogleIcon className="w-5 h-5" />
            <span className="font-medium text-slate-700">Continue with Google</span>
          </button>

          {/* Apple */}
          <button
            onClick={() => onSelectProvider('apple')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-black text-white rounded-xl hover:bg-slate-800 active:bg-slate-900 transition-colors touch-manipulation min-h-[48px]"
          >
            <AppleIcon className="w-5 h-5" />
            <span className="font-medium">Continue with Apple</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-400 text-center mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};
