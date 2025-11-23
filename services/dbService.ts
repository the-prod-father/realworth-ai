import { AppraisalResult } from '@/lib/types';
import { supabase } from '@/lib/supabase';

class DBService {
  /**
   * Upload an image to Supabase Storage
   * Converts base64 data URL to blob and uploads
   */
  private async uploadImageToStorage(
    userId: string,
    appraisalId: string,
    base64DataUrl: string
  ): Promise<string | null> {
    try {
      // Check if it's already a storage URL (not base64)
      if (base64DataUrl.startsWith('http')) {
        return base64DataUrl;
      }

      // Extract mime type and base64 data
      const matches = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        console.error('Invalid base64 data URL format');
        return null;
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      // Determine file extension
      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
      };
      const ext = extMap[mimeType] || 'jpg';

      // Upload to storage: {user_id}/{appraisal_id}/image.{ext}
      const filePath = `${userId}/${appraisalId}/image.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('appraisal-images')
        .upload(filePath, blob, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading image to storage:', uploadError);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('appraisal-images')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadImageToStorage:', error);
      return null;
    }
  }

  /**
   * Get appraisal history for a user (excludes archived by default)
   */
  public async getHistory(userId: string, includeArchived: boolean = false): Promise<AppraisalResult[]> {
    try {
      let query = supabase
        .from('appraisals')
        .select('*')
        .eq('user_id', userId);

      // Exclude archived items unless specifically requested
      if (!includeArchived) {
        query = query.is('archived_at', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching appraisal history:', error);
        throw error;
      }

      // Map database records to AppraisalResult type
      return (data || []).map((record) => ({
        id: record.id,
        itemName: record.item_name,
        author: record.author || '',
        era: record.era || '',
        category: record.category,
        description: record.description || '',
        priceRange: {
          low: Number(record.price_low),
          high: Number(record.price_high),
        },
        currency: record.currency,
        reasoning: record.reasoning || '',
        references: record.references || [],
        image: record.image_url || '',
        images: record.image_urls || [],
        timestamp: new Date(record.created_at).getTime(),
        isPublic: record.is_public || false,
      }));
    } catch (error) {
      console.error('Error in getHistory:', error);
      return [];
    }
  }

  /**
   * Save a new appraisal
   * Uploads image to Supabase Storage and stores the URL
   */
  public async saveAppraisal(
    userId: string,
    appraisal: Omit<AppraisalResult, 'id' | 'timestamp'>,
    collectionData?: {
      collectionId?: string;
      seriesIdentifier?: string;
      validationStatus?: string;
      validationNotes?: string;
    }
  ): Promise<AppraisalResult | null> {
    try {
      // Generate UUID for the appraisal
      const appraisalId = crypto.randomUUID();

      // Upload image to storage if it's a base64 data URL
      let imageUrl = appraisal.image;
      if (appraisal.image && appraisal.image.startsWith('data:')) {
        const uploadedUrl = await this.uploadImageToStorage(userId, appraisalId, appraisal.image);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          console.warn('Failed to upload image to storage, saving without image');
          imageUrl = '';
        }
      }

      // Prepare insert data with proper null handling
      const insertData: any = {
        id: appraisalId,
        user_id: userId,
        item_name: appraisal.itemName,
        author: appraisal.author || null,
        era: appraisal.era || null,
        category: appraisal.category,
        description: appraisal.description || null,
        price_low: appraisal.priceRange.low,
        price_high: appraisal.priceRange.high,
        currency: appraisal.currency || 'USD',
        reasoning: appraisal.reasoning || null,
        image_url: imageUrl || null,
      };

      // Add optional fields only if they exist (to avoid schema errors)
      if (appraisal.references && appraisal.references.length > 0) {
        insertData.references = appraisal.references;
      }
      
      if (appraisal.images && appraisal.images.length > 0) {
        insertData.image_urls = appraisal.images;
      } else if (imageUrl) {
        insertData.image_urls = [imageUrl];
      }

      // Set default is_public if not provided
      if (appraisal.isPublic !== undefined) {
        insertData.is_public = appraisal.isPublic;
      }

      // Add collection data if provided
      if (collectionData?.collectionId) {
        insertData.collection_id = collectionData.collectionId;
        if (collectionData.seriesIdentifier) {
          insertData.series_identifier = collectionData.seriesIdentifier;
        }
        if (collectionData.validationStatus) {
          insertData.validation_status = collectionData.validationStatus;
        }
        if (collectionData.validationNotes) {
          insertData.validation_notes = collectionData.validationNotes;
        }
      }

      const { data, error } = await supabase
        .from('appraisals')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Error saving appraisal:', error);
        throw error;
      }

      if (!data) {
        return null;
      }

      // Return the saved appraisal in AppraisalResult format
      return {
        id: data.id,
        itemName: data.item_name,
        author: data.author || '',
        era: data.era || '',
        category: data.category,
        description: data.description || '',
        priceRange: {
          low: Number(data.price_low),
          high: Number(data.price_high),
        },
        currency: data.currency,
        reasoning: data.reasoning || '',
        references: data.references || [],
        image: data.image_url || '',
        images: data.image_urls || [],
        timestamp: new Date(data.created_at).getTime(),
        isPublic: data.is_public || false,
      };
    } catch (error) {
      console.error('Error in saveAppraisal:', error);
      return null;
    }
  }

  /**
   * Get user streak data
   */
  public async getUserStreaks(userId: string): Promise<{ currentStreak: number; longestStreak: number }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('current_streak, longest_streak')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return { currentStreak: 0, longestStreak: 0 };
      }

      return {
        currentStreak: data.current_streak || 0,
        longestStreak: data.longest_streak || 0,
      };
    } catch (error) {
      console.error('Error fetching user streaks:', error);
      return { currentStreak: 0, longestStreak: 0 };
    }
  }

  /**
   * Toggle public/private status of an appraisal
   */
  public async togglePublic(userId: string, appraisalId: string, isPublic: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('appraisals')
        .update({ is_public: isPublic })
        .eq('id', appraisalId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error toggling public status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in togglePublic:', error);
      return false;
    }
  }

  /**
   * Delete an appraisal and optionally its associated image
   */
  public async deleteAppraisal(userId: string, appraisalId: string, deleteImage: boolean = true): Promise<boolean> {
    try {
      // First, get the appraisal to retrieve image path
      let imagePath: string | null = null;
      if (deleteImage) {
        const { data: appraisal } = await supabase
          .from('appraisals')
          .select('image_url')
          .eq('id', appraisalId)
          .eq('user_id', userId)
          .single();

        if (appraisal?.image_url) {
          // Extract path from URL: https://.../appraisal-images/{path}
          const match = appraisal.image_url.match(/appraisal-images\/(.+)$/);
          if (match) {
            imagePath = match[1];
          }
        }
      }

      // Delete the appraisal record
      const { error } = await supabase
        .from('appraisals')
        .delete()
        .eq('id', appraisalId)
        .eq('user_id', userId); // Ensure user can only delete their own appraisals

      if (error) {
        console.error('Error deleting appraisal:', error);
        throw error;
      }

      // Delete the image from storage if path was found
      if (deleteImage && imagePath) {
        try {
          const { error: storageError } = await supabase.storage
            .from('appraisal-images')
            .remove([imagePath]);

          if (storageError) {
            console.warn('Error deleting image from storage:', storageError);
            // Don't fail the entire operation if image deletion fails
          }
        } catch (storageErr) {
          console.warn('Error deleting image:', storageErr);
          // Continue even if image deletion fails
        }
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAppraisal:', error);
      return false;
    }
  }

  /**
   * Get unique categories for a user's appraisals
   * Returns an array of category names with item counts
   */
  public async getCategories(userId: string): Promise<{ category: string; count: number }[]> {
    try {
      const { data, error } = await supabase
        .from('appraisals')
        .select('category')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }

      // Count occurrences of each category
      const categoryMap = (data || []).reduce((acc, item) => {
        const category = item.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Convert to array and sort by count (descending)
      return Object.entries(categoryMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error in getCategories:', error);
      return [];
    }
  }

  /**
   * Get appraisal history filtered by category
   */
  public async getHistoryByCategory(userId: string, category: string): Promise<AppraisalResult[]> {
    try {
      const { data, error } = await supabase
        .from('appraisals')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching appraisal history by category:', error);
        throw error;
      }

      // Map database records to AppraisalResult type
      return (data || []).map((record) => ({
        id: record.id,
        itemName: record.item_name,
        author: record.author || '',
        era: record.era || '',
        category: record.category,
        description: record.description || '',
        priceRange: {
          low: Number(record.price_low),
          high: Number(record.price_high),
        },
        currency: record.currency,
        reasoning: record.reasoning || '',
        references: record.references || [],
        image: record.image_url || '',
        images: record.image_urls || [],
        timestamp: new Date(record.created_at).getTime(),
        isPublic: record.is_public || false,
      }));
    } catch (error) {
      console.error('Error in getHistoryByCategory:', error);
      return [];
    }
  }

  /**
   * Legacy method for backward compatibility
   * Saves entire history array (not recommended for Supabase)
   */
  public async saveHistory(userId: string, history: AppraisalResult[]): Promise<void> {
    console.warn('saveHistory is deprecated. Use saveAppraisal instead.');

    // This method is kept for backward compatibility but not recommended
    // For Supabase, we should save appraisals individually
    for (const appraisal of history) {
      await this.saveAppraisal(userId, appraisal);
    }
  }

  /**
   * Update user's username
   */
  public async updateUsername(userId: string, username: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ username })
        .eq('id', userId);

      if (error) {
        console.error('Error updating username:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in updateUsername:', error);
      return false;
    }
  }

  /**
   * Check if username is available
   */
  public async checkUsername(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (error && error.code === 'PGRST116') {
        return true; // Not found = available
      }
      return !data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send a friend request
   */
  public async sendFriendRequest(requesterId: string, addresseeId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: requesterId,
          addressee_id: addresseeId,
          status: 'pending'
        });

      if (error) {
        console.error('Error sending friend request:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in sendFriendRequest:', error);
      return false;
    }
  }

  /**
   * Respond to a friend request
   */
  public async respondToFriendRequest(
    friendshipId: string,
    response: 'accepted' | 'declined'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: response, updated_at: new Date().toISOString() })
        .eq('id', friendshipId);

      if (error) {
        console.error('Error responding to friend request:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in respondToFriendRequest:', error);
      return false;
    }
  }

  /**
   * Get friendship status between two users
   */
  public async getFriendshipStatus(
    userId: string,
    otherUserId: string
  ): Promise<{ status: string; friendshipId?: string; isRequester?: boolean } | null> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, status, requester_id')
        .or(`and(requester_id.eq.${userId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${userId})`)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No relationship
        console.error('Error getting friendship status:', error);
        return null;
      }

      return {
        status: data.status,
        friendshipId: data.id,
        isRequester: data.requester_id === userId
      };
    } catch (error) {
      console.error('Error in getFriendshipStatus:', error);
      return null;
    }
  }

  /**
   * Get pending friend requests for a user
   */
  public async getPendingRequests(userId: string): Promise<Array<{
    id: string;
    requester: { id: string; name: string; picture: string; username?: string };
    created_at: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          created_at,
          requester:requester_id (id, name, picture, username)
        `)
        .eq('addressee_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting pending requests:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        requester: item.requester as any,
        created_at: item.created_at
      }));
    } catch (error) {
      console.error('Error in getPendingRequests:', error);
      return [];
    }
  }

  /**
   * Get user's friends list
   */
  public async getFriends(userId: string): Promise<Array<{
    id: string;
    name: string;
    picture: string;
    username?: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          requester:requester_id (id, name, picture, username),
          addressee:addressee_id (id, name, picture, username)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (error) {
        console.error('Error getting friends:', error);
        return [];
      }

      // Extract the friend (the other person in the relationship)
      return (data || []).map(item => {
        const requester = item.requester as any;
        const addressee = item.addressee as any;
        return requester.id === userId ? addressee : requester;
      });
    } catch (error) {
      console.error('Error in getFriends:', error);
      return [];
    }
  }

  /**
   * Remove a friendship
   */
  public async removeFriend(friendshipId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) {
        console.error('Error removing friend:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in removeFriend:', error);
      return false;
    }
  }

  /**
   * Get a single appraisal by ID
   */
  public async getAppraisal(userId: string, appraisalId: string): Promise<AppraisalResult | null> {
    try {
      const { data, error } = await supabase
        .from('appraisals')
        .select('*')
        .eq('id', appraisalId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching appraisal:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        itemName: data.item_name,
        author: data.author || '',
        era: data.era || '',
        category: data.category,
        description: data.description || '',
        priceRange: {
          low: Number(data.price_low),
          high: Number(data.price_high),
        },
        currency: data.currency,
        reasoning: data.reasoning || '',
        references: data.references || [],
        image: data.image_url || '',
        images: data.image_urls || [],
        timestamp: new Date(data.created_at).getTime(),
        isPublic: data.is_public || false,
      };
    } catch (error) {
      console.error('Error in getAppraisal:', error);
      return null;
    }
  }

  /**
   * Add images to an existing appraisal
   */
  public async addImagesToAppraisal(
    userId: string,
    appraisalId: string,
    newImageUrls: string[]
  ): Promise<{ success: boolean; imageUrls?: string[] }> {
    try {
      // Get current appraisal
      const { data: appraisal, error: fetchError } = await supabase
        .from('appraisals')
        .select('image_urls, image_count')
        .eq('id', appraisalId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !appraisal) {
        console.error('Error fetching appraisal for image addition:', fetchError);
        return { success: false };
      }

      // Combine existing and new image URLs
      const existingUrls = appraisal.image_urls || [];
      const updatedUrls = [...existingUrls, ...newImageUrls];

      // Update the appraisal
      const { error: updateError } = await supabase
        .from('appraisals')
        .update({
          image_urls: updatedUrls,
          image_count: updatedUrls.length,
        })
        .eq('id', appraisalId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error adding images to appraisal:', updateError);
        return { success: false };
      }

      return { success: true, imageUrls: updatedUrls };
    } catch (error) {
      console.error('Error in addImagesToAppraisal:', error);
      return { success: false };
    }
  }

  /**
   * Update appraisal after re-analysis with new images
   */
  public async updateAppraisalAnalysis(
    userId: string,
    appraisalId: string,
    updatedData: {
      itemName?: string;
      author?: string;
      era?: string;
      category?: string;
      description?: string;
      priceRange?: { low: number; high: number };
      currency?: string;
      reasoning?: string;
      references?: Array<{ title: string; url: string }>;
      image?: string;
    }
  ): Promise<boolean> {
    try {
      const updatePayload: Record<string, unknown> = {
        last_analyzed_at: new Date().toISOString(),
      };

      if (updatedData.itemName) updatePayload.item_name = updatedData.itemName;
      if (updatedData.author) updatePayload.author = updatedData.author;
      if (updatedData.era) updatePayload.era = updatedData.era;
      if (updatedData.category) updatePayload.category = updatedData.category;
      if (updatedData.description) updatePayload.description = updatedData.description;
      if (updatedData.priceRange) {
        updatePayload.price_low = updatedData.priceRange.low;
        updatePayload.price_high = updatedData.priceRange.high;
      }
      if (updatedData.currency) updatePayload.currency = updatedData.currency;
      if (updatedData.reasoning) updatePayload.reasoning = updatedData.reasoning;
      if (updatedData.references) updatePayload.references = updatedData.references;
      if (updatedData.image) updatePayload.image_url = updatedData.image;

      const { error } = await supabase
        .from('appraisals')
        .update(updatePayload)
        .eq('id', appraisalId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating appraisal analysis:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateAppraisalAnalysis:', error);
      return false;
    }
  }

  /**
   * Archive an appraisal
   */
  public async archiveAppraisal(userId: string, appraisalId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('appraisals')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', appraisalId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error archiving appraisal:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in archiveAppraisal:', error);
      return false;
    }
  }

  /**
   * Unarchive an appraisal
   */
  public async unarchiveAppraisal(userId: string, appraisalId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('appraisals')
        .update({ archived_at: null })
        .eq('id', appraisalId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error unarchiving appraisal:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in unarchiveAppraisal:', error);
      return false;
    }
  }

  /**
   * Get archived appraisals for a user
   */
  public async getArchivedHistory(userId: string): Promise<AppraisalResult[]> {
    try {
      const { data, error } = await supabase
        .from('appraisals')
        .select('*')
        .eq('user_id', userId)
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false });

      if (error) {
        console.error('Error fetching archived history:', error);
        throw error;
      }

      return (data || []).map((record) => ({
        id: record.id,
        itemName: record.item_name,
        author: record.author || '',
        era: record.era || '',
        category: record.category,
        description: record.description || '',
        priceRange: {
          low: Number(record.price_low),
          high: Number(record.price_high),
        },
        currency: record.currency,
        reasoning: record.reasoning || '',
        references: record.references || [],
        image: record.image_url || '',
        images: record.image_urls || [],
        timestamp: new Date(record.created_at).getTime(),
        isPublic: record.is_public || false,
      }));
    } catch (error) {
      console.error('Error in getArchivedHistory:', error);
      return [];
    }
  }
}

export const dbService = new DBService();
