
import { useState } from 'react';
import { AppraisalRequest, AppraisalResult } from '@/lib/types';
import { supabase } from '@/lib/supabase';

type AppraisalOutput = {
    appraisalData: Omit<AppraisalResult, 'id' | 'image'>;
    imageDataUrl: string;
    imagePath?: string;
    userId?: string;
} | null;

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

    // Get auth token if user is logged in
    let authToken: string | undefined;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token;
    } catch (e) {
      // User not logged in, continue without token
      console.log('No auth session found, proceeding without authentication');
    }

    const formData = new FormData();

    // Compress images before uploading to avoid 413 errors
    const compressedFiles = await Promise.all(
      request.files.map(file => compressImage(file))
    );

    // Check if total size is within limits
    if (!checkTotalSize(compressedFiles)) {
      const totalMB = compressedFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024;
      setError(`Images total ${totalMB.toFixed(1)}MB which exceeds the 4.5MB limit. Please use fewer photos or take photos at lower resolution.`);
      setIsLoading(false);
      return null;
    }

    compressedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('condition', request.condition);

    try {
      const headers: HeadersInit = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch('/api/appraise', {
        method: 'POST',
        headers,
        body: formData,
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
