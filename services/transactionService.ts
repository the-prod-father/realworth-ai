import { supabase, getSupabaseAdmin } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

// Platform fee: 2.5%
const PLATFORM_FEE_PERCENT = 2.5;

export type TransactionStatus =
  | 'pending'
  | 'payment_authorized'
  | 'pickup_scheduled'
  | 'completed'
  | 'paid_out'
  | 'cancelled'
  | 'disputed';

export interface Transaction {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number; // cents
  platformFee: number; // cents
  sellerPayout: number; // cents
  stripePaymentIntentId: string | null;
  stripeTransferId: string | null;
  status: TransactionStatus;
  pickupAddress: string | null;
  pickupScheduledAt: string | null;
  pickupNotes: string | null;
  buyerConfirmedAt: string | null;
  sellerConfirmedAt: string | null;
  completedAt: string | null;
  payoutAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined data
  listing?: {
    id: string;
    askingPrice: number;
    pickupCity: string;
    pickupState: string;
    appraisal?: {
      id: string;
      itemName: string;
      imageUrl: string;
      aiImageUrl: string | null;
    };
  };
  buyer?: {
    id: string;
    name: string;
    email: string;
    picture: string;
  };
  seller?: {
    id: string;
    name: string;
    email: string;
    picture: string;
    stripeConnectId: string | null;
  };
}

export interface CreateTransactionData {
  listingId: string;
  amount: number; // cents - could be different from asking price if offer accepted
  pickupNotes?: string;
}

class TransactionService {
  /**
   * Create a new transaction (initiate purchase)
   * This authorizes the payment but doesn't capture until pickup confirmed
   */
  async createTransaction(
    buyerId: string,
    buyerEmail: string,
    data: CreateTransactionData
  ): Promise<{ transaction: Transaction | null; clientSecret: string | null; error: string | null }> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      // Get listing details
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select(`
          *,
          users!listings_seller_id_fkey (
            id,
            email,
            stripe_connect_id
          )
        `)
        .eq('id', data.listingId)
        .eq('status', 'active')
        .single();

      if (listingError || !listing) {
        return { transaction: null, clientSecret: null, error: 'Listing not found or no longer available' };
      }

      const seller = listing.users as { id: string; email: string; stripe_connect_id: string | null };

      // Check buyer is not the seller
      if (seller.id === buyerId) {
        return { transaction: null, clientSecret: null, error: 'You cannot buy your own listing' };
      }

      // Check seller has Stripe Connect
      if (!seller.stripe_connect_id) {
        return { transaction: null, clientSecret: null, error: 'Seller is not set up to receive payments' };
      }

      // Check no existing pending transaction
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('listing_id', data.listingId)
        .in('status', ['pending', 'payment_authorized', 'pickup_scheduled'])
        .single();

      if (existingTx) {
        return { transaction: null, clientSecret: null, error: 'This item already has a pending transaction' };
      }

      // Calculate fees
      const amount = data.amount;
      const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
      const sellerPayout = amount - platformFee;

      // Create Stripe PaymentIntent with manual capture
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        capture_method: 'manual', // Authorize now, capture later after pickup
        receipt_email: buyerEmail,
        metadata: {
          listing_id: data.listingId,
          buyer_id: buyerId,
          seller_id: seller.id,
        },
        // Set up for Connect transfer
        transfer_data: {
          destination: seller.stripe_connect_id,
        },
        application_fee_amount: platformFee,
      });

      // Create transaction record
      const { data: transaction, error: createError } = await supabaseAdmin
        .from('transactions')
        .insert({
          listing_id: data.listingId,
          buyer_id: buyerId,
          seller_id: seller.id,
          amount,
          platform_fee: platformFee,
          seller_payout: sellerPayout,
          stripe_payment_intent_id: paymentIntent.id,
          status: 'pending',
          pickup_notes: data.pickupNotes || null,
        })
        .select()
        .single();

      if (createError) {
        // Cancel the payment intent if transaction creation failed
        await stripe.paymentIntents.cancel(paymentIntent.id);
        console.error('Error creating transaction:', createError);
        return { transaction: null, clientSecret: null, error: 'Failed to create transaction' };
      }

      // Update listing status to pending
      await supabaseAdmin
        .from('listings')
        .update({ status: 'pending' })
        .eq('id', data.listingId);

      return {
        transaction: this.mapTransaction(transaction),
        clientSecret: paymentIntent.client_secret,
        error: null,
      };
    } catch (error) {
      console.error('Error in createTransaction:', error);
      return { transaction: null, clientSecret: null, error: 'Failed to create transaction' };
    }
  }

  /**
   * Confirm payment was successful (called after Stripe confirms authorization)
   */
  async confirmPaymentAuthorized(
    transactionId: string,
    paymentIntentId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      // Verify the payment intent is authorized
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'requires_capture') {
        return { success: false, error: 'Payment was not authorized' };
      }

      // Update transaction status
      const { error } = await supabaseAdmin
        .from('transactions')
        .update({
          status: 'payment_authorized',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .eq('stripe_payment_intent_id', paymentIntentId);

      if (error) {
        return { success: false, error: 'Failed to update transaction' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error confirming payment:', error);
      return { success: false, error: 'Failed to confirm payment' };
    }
  }

  /**
   * Set pickup details (seller provides address)
   */
  async setPickupDetails(
    userId: string,
    transactionId: string,
    pickupAddress: string,
    pickupScheduledAt?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      // Verify user is the seller
      const { data: transaction } = await supabase
        .from('transactions')
        .select('seller_id, status')
        .eq('id', transactionId)
        .single();

      if (!transaction || transaction.seller_id !== userId) {
        return { success: false, error: 'Transaction not found or access denied' };
      }

      if (!['payment_authorized', 'pickup_scheduled'].includes(transaction.status)) {
        return { success: false, error: 'Transaction is not ready for pickup scheduling' };
      }

      const { error } = await supabaseAdmin
        .from('transactions')
        .update({
          pickup_address: pickupAddress,
          pickup_scheduled_at: pickupScheduledAt || null,
          status: 'pickup_scheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (error) {
        return { success: false, error: 'Failed to update pickup details' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error setting pickup details:', error);
      return { success: false, error: 'Failed to set pickup details' };
    }
  }

  /**
   * Buyer confirms they received the item
   * This captures the payment and initiates payout to seller
   */
  async confirmPickupComplete(
    userId: string,
    transactionId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      // Get transaction with payment intent
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*, listings(id)')
        .eq('id', transactionId)
        .single();

      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      // Check user is buyer
      if (transaction.buyer_id !== userId) {
        return { success: false, error: 'Only the buyer can confirm pickup' };
      }

      if (transaction.status !== 'pickup_scheduled') {
        return { success: false, error: 'Transaction is not ready for pickup confirmation' };
      }

      // Capture the payment
      const paymentIntent = await stripe.paymentIntents.capture(
        transaction.stripe_payment_intent_id
      );

      if (paymentIntent.status !== 'succeeded') {
        return { success: false, error: 'Payment capture failed' };
      }

      const now = new Date().toISOString();

      // Update transaction
      const { error } = await supabaseAdmin
        .from('transactions')
        .update({
          buyer_confirmed_at: now,
          completed_at: now,
          status: 'completed',
          updated_at: now,
        })
        .eq('id', transactionId);

      if (error) {
        return { success: false, error: 'Failed to update transaction' };
      }

      // Mark listing as sold
      await supabaseAdmin
        .from('listings')
        .update({
          status: 'sold',
          sold_at: now,
        })
        .eq('id', transaction.listing_id);

      // Increment seller's total sales
      await supabaseAdmin.rpc('increment_seller_sales', {
        seller_user_id: transaction.seller_id,
      });

      return { success: true, error: null };
    } catch (error) {
      console.error('Error confirming pickup:', error);
      return { success: false, error: 'Failed to confirm pickup' };
    }
  }

  /**
   * Cancel a transaction
   */
  async cancelTransaction(
    userId: string,
    transactionId: string,
    reason?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabaseAdmin = getSupabaseAdmin();

      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      // Only buyer or seller can cancel
      if (transaction.buyer_id !== userId && transaction.seller_id !== userId) {
        return { success: false, error: 'Not authorized to cancel this transaction' };
      }

      // Can only cancel before completion
      if (['completed', 'paid_out', 'cancelled'].includes(transaction.status)) {
        return { success: false, error: 'Transaction cannot be cancelled' };
      }

      // Cancel/refund the payment intent
      if (transaction.stripe_payment_intent_id) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          transaction.stripe_payment_intent_id
        );

        if (paymentIntent.status === 'requires_capture') {
          // Cancel the authorized payment
          await stripe.paymentIntents.cancel(transaction.stripe_payment_intent_id);
        } else if (paymentIntent.status === 'succeeded') {
          // Refund captured payment
          await stripe.refunds.create({
            payment_intent: transaction.stripe_payment_intent_id,
          });
        }
      }

      // Update transaction
      await supabaseAdmin
        .from('transactions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      // Reactivate listing
      await supabaseAdmin
        .from('listings')
        .update({ status: 'active' })
        .eq('id', transaction.listing_id);

      return { success: true, error: null };
    } catch (error) {
      console.error('Error cancelling transaction:', error);
      return { success: false, error: 'Failed to cancel transaction' };
    }
  }

  /**
   * Get user's transactions (as buyer or seller)
   */
  async getUserTransactions(
    userId: string,
    role?: 'buyer' | 'seller'
  ): Promise<Transaction[]> {
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          listings (
            id,
            asking_price,
            pickup_city,
            pickup_state,
            appraisals (
              id,
              item_name,
              image_url,
              ai_image_url
            )
          ),
          buyer:users!transactions_buyer_id_fkey (
            id,
            name,
            email,
            picture
          ),
          seller:users!transactions_seller_id_fkey (
            id,
            name,
            email,
            picture,
            stripe_connect_id
          )
        `)
        .order('created_at', { ascending: false });

      if (role === 'buyer') {
        query = query.eq('buyer_id', userId);
      } else if (role === 'seller') {
        query = query.eq('seller_id', userId);
      } else {
        query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return (data || []).map((row) => this.mapTransactionWithJoins(row));
    } catch (error) {
      console.error('Error in getUserTransactions:', error);
      return [];
    }
  }

  /**
   * Get a single transaction by ID
   */
  async getTransaction(transactionId: string, userId?: string): Promise<Transaction | null> {
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          listings (
            id,
            asking_price,
            pickup_city,
            pickup_state,
            appraisals (
              id,
              item_name,
              image_url,
              ai_image_url
            )
          ),
          buyer:users!transactions_buyer_id_fkey (
            id,
            name,
            email,
            picture
          ),
          seller:users!transactions_seller_id_fkey (
            id,
            name,
            email,
            picture,
            stripe_connect_id
          )
        `)
        .eq('id', transactionId);

      // If userId provided, ensure they are part of the transaction
      if (userId) {
        query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return null;
      }

      return this.mapTransactionWithJoins(data);
    } catch (error) {
      console.error('Error in getTransaction:', error);
      return null;
    }
  }

  private mapTransaction(row: Record<string, unknown>): Transaction {
    return {
      id: row.id as string,
      listingId: row.listing_id as string,
      buyerId: row.buyer_id as string,
      sellerId: row.seller_id as string,
      amount: row.amount as number,
      platformFee: row.platform_fee as number,
      sellerPayout: row.seller_payout as number,
      stripePaymentIntentId: row.stripe_payment_intent_id as string | null,
      stripeTransferId: row.stripe_transfer_id as string | null,
      status: row.status as TransactionStatus,
      pickupAddress: row.pickup_address as string | null,
      pickupScheduledAt: row.pickup_scheduled_at as string | null,
      pickupNotes: row.pickup_notes as string | null,
      buyerConfirmedAt: row.buyer_confirmed_at as string | null,
      sellerConfirmedAt: row.seller_confirmed_at as string | null,
      completedAt: row.completed_at as string | null,
      payoutAt: row.payout_at as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private mapTransactionWithJoins(row: Record<string, unknown>): Transaction {
    const transaction = this.mapTransaction(row);

    const listingData = row.listings as Record<string, unknown> | null;
    if (listingData) {
      const appraisalData = listingData.appraisals as Record<string, unknown> | null;
      transaction.listing = {
        id: listingData.id as string,
        askingPrice: listingData.asking_price as number,
        pickupCity: listingData.pickup_city as string,
        pickupState: listingData.pickup_state as string,
        appraisal: appraisalData ? {
          id: appraisalData.id as string,
          itemName: appraisalData.item_name as string,
          imageUrl: appraisalData.image_url as string,
          aiImageUrl: appraisalData.ai_image_url as string | null,
        } : undefined,
      };
    }

    const buyerData = row.buyer as Record<string, unknown> | null;
    if (buyerData) {
      transaction.buyer = {
        id: buyerData.id as string,
        name: buyerData.name as string,
        email: buyerData.email as string,
        picture: buyerData.picture as string,
      };
    }

    const sellerData = row.seller as Record<string, unknown> | null;
    if (sellerData) {
      transaction.seller = {
        id: sellerData.id as string,
        name: sellerData.name as string,
        email: sellerData.email as string,
        picture: sellerData.picture as string,
        stripeConnectId: sellerData.stripe_connect_id as string | null,
      };
    }

    return transaction;
  }
}

export const transactionService = new TransactionService();
