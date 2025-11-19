import { AppraisalResult } from '@/lib/types';
import { supabase } from '@/lib/supabase';

class DBService {
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
        timestamp: new Date(record.created_at).getTime(),
      }));
    } catch (error) {
      console.error('Error in getHistory:', error);
      return [];
    }
  }

  /**
   * Save a new appraisal
   */
  public async saveAppraisal(userId: string, appraisal: Omit<AppraisalResult, 'id' | 'timestamp'>): Promise<AppraisalResult | null> {
    try {
      const { data, error } = await supabase
        .from('appraisals')
        .insert([
          {
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
            image_url: appraisal.image,
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
        timestamp: new Date(data.created_at).getTime(),
      };
    } catch (error) {
      console.error('Error in saveAppraisal:', error);
      return null;
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
        timestamp: new Date(record.created_at).getTime(),
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
