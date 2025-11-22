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
   * Get appraisal history for a user
   */
  public async getHistory(userId: string): Promise<AppraisalResult[]> {
    try {
      const { data, error } = await supabase
        .from('appraisals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

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
  public async saveAppraisal(userId: string, appraisal: Omit<AppraisalResult, 'id' | 'timestamp'>): Promise<AppraisalResult | null> {
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

      const { data, error } = await supabase
        .from('appraisals')
        .insert([
          {
            id: appraisalId,
            user_id: userId,
            item_name: appraisal.itemName,
            author: appraisal.author,
            era: appraisal.era,
            category: appraisal.category,
            description: appraisal.description,
            price_low: appraisal.priceRange.low,
            price_high: appraisal.priceRange.high,
            currency: appraisal.currency,
            reasoning: appraisal.reasoning,
            references: appraisal.references || [],
            image_url: imageUrl,
            image_urls: appraisal.images || (imageUrl ? [imageUrl] : []),
          },
        ])
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
}

export const dbService = new DBService();
