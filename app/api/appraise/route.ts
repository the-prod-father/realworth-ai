
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

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
    reasoning: { type: Type.STRING, description: "A step-by-step explanation of how the value was determined, considering the item's visual details, condition, rarity, and current market trends." }
  },
  required: ["itemName", "author", "era", "category", "description", "priceRange", "currency", "reasoning"]
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const condition = formData.get('condition') as string;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded.' }, { status: 400 });
    }

    const imageParts = await Promise.all(files.map(async (file) => {
      const buffer = await file.arrayBuffer();
      return {
        inlineData: {
          data: Buffer.from(buffer).toString('base64'),
          mimeType: file.type,
        },
      };
    }));

    // Step 1: Get the detailed appraisal data
    const appraisalSystemInstruction = "You are an expert appraiser and archivist named 'RealWorth.ai'. Your task is to analyze images of an item and provide a detailed appraisal in a structured JSON format. If the item is a book, prioritize extracting its title, author, and publication year. Use the title for 'itemName', the author for 'author', and the year for 'era'. The 'description' should be a summary of the book. For other items, provide a descriptive name, era, and physical description. You must also determine a single-word 'category'. Finally, provide an estimated market value and a rationale based on the item's details and its visual condition provided by the user.";
    const appraisalTextPart = { text: `User-specified Condition: ${condition}` };
    
    const appraisalResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { role: 'user', parts: [...imageParts, appraisalTextPart] },
      config: {
        systemInstruction: appraisalSystemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });
    const appraisalData = JSON.parse(appraisalResponse.text.trim());

    // Step 2: Regenerate the image
    const imageRegenTextPart = { text: "Regenerate this image exactly as it is, without any changes." };
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { role: 'user', parts: [...imageParts, imageRegenTextPart] },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    let imageDataUrl: string | null = null;
    for (const part of imageResponse.candidates[0].content.parts) {
      if (part.inlineData) {
        imageDataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!appraisalData || !imageDataUrl) {
      throw new Error("AI response was incomplete.");
    }

    return NextResponse.json({ appraisalData, imageDataUrl });

  } catch (error) {
    console.error('Error in appraisal API route:', error);
    return NextResponse.json({ error: 'Failed to get appraisal from AI.' }, { status: 500 });
  }
}
