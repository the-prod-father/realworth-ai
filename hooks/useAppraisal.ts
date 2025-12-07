
import { useState } from 'react';
import { AppraisalRequest, AppraisalResult } from '@/lib/types';
import { supabase } from '@/lib/supabase';

type AppraisalOutput = {
    appraisalData: Omit<AppraisalResult, 'id' | 'image' | 'images'>;
    imageDataUrl: string;
    imageUrls?: string[];
    imagePath?: string;
    userId?: string;
    collectionId?: string;
    collectionName?: string;
    validation?: {
        status: string;
        notes: string;
        seriesIdentifier: string;
    };
    streakInfo?: {
        currentStreak: number;
        longestStreak: number;
        isNewDay: boolean;
        streakIncreased: boolean;
        streakBroken: boolean;
    };
} | null;

// Upload image directly to Supabase Storage (bypasses Vercel limits)
async function uploadToStorage(file: File, userId: string | null): Promise<{ url: string; path: string } | null> {
  try {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${timestamp}-${randomStr}.${fileExt}`;

    const filePath = userId
      ? `${userId}/uploads/${fileName}`
      : `public/uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('appraisal-images')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('appraisal-images')
      .getPublicUrl(filePath);

    return { url: publicUrl, path: filePath };
  } catch (error) {
    console.error('Failed to upload to storage:', error);
    return null;
  }
}

// Compress image to reduce file size for upload
async function compressImage(file: File, maxSizeMB: number = 1.5): Promise<File> {
  // If file is small enough and not HEIC, return as-is
  const isHeic = file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic');

  if (file.size <= maxSizeMB * 1024 * 1024 && !isHeic) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set a timeout - if image doesn't load in 3s, return original
    const timeout = setTimeout(() => {
      console.warn('Image compression timeout, using original');
      resolve(file);
    }, 3000);

    img.onload = () => {
      clearTimeout(timeout);

      // Calculate new dimensions (max 1600px on longest side for faster uploads)
      let { width, height } = img;
      const maxDimension = 1600;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log(`Compressed ${file.name}: ${(file.size/1024/1024).toFixed(2)}MB -> ${(blob.size/1024/1024).toFixed(2)}MB`);
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original
          }
        },
        'image/jpeg',
        0.8 // Quality
      );
    };

    img.onerror = () => {
      clearTimeout(timeout);
      console.warn('Failed to load image for compression, using original');
      resolve(file); // Fallback to original on error
    };

    img.src = URL.createObjectURL(file);
  });
}

// Check total size before upload
function checkTotalSize(files: File[], maxTotalMB: number = 4.5): boolean {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  return totalSize <= maxTotalMB * 1024 * 1024;
}

export const useAppraisal = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAppraisal = async (request: AppraisalRequest): Promise<AppraisalOutput> => {
    setIsLoading(true);
    setError(null);

    // Get auth session
    let authToken: string | undefined;
    let userId: string | null = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token;
      userId = session?.user?.id || null;
    } catch (e) {
      console.log('No auth session found, proceeding without authentication');
    }

    try {
      // Step 1: Upload images directly to Supabase Storage (bypasses Vercel limits)
      console.log('Uploading images to storage...');
      const uploadResults = await Promise.all(
        request.files.map(file => uploadToStorage(file, userId))
      );

      const successfulUploads = uploadResults.filter((r): r is { url: string; path: string } => r !== null);

      if (successfulUploads.length === 0) {
        throw new Error('Failed to upload images. Please try again.');
      }

      console.log(`Uploaded ${successfulUploads.length} images to storage`);

      // Step 2: Send storage URLs to API for processing
      const response = await fetch('/api/appraise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          imageUrls: successfulUploads.map(u => u.url),
          imagePaths: successfulUploads.map(u => u.path),
          condition: request.condition,
          collectionId: request.collectionId,
        }),
      });

      if (!response.ok) {
        // Handle specific HTTP errors
        if (response.status === 413) {
          throw new Error('Images are too large. Please use smaller images or fewer photos.');
        }

        // Try to parse JSON error, fallback to status text
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response wasn't JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return result;

    } catch (e) {
      console.error("Error getting appraisal:", e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to get appraisal. ${errorMessage}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { getAppraisal, isLoading, error };
};
