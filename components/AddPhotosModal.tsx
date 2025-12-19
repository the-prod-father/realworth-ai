'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

interface AddPhotosModalProps {
  appraisalId: string;
  currentImageCount: number;
  onClose: () => void;
  onSuccess: (result: {
    imageCount: number;
    reanalyzed: boolean;
    appraisalData?: unknown;
    previousValue?: { low: number; high: number };
    newValue?: { low: number; high: number };
  }) => void;
  collectionContext?: {
    isPartOfSet: boolean;
    setName?: string;
    photographyTips?: string;
    totalItemsInSet?: number;
  };
}

export const AddPhotosModal: React.FC<AddPhotosModalProps> = ({
  appraisalId,
  currentImageCount,
  onClose,
  onSuccess,
  collectionContext,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure client-side only rendering
  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [reanalyze, setReanalyze] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit total images
    const maxImages = 10;
    const availableSlots = maxImages - currentImageCount;

    if (files.length > availableSlots) {
      setError(`You can only add ${availableSlots} more image${availableSlots === 1 ? '' : 's'}`);
      return;
    }

    setSelectedFiles(files);
    setError(null);

    // Generate previews
    const newPreviews: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === files.length) {
          setPreviews([...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!session?.access_token || selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      // Upload files to Supabase Storage
      const uploadedUrls: string[] = [];

      for (const file of selectedFiles) {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `additional-${timestamp}-${randomStr}.${fileExt}`;
        const filePath = `${session.user.id}/${appraisalId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('appraisal-images')
          .upload(filePath, file, {
            contentType: file.type,
            cacheControl: '3600',
          });

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('appraisal-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      // Call API to add images and optionally reanalyze
      const response = await fetch(`/api/appraise/${appraisalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          imageUrls: uploadedUrls,
          reanalyze,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add photos');
      }

      const result = await response.json();
      onSuccess(result);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const defaultRecommendedPhotos = [
    'Front view',
    'Back view',
    'Spine (for books)',
    'Copyright/maker\'s mark',
    'Any damage or wear',
    'Size reference',
  ];

  // Use collection-specific tips from Stewart if available
  const collectionTips = collectionContext?.photographyTips
    ? collectionContext.photographyTips.split(/[,.]/).filter(t => t.trim()).map(t => t.trim())
    : [];

  const recommendedPhotos = collectionTips.length > 0 ? collectionTips : defaultRecommendedPhotos;

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className={`p-6 border-b ${collectionContext?.isPartOfSet ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {collectionContext?.isPartOfSet && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shrink-0">
                  <span className="text-white text-lg font-bold">S</span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {collectionContext?.isPartOfSet ? 'Add More to Your Collection' : 'Add Photos'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {collectionContext?.isPartOfSet && collectionContext.setName
                    ? `Building: ${collectionContext.setName}`
                    : `${currentImageCount} photo${currentImageCount !== 1 ? 's' : ''} already added`
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Tips */}
          <div className="mb-6 p-4 bg-teal-50 rounded-xl">
            <h4 className="font-semibold text-teal-800 text-sm mb-2">Recommended photos:</h4>
            <div className="flex flex-wrap gap-2">
              {recommendedPhotos.map((tip, i) => (
                <span key={i} className="text-xs bg-white text-teal-700 px-2 py-1 rounded-full">
                  {tip}
                </span>
              ))}
            </div>
          </div>

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Upload Area */}
          {previews.length === 0 ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-teal-400 hover:bg-teal-50 transition-all text-center"
            >
              <svg className="w-10 h-10 mx-auto text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-medium text-slate-700">Click to select photos</p>
              <p className="text-sm text-slate-500 mt-1">JPG, PNG up to 10MB each</p>
            </button>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {previews.map((preview, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                    <img src={preview} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50 transition-all flex items-center justify-center"
                >
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Reanalyze Toggle */}
          {previews.length > 0 && (
            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={reanalyze}
                onChange={(e) => setReanalyze(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
              />
              <div>
                <p className="font-medium text-slate-800">Re-analyze with new photos</p>
                <p className="text-sm text-slate-500">
                  Get an updated valuation based on all images
                </p>
              </div>
            </label>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 py-3 px-4 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="flex-1 py-3 px-4 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {reanalyze ? 'Analyzing...' : 'Uploading...'}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Add {selectedFiles.length} Photo{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
