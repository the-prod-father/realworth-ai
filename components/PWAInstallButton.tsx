'use client';

import React, { useState, useEffect } from 'react';
import { DownloadIcon } from './icons';
import { event as trackEvent } from '@/lib/analytics';

// Type for the BeforeInstallPromptEvent (not in standard TypeScript lib)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'default'
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if running as installed PWA on iOS
    if ((navigator as { standalone?: boolean }).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      // Track installation in analytics
      trackEvent('pwa_installed', {
        event_category: 'engagement',
        event_label: 'PWA Install',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        // User accepted the install prompt
        setDeferredPrompt(null);
      }

      // Track the prompt outcome
      trackEvent('pwa_install_prompt', {
        event_category: 'engagement',
        event_label: outcome,
      });
    } catch (error) {
      console.error('Error showing install prompt:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  // Don't render if already installed or prompt not available
  if (isInstalled || !deferredPrompt) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        className={`flex items-center justify-center p-2 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors ${className}`}
        title="Install App"
        aria-label="Install RealWorth app"
      >
        <DownloadIcon className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      disabled={isInstalling}
      className={`flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium py-2 px-4 rounded-full text-sm transition-all ${className}`}
      aria-label="Install RealWorth app"
    >
      <DownloadIcon className="w-4 h-4" />
      <span className="hidden sm:inline">
        {isInstalling ? 'Installing...' : 'Install App'}
      </span>
      <span className="sm:hidden">
        {isInstalling ? '...' : 'Install'}
      </span>
    </button>
  );
};

export default PWAInstallButton;
