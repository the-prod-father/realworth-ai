import { supabase, getSupabaseAdmin } from '@/lib/supabase';

export interface Listing {
  id: string;
  appraisalId: string;
  sellerId: string;
  askingPrice: number; // cents
  aiSuggestedPrice: number | null;
  acceptsOffers: boolean;
  pickupCity: string;
  pickupState: string;
  pickupZip: string;
  pickupLat: number | null;
  pickupLng: number | null;
  status: 'active' | 'pending' | 'sold' | 'cancelled';
  viewsCount: number;
  savesCount: number;
  createdAt: string;
  updatedAt: string;
  soldAt: string | null;
  // Joined data
  appraisal?: {
    id: string;
    itemName: string;
    imageUrl: string;
    aiImageUrl: string | null;
    category: string;
    era: string;
    priceLow: number;
    priceHigh: number;
  };
  seller?: {
    id: string;
    name: string;
    picture: string;
    sellerRating: number | null;
    sellerTotalSales: number;
  };
}

export interface CreateListingData {
  appraisalId: string;
  askingPrice: number;
  acceptsOffers?: boolean;
  pickupCity: string;
  pickupState: string;
  pickupZip: string;
}

export interface ListingFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  zip?: string;
  status?: string;
  sellerId?: string;
  limit?: number;
  offset?: number;
}

class ListingService {
  /**
   * Create a new listing from an appraisal
   */
  async createListing(
    userId: string,
    data: CreateListingData,
    accessToken: string
  ): Promise<{ listing: Listing | null; error: string | null }> {
    try {
      // Create authenticated client
      const authClient = supabase;

      // Verify user owns the appraisal
      const { data: appraisal, error: appraisalError } = await authClient
        .from('appraisals')
        .select('id, user_id, price_low, price_high')
        .eq('id', data.appraisalId)
        .single();

      if (appraisalError || !appraisal) {
        return { listing: null, error: 'Appraisal not found' };
      }

      if (appraisal.user_id !== userId) {
        return { listing: null, error: 'You do not own this appraisal' };
      }

      // Check if listing already exists for this appraisal
      const { data: existingListing } = await authClient
        .from('listings')
        .select('id')
        .eq('appraisal_id', data.appraisalId)
        .single();

      if (existingListing) {
        return { listing: null, error: 'A listing already exists for this appraisal' };
      }

      // Calculate AI suggested price (average of price range)
      const aiSuggestedPrice = Math.round((appraisal.price_low + appraisal.price_high) / 2);

      // Create listing using admin client to bypass RLS for insert
      const supabaseAdmin = getSupabaseAdmin();
      const { data: listing, error: createError } = await supabaseAdmin
        .from('listings')
        .insert({
          appraisal_id: data.appraisalId,
          seller_id: userId,
          asking_price: data.askingPrice,
          ai_suggested_price: aiSuggestedPrice,
          accepts_offers: data.acceptsOffers ?? true,
          pickup_city: data.pickupCity,
          pickup_state: data.pickupState,
          pickup_zip: data.pickupZip,
          status: 'active',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating listing:', createError);
        return { listing: null, error: 'Failed to create listing' };
      }

      return { listing: this.mapListing(listing), error: null };
    } catch (error) {
      console.error('Error in createListing:', error);
      return { listing: null, error: 'Failed to create listing' };
    }
  }

  /**
   * Get listings with filters
   */
  async getListings(filters: ListingFilters = {}): Promise<Listing[]> {
    try {
      let query = supabase
        .from('listings')
        .select(`
          *,
          appraisals (
            id,
            item_name,
            image_url,
            ai_image_url,
            category,
            era,
            price_low,
            price_high
          ),
          users!listings_seller_id_fkey (
            id,
            name,
            picture,
            seller_rating,
            seller_total_sales
          )
        `)
        .eq('status', filters.status || 'active')
        .order('created_at', { ascending: false });

      if (filters.category) {
        query = query.eq('appraisals.category', filters.category);
      }

      if (filters.minPrice) {
        query = query.gte('asking_price', filters.minPrice);
      }

      if (filters.maxPrice) {
        query = query.lte('asking_price', filters.maxPrice);
      }

      if (filters.zip) {
        query = query.eq('pickup_zip', filters.zip);
      }

      if (filters.sellerId) {
        query = query.eq('seller_id', filters.sellerId);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching listings:', error);
        return [];
      }

      return (data || []).map((row) => this.mapListingWithJoins(row));
    } catch (error) {
      console.error('Error in getListings:', error);
      return [];
    }
  }

  /**
   * Get a single listing by ID
   */
  async getListing(listingId: string): Promise<Listing | null> {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          appraisals (
            id,
            item_name,
            image_url,
            ai_image_url,
            category,
            era,
            price_low,
            price_high
          ),
          users!listings_seller_id_fkey (
            id,
            name,
            picture,
            seller_rating,
            seller_total_sales
          )
        `)
        .eq('id', listingId)
        .single();

      if (error || !data) {
        console.error('Error fetching listing:', error);
        return null;
      }

      // Increment view count
      await supabase
        .from('listings')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', listingId);

      return this.mapListingWithJoins(data);
    } catch (error) {
      console.error('Error in getListing:', error);
      return null;
    }
  }

  /**
   * Update a listing
   */
  async updateListing(
    userId: string,
    listingId: string,
    updates: Partial<{
      askingPrice: number;
      acceptsOffers: boolean;
      pickupCity: string;
      pickupState: string;
      pickupZip: string;
      status: string;
    }>
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Verify ownership
      const { data: listing } = await supabase
        .from('listings')
        .select('seller_id')
        .eq('id', listingId)
        .single();

      if (!listing || listing.seller_id !== userId) {
        return { success: false, error: 'Listing not found or access denied' };
      }

      const updateData: Record<string, unknown> = {};
      if (updates.askingPrice !== undefined) updateData.asking_price = updates.askingPrice;
      if (updates.acceptsOffers !== undefined) updateData.accepts_offers = updates.acceptsOffers;
      if (updates.pickupCity !== undefined) updateData.pickup_city = updates.pickupCity;
      if (updates.pickupState !== undefined) updateData.pickup_state = updates.pickupState;
      if (updates.pickupZip !== undefined) updateData.pickup_zip = updates.pickupZip;
      if (updates.status !== undefined) updateData.status = updates.status;

      const { error } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', listingId);

      if (error) {
        console.error('Error updating listing:', error);
        return { success: false, error: 'Failed to update listing' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error in updateListing:', error);
      return { success: false, error: 'Failed to update listing' };
    }
  }

  /**
   * Cancel a listing
   */
  async cancelListing(userId: string, listingId: string): Promise<{ success: boolean; error: string | null }> {
    return this.updateListing(userId, listingId, { status: 'cancelled' });
  }

  /**
   * Get seller's listings
   */
  async getSellerListings(sellerId: string): Promise<Listing[]> {
    return this.getListings({ sellerId, status: 'active' });
  }

  /**
   * Save/unsave a listing (wishlist)
   */
  async toggleSaveListing(
    userId: string,
    listingId: string
  ): Promise<{ saved: boolean; error: string | null }> {
    try {
      // Check if already saved
      const { data: existing } = await supabase
        .from('saved_listings')
        .select('listing_id')
        .eq('user_id', userId)
        .eq('listing_id', listingId)
        .single();

      if (existing) {
        // Remove from saved
        const { error } = await supabase
          .from('saved_listings')
          .delete()
          .eq('user_id', userId)
          .eq('listing_id', listingId);

        if (error) {
          return { saved: false, error: 'Failed to unsave listing' };
        }

        // Decrement saves count
        await supabase.rpc('decrement_saves_count', { listing_id: listingId });

        return { saved: false, error: null };
      } else {
        // Add to saved
        const { error } = await supabase
          .from('saved_listings')
          .insert({ user_id: userId, listing_id: listingId });

        if (error) {
          return { saved: true, error: 'Failed to save listing' };
        }

        // Increment saves count
        await supabase
          .from('listings')
          .update({ saves_count: supabase.rpc('increment') })
          .eq('id', listingId);

        return { saved: true, error: null };
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      return { saved: false, error: 'Failed to save listing' };
    }
  }

  /**
   * Get user's saved listings
   */
  async getSavedListings(userId: string): Promise<Listing[]> {
    try {
      const { data, error } = await supabase
        .from('saved_listings')
        .select(`
          listings (
            *,
            appraisals (
              id,
              item_name,
              image_url,
              ai_image_url,
              category,
              era,
              price_low,
              price_high
            ),
            users!listings_seller_id_fkey (
              id,
              name,
              picture,
              seller_rating,
              seller_total_sales
            )
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching saved listings:', error);
        return [];
      }

      return (data || [])
        .filter((row) => row.listings)
        .map((row) => this.mapListingWithJoins(row.listings as unknown as Record<string, unknown>));
    } catch (error) {
      console.error('Error in getSavedListings:', error);
      return [];
    }
  }

  /**
   * Check if user has saved a listing
   */
  async isListingSaved(userId: string, listingId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('saved_listings')
        .select('listing_id')
        .eq('user_id', userId)
        .eq('listing_id', listingId)
        .single();

      return !!data;
    } catch {
      return false;
    }
  }

  /**
   * Map database row to Listing interface
   */
  private mapListing(row: Record<string, unknown>): Listing {
    return {
      id: row.id as string,
      appraisalId: row.appraisal_id as string,
      sellerId: row.seller_id as string,
      askingPrice: row.asking_price as number,
      aiSuggestedPrice: row.ai_suggested_price as number | null,
      acceptsOffers: row.accepts_offers as boolean,
      pickupCity: row.pickup_city as string,
      pickupState: row.pickup_state as string,
      pickupZip: row.pickup_zip as string,
      pickupLat: row.pickup_lat as number | null,
      pickupLng: row.pickup_lng as number | null,
      status: row.status as Listing['status'],
      viewsCount: row.views_count as number,
      savesCount: row.saves_count as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      soldAt: row.sold_at as string | null,
    };
  }

  /**
   * Map database row with joins to Listing interface
   */
  private mapListingWithJoins(row: Record<string, unknown>): Listing {
    const listing = this.mapListing(row);

    const appraisalData = row.appraisals as Record<string, unknown> | null;
    if (appraisalData) {
      listing.appraisal = {
        id: appraisalData.id as string,
        itemName: appraisalData.item_name as string,
        imageUrl: appraisalData.image_url as string,
        aiImageUrl: appraisalData.ai_image_url as string | null,
        category: appraisalData.category as string,
        era: appraisalData.era as string,
        priceLow: appraisalData.price_low as number,
        priceHigh: appraisalData.price_high as number,
      };
    }

    const userData = row.users as Record<string, unknown> | null;
    if (userData) {
      listing.seller = {
        id: userData.id as string,
        name: userData.name as string,
        picture: userData.picture as string,
        sellerRating: userData.seller_rating as number | null,
        sellerTotalSales: userData.seller_total_sales as number,
      };
    }

    return listing;
  }
}

export const listingService = new ListingService();
