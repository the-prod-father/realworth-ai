
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// App Router config - extend timeout for AI processing
// Requires Vercel Pro plan for > 60 seconds
export const maxDuration = 120;

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Initialize Supabase clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // For server-side operations

// Helper function to create authenticated Supabase client
function createAuthenticatedClient(authToken?: string) {
  if (authToken) {
    // Use the user's access token directly for authenticated requests
    // This ensures RLS policies are enforced correctly
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    });
  }
  // Fallback to anon key (for unauthenticated requests)
  return createClient(supabaseUrl, supabaseAnonKey);
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    itemName: { type: Type.STRING, description: "The title of the book or a concise name for the item." },
    author: { type: Type.STRING, description: "The author of the book. If not a book or not visible, state 'N/A'." },
    era: { type: Type.STRING, description: "The publication year of the book (e.g., '1924') or the estimated time period of the item (e.g., 'c. 1920s')." },
    category: { type: Type.STRING, description: "A single-word category for the item (e.g., 'Book', 'Painting', 'Tool', 'Record', 'Toy', 'Collectible')." },
    description: { type: Type.STRING, description: "A brief summary of the book's content or a physical description of the item. This should be formatted as a readable paragraph." },
    priceRange: {
      type: Type.OBJECT,
      properties: {
        low: { type: Type.NUMBER, description: "The low end of the estimated value range as a number." },
        high: { type: Type.NUMBER, description: "The high end of the estimated value range as a number." }
      },
      required: ["low", "high"]
    },
    currency: { type: Type.STRING, description: "The currency for the price range, e.g., USD." },
    reasoning: { type: Type.STRING, description: "A step-by-step explanation of how the value was determined, considering the item's visual details, condition, rarity, and current market trends." },
    references: {
      type: Type.ARRAY,
      description: "An array of reference sources used to determine the price range. Each reference should include a title and URL to external marketplaces, auction results, or price guides that support the valuation.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A descriptive title for the reference source (e.g., 'AbeBooks - Similar Edition', 'eBay Recent Sales', 'Heritage Auctions')." },
          url: { type: Type.STRING, description: "The URL to the reference source. Use real, publicly accessible URLs to marketplaces like eBay, AbeBooks, Amazon, auction houses, or price guide websites." }
        },
        required: ["title", "url"]
      }
    },
    confidenceScore: { type: Type.NUMBER, description: "A confidence score from 0-100 indicating how certain the appraisal is. Consider: image clarity, item identifiability, market data availability, and condition assessment accuracy. 90-100 = very high (clear images, well-known item, abundant market data), 70-89 = high (good identification, solid comparables), 50-69 = moderate (some uncertainty in identification or pricing), below 50 = low confidence (poor image, rare item, limited data)." },
    confidenceFactors: {
      type: Type.ARRAY,
      description: "List of 2-4 factors that contributed to the confidence score, both positive and negative.",
      items: {
        type: Type.OBJECT,
        properties: {
          factor: { type: Type.STRING, description: "The factor name (e.g., 'Image Quality', 'Market Data', 'Item Identification', 'Condition Assessment')" },
          impact: { type: Type.STRING, description: "Whether this factor is 'positive', 'neutral', or 'negative'" },
          detail: { type: Type.STRING, description: "Brief explanation of how this factor affects confidence" }
        },
        required: ["factor", "impact", "detail"]
      }
    },
    seriesIdentifier: { type: Type.STRING, description: "If this item is part of a series or collection, identify its position (e.g., 'Book 3', '1942-D', 'Issue #47'). Leave empty if not applicable." },
    validationStatus: { type: Type.STRING, description: "If validating for a collection: 'valid' if item belongs, 'warning' if it has issues, 'mismatch' if it doesn't belong. Leave empty if not validating." },
    validationNotes: { type: Type.STRING, description: "Explanation for the validation status. Why does or doesn't this item belong to the collection?" }
  },
  required: ["itemName", "author", "era", "category", "description", "priceRange", "currency", "reasoning", "references", "confidenceScore", "confidenceFactors"]
};

export async function POST(req: NextRequest) {
  try {
    // Accept JSON body with image URLs (uploaded directly to Supabase Storage)
    const body = await req.json();
    const { imageUrls, imagePaths, condition, collectionId } = body as {
      imageUrls: string[];
      imagePaths: string[];
      condition: string;
      collectionId?: string;
    };

    // Get auth token from Authorization header
    const authHeader = req.headers.get('authorization');
    const authToken = authHeader?.replace('Bearer ', '');

    // Create Supabase client
    const supabase = createAuthenticatedClient(authToken);

    // Input validation
    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ error: 'No images provided.' }, { status: 400 });
    }

    // Limit number of images to prevent abuse
    const MAX_IMAGES = 5;
    if (imageUrls.length > MAX_IMAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IMAGES} images allowed per appraisal.` },
        { status: 400 }
      );
    }

    // Validate image URLs are from our storage
    const validUrlPattern = /^https:\/\/[a-z]+\.supabase\.co\/storage\/v1\/object\/public\//;
    for (const url of imageUrls) {
      if (!validUrlPattern.test(url)) {
        return NextResponse.json(
          { error: 'Invalid image URL. Images must be uploaded through the app.' },
          { status: 400 }
        );
      }
    }

    // Get user ID if authenticated
    let userId: string | null = null;
    if (authToken) {
      const { data: { user } } = await supabase.auth.getUser(authToken);
      userId = user?.id || null;
    }

    // SERVER-SIDE LIMIT ENFORCEMENT - Cannot be bypassed
    if (userId) {
      // Import dynamically to avoid issues with server-side rendering
      const { subscriptionService, FREE_APPRAISAL_LIMIT } = await import('@/services/subscriptionService');

      const { canCreate, remaining, isPro, currentCount } = await subscriptionService.canCreateAppraisal(userId);

      if (!canCreate) {
        console.log('[Appraise API] FREE LIMIT REACHED:', { userId, currentCount, limit: FREE_APPRAISAL_LIMIT });
        return NextResponse.json(
          {
            error: 'Monthly appraisal limit reached',
            code: 'LIMIT_REACHED',
            message: `You've used all ${FREE_APPRAISAL_LIMIT} free appraisals this month. Upgrade to Pro for unlimited appraisals!`,
            currentCount,
            limit: FREE_APPRAISAL_LIMIT,
            requiresUpgrade: true
          },
          { status: 403 }
        );
      }

      console.log('[Appraise API] Limit check passed:', { userId, currentCount, remaining, isPro });
    }

    // Fetch collection details if collectionId is provided
    let collectionContext = '';
    let collectionName = '';
    if (collectionId && userId) {
      const { data: collection } = await supabase
        .from('collections')
        .select('name, description, category, expected_items')
        .eq('id', collectionId)
        .eq('user_id', userId)
        .single();

      if (collection) {
        collectionName = collection.name;
        const existingItems = collection.expected_items || [];
        collectionContext = `
IMPORTANT - Collection Validation:
This item is being added to a collection called "${collection.name}".
${collection.description ? `Collection description: ${collection.description}` : ''}
${collection.category ? `Collection category: ${collection.category}` : ''}
${existingItems.length > 0 ? `Expected items in collection: ${existingItems.join(', ')}` : ''}

You must also provide validation feedback:
- If this item clearly belongs to this collection, set validationStatus to "valid"
- If this item might belong but has issues (wrong edition, condition mismatch), set validationStatus to "warning" with explanation
- If this item does NOT belong to this collection (wrong series, different author), set validationStatus to "mismatch" with explanation
- Identify the item's position in the series if applicable (e.g., "Book 3", "1942 Penny")`;
      }
    }

    // Fetch images from storage URLs and convert to base64
    const imageParts = await Promise.all(imageUrls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from storage: ${url}`);
      }
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      return {
        inlineData: {
          data: Buffer.from(buffer).toString('base64'),
          mimeType: contentType,
        },
      };
    }));

    // Step 1: Get the detailed appraisal data
    const appraisalSystemInstruction = `You are an expert appraiser and archivist named 'RealWorth.ai'. Your task is to analyze images of an item and provide a detailed appraisal in a structured JSON format. If the item is a book, prioritize extracting its title, author, and publication year. Use the title for 'itemName', the author for 'author', and the year for 'era'. The 'description' should be a summary of the book. For other items, provide a descriptive name, era, and physical description. You must also determine a single-word 'category'. Provide an estimated market value and a rationale based on the item's details and its visual condition provided by the user. IMPORTANT: You must also provide 2-4 references with real URLs to external marketplaces (e.g., eBay, AbeBooks, Amazon, Heritage Auctions, Sotheby's, Christie's) or price guides that support your valuation. These references should be actual, publicly accessible URLs that users can visit to verify the pricing.${collectionContext}`;
    const appraisalTextPart = { text: `User-specified Condition: ${condition}${collectionContext ? '\n\n' + collectionContext : ''}` };
    
    const appraisalResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { role: 'user', parts: [...imageParts, appraisalTextPart] },
      config: {
        systemInstruction: appraisalSystemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    if (!appraisalResponse.text) {
      throw new Error("No text response from AI for appraisal.");
    }
    const appraisalData = JSON.parse(appraisalResponse.text.trim());

    // Step 2: Regenerate the image
    const imageRegenTextPart = { text: "Regenerate this image exactly as it is, without any changes." };
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { role: 'user', parts: [...imageParts, imageRegenTextPart] },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    let imageBuffer: Buffer | null = null;
    let imageMimeType: string | null = null;

    if (imageResponse.candidates?.[0]?.content?.parts) {
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData?.data && part.inlineData?.mimeType) {
          imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          imageMimeType = part.inlineData.mimeType;
          break;
        }
      }
    }

    if (!appraisalData || !imageBuffer || !imageMimeType) {
      throw new Error("AI response was incomplete.");
    }

    // Step 3: Upload regenerated image to storage (or use first uploaded image)
    let imageDataUrl: string;
    let imagePath: string | undefined;

    try {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileExt = imageMimeType.split('/')[1] || 'png';
      const fileName = `result-${timestamp}-${randomStr}.${fileExt}`;

      const filePath = userId
        ? `${userId}/results/${fileName}`
        : `public/results/${fileName}`;

      // Upload regenerated image with 10s timeout
      const uploadPromise = supabase.storage
        .from('appraisal-images')
        .upload(filePath, imageBuffer, {
          contentType: imageMimeType,
          cacheControl: '3600',
          upsert: false
        });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Storage upload timeout')), 10000)
      );

      const { error: uploadError } = await Promise.race([
        uploadPromise,
        timeoutPromise
      ]) as { data: unknown; error: { message: string } | null };

      if (uploadError) {
        throw new Error('Storage unavailable');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('appraisal-images')
        .getPublicUrl(filePath);

      imageDataUrl = publicUrl;
      imagePath = filePath;
      console.log('✅ Result image uploaded to storage');

    } catch (storageError) {
      // Fallback: use first uploaded image URL
      console.warn('Using original upload as fallback');
      imageDataUrl = imageUrls[0];
      imagePath = imagePaths[0];
    }

    // Step 4: Update user streak if authenticated
    let streakInfo = null;
    if (userId) {
      try {
        // Get current streak data
        const { data: userData } = await supabase
          .from('users')
          .select('current_streak, longest_streak, last_appraisal_date')
          .eq('id', userId)
          .single();

        if (userData) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = today.toISOString().split('T')[0];

          const lastAppraisalDate = userData.last_appraisal_date;
          let currentStreak = userData.current_streak || 0;
          let longestStreak = userData.longest_streak || 0;
          let isNewDay = false;
          let streakIncreased = false;
          let streakBroken = false;

          if (!lastAppraisalDate) {
            // First ever appraisal
            currentStreak = 1;
            isNewDay = true;
            streakIncreased = true;
          } else {
            const lastDate = new Date(lastAppraisalDate);
            lastDate.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff === 0) {
              // Same day
              isNewDay = false;
            } else if (daysDiff === 1) {
              // Yesterday - streak continues!
              currentStreak += 1;
              isNewDay = true;
              streakIncreased = true;
            } else {
              // Streak broken
              streakBroken = currentStreak > 0;
              currentStreak = 1;
              isNewDay = true;
            }
          }

          // Update longest if needed
          if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
          }

          // Save to database
          await supabase
            .from('users')
            .update({
              current_streak: currentStreak,
              longest_streak: longestStreak,
              last_appraisal_date: todayStr,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          streakInfo = {
            currentStreak,
            longestStreak,
            isNewDay,
            streakIncreased,
            streakBroken,
          };
        }
      } catch (streakError) {
        console.error('Error updating streak:', streakError);
        // Don't fail the appraisal if streak update fails
      }

      // SERVER-SIDE INCREMENT - Ensures count is always updated after successful appraisal
      try {
        const { subscriptionService } = await import('@/services/subscriptionService');
        const incrementResult = await subscriptionService.incrementAppraisalCount(userId);
        console.log('[Appraise API] Incremented appraisal count:', incrementResult);
      } catch (incrementError) {
        console.error('[Appraise API] Failed to increment count (non-blocking):', incrementError);
        // Don't fail the appraisal - the check at the start is the gatekeeper
      }
    }

    return NextResponse.json({
      appraisalData,
      imageDataUrl,
      imagePath, // Return path if storage was used
      imageUrls, // All uploaded image URLs
      userId: userId || undefined,
      usedStorage: !!imagePath, // Indicate if storage was used
      collectionId: collectionId || undefined,
      collectionName: collectionName || undefined,
      validation: collectionId ? {
        status: appraisalData.validationStatus || 'valid',
        notes: appraisalData.validationNotes || '',
        seriesIdentifier: appraisalData.seriesIdentifier || ''
      } : undefined,
      streakInfo, // Streak data for gamification
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error in appraisal API route:', errorMessage);
    console.error('Stack trace:', errorStack);

    // Return more specific error for debugging
    return NextResponse.json({
      error: `Failed to get appraisal from AI. ${errorMessage}`
    }, { status: 500 });
  }
}
