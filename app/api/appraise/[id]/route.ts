import { GoogleGenAI, Type, Modality } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Requires Vercel Pro plan for > 60 seconds
export const maxDuration = 120;

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function createAuthenticatedClient(authToken?: string) {
  if (authToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    });
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    itemName: { type: Type.STRING, description: "The title of the book or a concise name for the item." },
    author: { type: Type.STRING, description: "The author of the book. If not a book or not visible, state 'N/A'." },
    era: { type: Type.STRING, description: "The publication year or estimated time period." },
    category: { type: Type.STRING, description: "A single-word category for the item." },
    description: { type: Type.STRING, description: "A brief summary or physical description." },
    priceRange: {
      type: Type.OBJECT,
      properties: {
        low: { type: Type.NUMBER, description: "Low end of estimated value." },
        high: { type: Type.NUMBER, description: "High end of estimated value." }
      },
      required: ["low", "high"]
    },
    currency: { type: Type.STRING, description: "Currency for the price range." },
    reasoning: { type: Type.STRING, description: "Step-by-step explanation of valuation." },
    references: {
      type: Type.ARRAY,
      description: "Reference sources with URLs.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          url: { type: Type.STRING }
        },
        required: ["title", "url"]
      }
    }
  },
  required: ["itemName", "author", "era", "category", "description", "priceRange", "currency", "reasoning", "references"]
};

// PATCH - Update appraisal (add images, toggle visibility, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appraisalId } = await params;
    const body = await req.json();
    const { imageUrls, reanalyze, isPublic } = body as {
      imageUrls?: string[];
      reanalyze?: boolean;
      isPublic?: boolean;
    };

    const authHeader = req.headers.get('authorization');
    const authToken = authHeader?.replace('Bearer ', '');

    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabase = createAuthenticatedClient(authToken);
    const { data: { user } } = await supabase.auth.getUser(authToken);

    if (!user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Get current appraisal
    const { data: appraisal, error: fetchError } = await supabase
      .from('appraisals')
      .select('*')
      .eq('id', appraisalId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !appraisal) {
      return NextResponse.json({ error: 'Appraisal not found' }, { status: 404 });
    }

    // Handle visibility toggle (isPublic) - early return if only updating visibility
    if (isPublic !== undefined && (!imageUrls || imageUrls.length === 0)) {
      const { error: visibilityError } = await supabase
        .from('appraisals')
        .update({ is_public: isPublic })
        .eq('id', appraisalId)
        .eq('user_id', user.id);

      if (visibilityError) {
        console.error('Error updating visibility:', visibilityError);
        return NextResponse.json({ error: 'Failed to update visibility' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        isPublic,
      });
    }

    // Combine existing and new image URLs
    const existingUrls = appraisal.image_urls || [];
    const updatedUrls = [...existingUrls, ...(imageUrls || [])];

    // Update with new images
    const { error: updateError } = await supabase
      .from('appraisals')
      .update({
        image_urls: updatedUrls,
        image_count: updatedUrls.length,
      })
      .eq('id', appraisalId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to add images' }, { status: 500 });
    }

    // If reanalyze requested, run AI analysis on all images
    if (reanalyze) {
      // Fetch all images and convert to base64
      const imageParts = await Promise.all(updatedUrls.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        return {
          inlineData: {
            data: Buffer.from(buffer).toString('base64'),
            mimeType: contentType,
          },
        };
      }));

      const systemInstruction = `You are an expert appraiser named 'RealWorth.ai'. Analyze ALL provided images of this item together. Use all angles and details to provide the most accurate appraisal possible. Multiple images give you more context - look for condition details, markings, labels, and other identifying features across all photos.`;

      const textPart = { text: `This item has ${updatedUrls.length} photos. Analyze all images together for the most accurate appraisal.` };

      const appraisalResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { role: 'user', parts: [...imageParts, textPart] },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
        },
      });

      if (!appraisalResponse.text) {
        throw new Error("No response from AI");
      }

      const appraisalData = JSON.parse(appraisalResponse.text.trim());

      // Regenerate image
      const imageRegenTextPart = { text: "Regenerate this image exactly as it is." };
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { role: 'user', parts: [...imageParts, imageRegenTextPart] },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      let newImageUrl = appraisal.image_url;

      if (imageResponse.candidates?.[0]?.content?.parts) {
        for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType) {
            const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
            const imageMimeType = part.inlineData.mimeType;

            // Upload regenerated image
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(7);
            const fileExt = imageMimeType.split('/')[1] || 'png';
            const fileName = `result-${timestamp}-${randomStr}.${fileExt}`;
            const filePath = `${user.id}/results/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('appraisal-images')
              .upload(filePath, imageBuffer, {
                contentType: imageMimeType,
                cacheControl: '3600',
                upsert: false
              });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('appraisal-images')
                .getPublicUrl(filePath);
              newImageUrl = publicUrl;
            }
            break;
          }
        }
      }

      // Update appraisal with new analysis
      const { error: analysisError } = await supabase
        .from('appraisals')
        .update({
          item_name: appraisalData.itemName,
          author: appraisalData.author,
          era: appraisalData.era,
          category: appraisalData.category,
          description: appraisalData.description,
          price_low: appraisalData.priceRange.low,
          price_high: appraisalData.priceRange.high,
          currency: appraisalData.currency,
          reasoning: appraisalData.reasoning,
          references: appraisalData.references,
          image_url: newImageUrl,
          last_analyzed_at: new Date().toISOString(),
        })
        .eq('id', appraisalId)
        .eq('user_id', user.id);

      if (analysisError) {
        console.error('Error updating analysis:', analysisError);
      }

      return NextResponse.json({
        success: true,
        imageCount: updatedUrls.length,
        reanalyzed: true,
        appraisalData,
        imageUrl: newImageUrl,
        previousValue: {
          low: appraisal.price_low,
          high: appraisal.price_high,
        },
        newValue: appraisalData.priceRange,
      });
    }

    return NextResponse.json({
      success: true,
      imageCount: updatedUrls.length,
      reanalyzed: false,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in PATCH /api/appraise/[id]:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET - Fetch single appraisal
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appraisalId } = await params;
    const authHeader = req.headers.get('authorization');
    const authToken = authHeader?.replace('Bearer ', '');

    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const supabase = createAuthenticatedClient(authToken);
    const { data: { user } } = await supabase.auth.getUser(authToken);

    if (!user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    const { data: appraisal, error } = await supabase
      .from('appraisals')
      .select('*')
      .eq('id', appraisalId)
      .eq('user_id', user.id)
      .single();

    if (error || !appraisal) {
      return NextResponse.json({ error: 'Appraisal not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: appraisal.id,
      itemName: appraisal.item_name,
      author: appraisal.author,
      era: appraisal.era,
      category: appraisal.category,
      description: appraisal.description,
      priceRange: {
        low: appraisal.price_low,
        high: appraisal.price_high,
      },
      currency: appraisal.currency,
      reasoning: appraisal.reasoning,
      references: appraisal.references,
      image: appraisal.image_url,
      images: appraisal.image_urls || [],
      imageCount: appraisal.image_count || 1,
      timestamp: new Date(appraisal.created_at).getTime(),
      lastAnalyzedAt: appraisal.last_analyzed_at,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in GET /api/appraise/[id]:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
