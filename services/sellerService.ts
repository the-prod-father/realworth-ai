import { supabase, getSupabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';
import twilio from 'twilio';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

// Initialize Twilio client for phone verification
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

export interface SellerStatus {
  phoneVerified: boolean;
  stripeConnectOnboarded: boolean;
  isVerifiedSeller: boolean;
  sellerRating: number | null;
  totalSales: number;
}

export interface PhoneVerification {
  success: boolean;
  message: string;
}

class SellerService {
  /**
   * Get seller verification status for a user
   */
  async getSellerStatus(userId: string): Promise<SellerStatus | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('phone_verified, stripe_connect_onboarded, seller_verified_at, seller_rating, seller_total_sales')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error fetching seller status:', error);
        return null;
      }

      return {
        phoneVerified: data.phone_verified || false,
        stripeConnectOnboarded: data.stripe_connect_onboarded || false,
        isVerifiedSeller: !!data.seller_verified_at,
        sellerRating: data.seller_rating,
        totalSales: data.seller_total_sales || 0,
      };
    } catch (error) {
      console.error('Error in getSellerStatus:', error);
      return null;
    }
  }

  /**
   * Send phone verification code via Twilio Verify
   */
  async sendPhoneVerificationCode(
    userId: string,
    phoneNumber: string
  ): Promise<PhoneVerification> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      // Clean phone number (remove non-digits except leading +)
      let cleanPhone = phoneNumber.replace(/[^\d+]/g, '');

      // Ensure phone has country code (default to US +1 if not provided)
      if (!cleanPhone.startsWith('+')) {
        cleanPhone = '+1' + cleanPhone;
      }

      if (cleanPhone.length < 11) {
        return { success: false, message: 'Invalid phone number' };
      }

      // Store phone number in database
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          phone_number: cleanPhone,
          phone_verified: false
        })
        .eq('id', userId);

      if (error) {
        console.error('Error storing phone number:', error);
        return { success: false, message: 'Failed to save phone number' };
      }

      // Send verification code via Twilio Verify
      if (!TWILIO_VERIFY_SERVICE_SID) {
        console.error('TWILIO_VERIFY_SERVICE_SID not configured');
        return { success: false, message: 'Phone verification not configured' };
      }

      const verification = await twilioClient.verify.v2
        .services(TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({
          to: cleanPhone,
          channel: 'sms'
        });

      if (verification.status !== 'pending') {
        console.error('Twilio verification failed:', verification.status);
        return { success: false, message: 'Failed to send verification code' };
      }

      return {
        success: true,
        message: 'Verification code sent to your phone'
      };
    } catch (error) {
      console.error('Error sending verification code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send verification code';
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Verify phone code via Twilio Verify
   */
  async verifyPhoneCode(
    userId: string,
    code: string
  ): Promise<PhoneVerification> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      // Validate code format
      if (!/^\d{6}$/.test(code)) {
        return { success: false, message: 'Invalid code format. Please enter 6 digits.' };
      }

      // Get user's phone number from database
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('phone_number')
        .eq('id', userId)
        .single();

      if (userError || !userData?.phone_number) {
        return { success: false, message: 'Phone number not found. Please request a new code.' };
      }

      // Verify code with Twilio
      if (!TWILIO_VERIFY_SERVICE_SID) {
        console.error('TWILIO_VERIFY_SERVICE_SID not configured');
        return { success: false, message: 'Phone verification not configured' };
      }

      const verificationCheck = await twilioClient.verify.v2
        .services(TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: userData.phone_number,
          code: code
        });

      if (verificationCheck.status !== 'approved') {
        return { success: false, message: 'Invalid or expired code. Please try again.' };
      }

      // Update user as phone verified
      const { error } = await supabaseAdmin
        .from('users')
        .update({ phone_verified: true })
        .eq('id', userId);

      if (error) {
        console.error('Error updating phone verified status:', error);
        return { success: false, message: 'Failed to verify phone' };
      }

      // Check if fully verified now
      await this.checkAndUpdateSellerVerification(userId);

      return { success: true, message: 'Phone verified successfully!' };
    } catch (error) {
      console.error('Error verifying phone code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify phone';
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Create Stripe Connect onboarding link
   */
  async createStripeConnectOnboardingLink(
    userId: string,
    userEmail: string,
    returnUrl: string
  ): Promise<{ url: string | null; error: string | null }> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      // Check if user already has a Connect account
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('stripe_connect_id')
        .eq('id', userId)
        .single();

      let accountId = userData?.stripe_connect_id;

      // Create new Connect account if needed
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          email: userEmail,
          metadata: {
            userId: userId,
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });

        accountId = account.id;

        // Store the Connect account ID
        await supabaseAdmin
          .from('users')
          .update({ stripe_connect_id: accountId })
          .eq('id', userId);
      }

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${returnUrl}?refresh=true`,
        return_url: `${returnUrl}?success=true`,
        type: 'account_onboarding',
      });

      return { url: accountLink.url, error: null };
    } catch (error) {
      console.error('Error creating Stripe Connect link:', error);
      return {
        url: null,
        error: error instanceof Error ? error.message : 'Failed to create onboarding link'
      };
    }
  }

  /**
   * Check Stripe Connect account status
   */
  async checkStripeConnectStatus(userId: string): Promise<{
    connected: boolean;
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  }> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('stripe_connect_id')
        .eq('id', userId)
        .single();

      if (!userData?.stripe_connect_id) {
        return {
          connected: false,
          detailsSubmitted: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        };
      }

      const account = await stripe.accounts.retrieve(userData.stripe_connect_id);

      const status = {
        connected: true,
        detailsSubmitted: account.details_submitted || false,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
      };

      // Update database if fully onboarded
      if (status.detailsSubmitted && status.chargesEnabled && status.payoutsEnabled) {
        await supabaseAdmin
          .from('users')
          .update({ stripe_connect_onboarded: true })
          .eq('id', userId);

        // Check if fully verified now
        await this.checkAndUpdateSellerVerification(userId);
      }

      return status;
    } catch (error) {
      console.error('Error checking Stripe Connect status:', error);
      return {
        connected: false,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      };
    }
  }

  /**
   * Check if user meets all verification requirements and update seller status
   */
  async checkAndUpdateSellerVerification(userId: string): Promise<boolean> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('phone_verified, stripe_connect_onboarded, seller_verified_at')
        .eq('id', userId)
        .single();

      if (!userData) return false;

      const isFullyVerified = userData.phone_verified && userData.stripe_connect_onboarded;

      // Update seller_verified_at if newly verified
      if (isFullyVerified && !userData.seller_verified_at) {
        await supabaseAdmin
          .from('users')
          .update({ seller_verified_at: new Date().toISOString() })
          .eq('id', userId);
      }

      return isFullyVerified;
    } catch (error) {
      console.error('Error checking seller verification:', error);
      return false;
    }
  }

  /**
   * Handle Stripe Connect webhook events
   */
  async handleConnectWebhook(event: Stripe.Event): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin();

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const userId = account.metadata?.userId;

        if (userId && account.details_submitted && account.charges_enabled) {
          await supabaseAdmin
            .from('users')
            .update({ stripe_connect_onboarded: true })
            .eq('id', userId);

          await this.checkAndUpdateSellerVerification(userId);
        }
        break;
      }
    }
  }
}

export const sellerService = new SellerService();
