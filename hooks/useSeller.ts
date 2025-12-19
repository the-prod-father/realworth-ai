'use client';

import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '@/components/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface SellerStatus {
  phoneVerified: boolean;
  stripeConnectOnboarded: boolean;
  isVerifiedSeller: boolean;
  sellerRating: number | null;
  totalSales: number;
}

interface StripeConnectStatus {
  connected: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export function useSeller() {
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState<SellerStatus | null>(null);
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/seller/status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch seller status');
      }

      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching seller status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchConnectStatus = useCallback(async () => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/seller/connect-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch connect status');
      }

      const data = await response.json();
      setConnectStatus(data);

      // Refresh main status if connect status changed
      if (data.chargesEnabled && data.payoutsEnabled) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Error fetching connect status:', err);
    }
  }, [user, fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const sendPhoneVerification = async (phoneNumber: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch('/api/seller/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to send code' };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to send verification code' };
    }
  };

  const confirmPhoneVerification = async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch('/api/seller/confirm-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Invalid code' };
      }

      // Refresh status
      await fetchStatus();
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to verify code' };
    }
  };

  const startStripeConnect = async (): Promise<{ url?: string; error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { error: 'Not authenticated' };
      }

      const response = await fetch('/api/seller/connect-stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/sell`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Failed to start onboarding' };
      }

      return { url: data.url };
    } catch (err) {
      return { error: 'Failed to start Stripe onboarding' };
    }
  };

  const refreshStatus = () => {
    setLoading(true);
    fetchStatus();
    fetchConnectStatus();
  };

  return {
    status,
    connectStatus,
    loading,
    error,
    isVerifiedSeller: status?.isVerifiedSeller || false,
    sendPhoneVerification,
    confirmPhoneVerification,
    startStripeConnect,
    refreshStatus,
    fetchConnectStatus,
  };
}
