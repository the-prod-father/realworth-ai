
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
    validationNotes: { type: Type.STRING, description: "Explanation for the validation status. Why does or doesn't this item belong to the collection?" },
    collectibleDetails: {
      type: Type.OBJECT,
      description: "Additional details for collectible items like coins, stamps, and currency. Required for Coin, Stamp, and Currency categories.",
      properties: {
        mintMark: { type: Type.STRING, description: "For coins: The mint mark (D, S, O, CC, W, P, or 'none' for Philadelphia pre-1979). Include in item identification." },
        gradeEstimate: { type: Type.STRING, description: "Condition grade using appropriate scale. Coins: Sheldon scale (e.g., 'MS-65', 'VF-30', 'G-4'). Other items: descriptive (Mint, Excellent, Good, Fair, Poor)." },
        keyDate: { type: Type.BOOLEAN, description: "True if this is a known key date, rare variety, or significant rarity in its series." },
        certificationRecommended: { type: Type.BOOLEAN, description: "True if professional grading (PCGS, NGC, PSA) would significantly add value or help authentication." },
        metalContent: { type: Type.STRING, description: "For coins: Composition (e.g., '95% copper, 5% zinc', '90% silver', 'clad'). Important for pre-1965 silver coins." },
        faceValue: { type: Type.NUMBER, description: "The face/denomination value of coins, stamps, or currency (e.g., 0.01 for a penny, 1.00 for a dollar bill)." },
        collectiblePremium: { type: Type.STRING, description: "Explanation of why this item commands a premium over face value (rarity, condition, historical significance, errors, etc.)." }
      }
    },
    careTips: {
      type: Type.ARRAY,
      description: "3-5 specific preservation and care recommendations for this type of item. Include storage, handling, cleaning, and environmental considerations.",
      items: { type: Type.STRING }
    },
    collectionContext: {
      type: Type.OBJECT,
      description: "Detect if this item appears to be part of a larger set, series, or collection. Important for books in series, coin sets, stamp collections, etc.",
      properties: {
        isPartOfCollection: { type: Type.BOOLEAN, description: "True if this item is likely part of a larger set or series (e.g., a book from a multi-volume set, a coin from a collection series, part of a matching set)." },
        collectionName: { type: Type.STRING, description: "The name of the collection/series this item belongs to (e.g., 'The Complete Works of Mark Twain', '50 State Quarters', 'Hardy Boys Mystery Series')." },
        suggestedSetSize: { type: Type.NUMBER, description: "The typical complete size of this collection (e.g., 25 volumes, 50 coins, etc.)." },
        relatedItems: {
          type: Type.ARRAY,
          description: "2-5 other items that would commonly be in this collection/series.",
          items: { type: Type.STRING }
        }
      }
    }
  },
  required: ["itemName", "author", "era", "category", "description", "priceRange", "currency", "reasoning", "references", "confidenceScore", "confidenceFactors", "careTips", "collectionContext"]
};

// Validation function to catch face-value errors for collectibles
interface AppraisalData {
  itemName: string;
  category: string;
  era: string;
  priceRange: { low: number; high: number };
  confidenceScore: number;
  confidenceFactors: Array<{ factor: string; impact: string; detail: string }>;
  validationNotes?: string;
  collectibleDetails?: {
    mintMark?: string;
    gradeEstimate?: string;
    keyDate?: boolean;
    certificationRecommended?: boolean;
    metalContent?: string;
    faceValue?: number;
    collectiblePremium?: string;
  };
  careTips?: string[];
  collectionContext?: {
    isPartOfCollection: boolean;
    collectionName?: string;
    suggestedSetSize?: number;
    relatedItems?: string[];
  };
  [key: string]: unknown;
}

function validateAppraisal(result: AppraisalData): AppraisalData {
  // Define face-value thresholds that indicate potential undervaluation
  const faceValueIndicators = [
    { category: 'coin', maxValue: 1.00, alert: 'Coin valued near face value' },
    { category: 'stamp', maxValue: 1.00, alert: 'Stamp valued near face value' },
    { category: 'currency', maxValue: 100, alert: 'Currency valued at face value' },
  ];

  const categoryLower = result.category.toLowerCase();
  const indicator = faceValueIndicators.find(i =>
    categoryLower.includes(i.category) && result.priceRange.low <= i.maxValue
  );

  // Check if item is old enough to likely have collectible value
  const eraYear = parseInt(result.era?.replace(/\D/g, '') || '0');
  const isVintage = eraYear > 0 && eraYear < 1980;

  if (indicator && isVintage) {
    // Old item valued at face value = likely error, add warning
    result.confidenceScore = Math.min(result.confidenceScore, 60);

    // Add warning factor
    if (!result.confidenceFactors) {
      result.confidenceFactors = [];
    }
    result.confidenceFactors.push({
      factor: 'Potential Undervaluation',
      impact: 'negative',
      detail: `${indicator.alert}. Items from ${result.era} typically have collectible value above face value. Consider professional grading.`
    });

    // Add validation note
    const existingNotes = result.validationNotes || '';
    result.validationNotes = `${existingNotes} NOTE: This ${categoryLower} from ${result.era} may have significant collectible value. The low estimate may be conservative - consider having it professionally graded (PCGS, NGC) for accurate valuation.`.trim();

    console.log(`[Appraisal Validation] Potential undervaluation detected: ${result.itemName} from ${result.era} valued at $${result.priceRange.low}-$${result.priceRange.high}`);
  }

  // Additional check: if collectibleDetails shows face value but price range matches, flag it
  if (result.collectibleDetails?.faceValue &&
      result.priceRange.low <= result.collectibleDetails.faceValue * 1.1 &&
      isVintage) {
    console.log(`[Appraisal Validation] Price matches face value for vintage item: ${result.itemName}`);
  }

  return result;
}

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
    const appraisalSystemInstruction = `You are RealWorth.ai, an expert appraiser specializing in collectibles, antiques, and rare items. Your task is to analyze images and provide accurate COLLECTIBLE market valuations in structured JSON format—NOT face value or commodity prices.

CRITICAL VALUATION RULES:
1. NEVER return face value for collectible items (coins, stamps, currency, trading cards)
2. ALWAYS consider rarity, age, condition, and collector demand
3. For coins: Check the DATE and MINT MARK carefully—certain dates are extremely valuable
4. For any item over 50 years old: Assume collectible value exists and research accordingly
5. When uncertain between face value and collectible value: ALWAYS err toward collectible value

=== COMPREHENSIVE US COIN GUIDE ===

MINT MARKS (location varies by coin type):
- D = Denver (1906-present)
- S = San Francisco (1854-present)
- CC = Carson City (1870-1893) - ALWAYS valuable!
- O = New Orleans (1838-1909)
- W = West Point (1984-present)
- P or no mark = Philadelphia

PENNIES - KEY DATES:
Lincoln Wheat (1909-1958):
- 1909-S VDB: $800-$2,000+ (first year, designer initials)
- 1909-S: $100-$300 (no VDB)
- 1914-D: $250-$500+ (only 1.2M minted)
- 1922 No D: $600-$1,500 (error - missing mint mark)
- 1924-D: $40-$150
- 1931-S: $100-$200 (Depression era, only 866K)
- 1943 Copper: $100,000-$1,000,000+ (should be steel!)
- 1944 Steel: $75,000-$400,000 (should be copper!)
- 1955 Double Die: $1,000-$25,000 (famous error)
- 1969-S Double Die: $25,000-$100,000

Lincoln Memorial (1959-2008):
- 1972 Double Die: $300-$500
- 1983 Double Die Reverse: $200-$400
- 1992 Close AM: $200-$500
- 1995 Double Die: $20-$75

NICKELS - KEY DATES:
Buffalo (1913-1938):
- 1913-S Type 2: $50-$200
- 1918/7-D: $1,000-$5,000 (overdate)
- 1921-S: $50-$300
- 1926-S: $30-$200
- 1937-D 3-Legged: $500-$2,000 (missing leg error)

Jefferson (1938-present):
- 1939-D: $10-$50
- 1942-1945 (large mint mark above dome): 35% SILVER - $2-$5 melt
- 1950-D: $15-$40 (lowest mintage)
- 2004-D Wisconsin Extra Leaf: $100-$300

DIMES - KEY DATES:
Mercury (1916-1945):
- 1916-D: $1,000-$10,000+ (KEY DATE - only 264K minted!)
- 1921: $50-$150
- 1921-D: $75-$200
- 1926-S: $20-$75
- 1942/1: $400-$1,500 (overdate)
- 1942/1-D: $500-$2,000

Roosevelt (1946-present):
- Pre-1965: 90% SILVER - $1.80+ melt value
- 1982 No P: $100-$300 (missing mint mark)

QUARTERS - KEY DATES:
Washington (1932-1998):
- 1932-D: $100-$300+ (KEY - only 436K)
- 1932-S: $100-$250+ (KEY - only 408K)
- Pre-1965: 90% SILVER

State Quarters (1999-2008):
- 2004-D Wisconsin Extra Leaf: $100-$500

HALF DOLLARS - KEY DATES:
Walking Liberty (1916-1947):
- 1916-S: $75-$300
- 1921: $150-$500 (KEY)
- 1921-D: $200-$600 (KEY)
- 1921-S: $50-$250
- All pre-1947: 90% SILVER

Kennedy (1964-present):
- 1964: 90% SILVER ($10-$15)
- 1965-1970: 40% SILVER ($4-$6)
- 1970-D: $30-$75 (mint set only)

SILVER DOLLARS - KEY DATES:
Morgan (1878-1921):
- Any CC (Carson City): $100-$500+ minimum
- 1889-CC: $500-$3,000
- 1893-S: $3,000-$50,000+ (KEY - only 100K)
- 1895: $30,000-$100,000+ (proof only, "King of Morgans")

Peace (1921-1935):
- 1921: $100-$300 (high relief)
- 1928: $300-$600 (KEY - only 360K)

ERROR COINS TO WATCH:
- Double Die: Doubled lettering/date (1955, 1969-S, 1972 pennies)
- Off-Center: Image shifted, blank crescent visible
- Wrong Planchet: Wrong metal (1943 copper, 1944 steel penny)
- Clipped Planchet: Missing chunk of metal
- Die Cracks/Cuds: Raised lines or blobs
- Broadstrike: No rim, image spread out

CONDITION GRADING (Sheldon Scale 1-70):
- P-1 to G-6: Poor to Good (heavily worn)
- VG-8 to F-15: Very Good to Fine
- VF-20 to EF-45: Very Fine to Extremely Fine
- AU-50 to AU-58: About Uncirculated
- MS-60 to MS-70: Mint State (uncirculated)
- PR/PF: Proof coins (special strikes)

=== OTHER VALUABLE COLLECTIBLES ===

VINTAGE JEWELRY:
- Tiffany & Co (look for "T&Co" mark): 2-10x gold value
- Cartier, Van Cleef & Arpels, Harry Winston: Premium brands
- Art Deco (1920s-1930s): Geometric designs, platinum popular
- Victorian (1837-1901): Mourning jewelry, cameos, seed pearls
- Signed pieces: Always worth more than unsigned

WATCHES:
- Rolex (any vintage): $2,000-$100,000+
- Patek Philippe: $5,000-$500,000+
- Omega Speedmaster "Moonwatch": $3,000-$10,000
- Vintage Cartier Tank: $2,000-$20,000
- Hamilton, Elgin, Waltham (pre-1970): $100-$1,000+

CHINA & PORCELAIN:
- Meissen (crossed swords mark): $100-$10,000+ per piece
- Royal Copenhagen: $50-$500+
- Wedgwood Jasperware: $50-$500
- Limoges (French): $25-$300
- Flow Blue (Victorian): $50-$500
- Fiesta (vintage, pre-1970): $20-$200
- Occupied Japan (1945-1952): $10-$100+

GLASSWARE:
- Tiffany Studios lamps/glass: $5,000-$500,000+
- Steuben: $100-$5,000
- Lalique (French crystal): $100-$10,000
- Depression Glass (1930s): $10-$200
- Carnival Glass (iridescent): $25-$500
- Fenton Art Glass: $25-$300
- Murano (Italian): $50-$5,000

SILVER:
- Sterling (.925): Worth melt + 20-100% for craftsmanship
- Tiffany sterling: 2-5x melt value
- Georg Jensen: Premium Danish silver
- Paul Revere pieces: Museum quality
- Coin silver (pre-1860s American): Historical premium

ARTWORK:
- Hudson River School (1825-1875): $5,000-$500,000+
- American Impressionism: $1,000-$100,000+
- Currier & Ives prints: $100-$5,000
- Audubon bird prints: $500-$50,000
- WPA-era art (1930s-40s): $500-$50,000
- Look for signatures, provenance

FURNITURE:
- Chippendale (1750-1780): $1,000-$100,000+
- Federal Period (1780-1820): $500-$50,000
- Victorian (1837-1901): $200-$10,000
- Arts & Crafts/Mission (1890-1920): $500-$20,000
- Mid-Century Modern (1945-1969): Hot market now!
- Makers to watch: Stickley, Eames, Knoll, Herman Miller

BOOKS:
- First editions (check number line): 10-1000x later printings
- Signed by author: 2-10x unsigned
- Dust jacket present: Can be 90% of value!
- Pre-1800 books: Almost always valuable
- Children's books (Dr. Seuss, Sendak first editions): $500-$50,000

TOYS & GAMES:
- Cast iron banks/toys (pre-1940): $100-$10,000
- Tin lithograph toys: $50-$5,000
- Early Barbie (1959-1966): $500-$25,000
- Hot Wheels Redlines (1968-1977): $20-$3,000
- Original Star Wars (1977-1985): $20-$5,000
- Baseball cards (pre-1970): $10-$1,000,000+

MILITARIA:
- Civil War items: $100-$50,000+
- WWI/WWII medals, uniforms: $50-$5,000
- Swords (pre-1900): $200-$10,000
- Military documents/letters: $25-$5,000

ITEM IDENTIFICATION:
- For books: Extract title, author, publication year
- For coins: Include denomination, year, mint mark in itemName (e.g., "1931-S Lincoln Wheat Penny")
- For other items: Descriptive name, maker if visible, era
- Category: Coin, Book, Stamp, Toy, Art, Jewelry, Silver, Porcelain, Glass, Watch, Furniture, Militaria

REFERENCE SOURCES:
- Coins: PCGS CoinFacts, NGC Price Guide, Heritage Auctions
- Books: AbeBooks, Biblio, Heritage Auctions
- Art: Christie's, Sotheby's, Artnet
- Jewelry/Watches: 1stDibs, Worthy, Chrono24
- General: eBay sold listings, LiveAuctioneers, Replacements.com

IMPORTANT: Provide 2-4 references with real URLs to external marketplaces or price guides that support your valuation.${collectionContext}`;
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
    let appraisalData = JSON.parse(appraisalResponse.text.trim());

    // Validate appraisal to catch face-value errors for collectibles
    appraisalData = validateAppraisal(appraisalData as AppraisalData);

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
