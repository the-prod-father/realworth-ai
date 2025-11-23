/**
 * Image quality detection utilities
 * Checks brightness, contrast, and overall image quality
 */

export interface ImageQualityResult {
  brightness: number; // 0-1, where 0 is black and 1 is white
  contrast: number; // 0-1, higher is better
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  warnings: string[];
}

/**
 * Analyze image quality from a canvas or image element
 */
export function analyzeImageQuality(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): ImageQualityResult {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return {
      brightness: 0.5,
      contrast: 0.5,
      quality: 'fair',
      warnings: ['Unable to analyze image quality'],
    };
  }

  // Set canvas size to match source
  if (imageSource instanceof HTMLVideoElement) {
    canvas.width = imageSource.videoWidth || imageSource.width;
    canvas.height = imageSource.videoHeight || imageSource.height;
  } else if (imageSource instanceof HTMLImageElement) {
    canvas.width = imageSource.naturalWidth || imageSource.width;
    canvas.height = imageSource.naturalHeight || imageSource.height;
  } else {
    canvas.width = imageSource.width;
    canvas.height = imageSource.height;
  }

  // Draw image to canvas
  ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Calculate brightness (average luminance)
  let totalBrightness = 0;
  let minBrightness = 255;
  let maxBrightness = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    // Calculate luminance using standard formula
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    totalBrightness += luminance;
    minBrightness = Math.min(minBrightness, luminance);
    maxBrightness = Math.max(maxBrightness, luminance);
  }

  const avgBrightness = totalBrightness / pixelCount;
  const normalizedBrightness = avgBrightness / 255;

  // Calculate contrast (difference between min and max brightness)
  const contrast = (maxBrightness - minBrightness) / 255;

  // Determine quality and warnings
  const warnings: string[] = [];
  let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'good';

  // Check brightness
  if (normalizedBrightness < 0.2) {
    warnings.push('Image is too dark. Try adding more light.');
    quality = 'poor';
  } else if (normalizedBrightness < 0.3) {
    warnings.push('Image is somewhat dark. Consider adding more light.');
    quality = quality === 'good' ? 'fair' : quality;
  } else if (normalizedBrightness > 0.9) {
    warnings.push('Image is too bright. Try reducing light or avoiding glare.');
    quality = 'poor';
  } else if (normalizedBrightness > 0.8) {
    warnings.push('Image is somewhat bright. Consider reducing light.');
    quality = quality === 'good' ? 'fair' : quality;
  }

  // Check contrast
  if (contrast < 0.2) {
    warnings.push('Low contrast detected. Ensure good lighting and clear subject.');
    quality = quality === 'poor' ? 'poor' : 'fair';
  } else if (contrast < 0.3) {
    warnings.push('Contrast could be better. Try improving lighting.');
    if (quality === 'good') quality = 'fair';
  }

  // Overall quality assessment
  if (normalizedBrightness >= 0.3 && normalizedBrightness <= 0.8 && contrast >= 0.3 && warnings.length === 0) {
    quality = 'excellent';
  } else if (normalizedBrightness >= 0.25 && normalizedBrightness <= 0.85 && contrast >= 0.25 && warnings.length <= 1) {
    quality = quality === 'poor' ? 'fair' : 'good';
  }

  return {
    brightness: normalizedBrightness,
    contrast,
    quality,
    warnings,
  };
}

/**
 * Quick check if image quality is acceptable for scanning
 */
export function isImageQualityAcceptable(quality: ImageQualityResult): boolean {
  return quality.quality !== 'poor' && quality.warnings.length <= 1;
}

