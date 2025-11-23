import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { subscriptionService } from '@/services/subscriptionService';
import { chatService } from '@/services/chatService';
import { supabase } from '@/lib/supabase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(request: NextRequest) {
  try {
    const { userId, message, appraisalId, appraisalContext } = await request.json();

    if (!userId || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify user is Pro
    const isPro = await subscriptionService.isPro(userId);
    if (!isPro) {
      return new Response(JSON.stringify({ error: 'Pro subscription required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Save user message
    await chatService.saveMessage(userId, 'user', message, appraisalId);

    // Get recent conversation history
    const history = await chatService.getRecentMessages(userId, appraisalId, 10);

    // Build system instruction based on context
    let systemInstruction = '';

    if (appraisalId && appraisalContext) {
      // Item-specific chat
      systemInstruction = `You are an expert appraiser and antiques specialist assisting with questions about a specific item.

Item Details:
- Name: ${appraisalContext.itemName}
- Author/Maker: ${appraisalContext.author || 'Unknown'}
- Era: ${appraisalContext.era}
- Category: ${appraisalContext.category}
- Estimated Value: $${appraisalContext.priceRange.low} - $${appraisalContext.priceRange.high} ${appraisalContext.currency}
- Description: ${appraisalContext.description}

Previous Appraisal Reasoning:
${appraisalContext.reasoning}

Help the user understand more about this specific item. You can:
- Explain what makes it valuable or collectible
- Suggest where to sell it (auction houses, dealers, online marketplaces)
- Discuss investment potential and market trends
- Provide care and preservation tips
- Identify similar items or related collectibles
- Explain historical or cultural significance

Be helpful, specific, and draw on the item details provided. Keep responses conversational but informative.`;
    } else {
      // Global chat - get summary of user's collection
      const { data: appraisals } = await supabase
        .from('appraisals')
        .select('item_name, category, price_low, price_high, currency')
        .eq('user_id', userId)
        .is('archived_at', null)
        .limit(50);

      const collectionSummary = appraisals && appraisals.length > 0
        ? appraisals.map(a => `${a.item_name} (${a.category}): $${a.price_low}-$${a.price_high}`).join('\n')
        : 'No items appraised yet';

      const totalLow = appraisals?.reduce((sum, a) => sum + Number(a.price_low), 0) || 0;
      const totalHigh = appraisals?.reduce((sum, a) => sum + Number(a.price_high), 0) || 0;

      systemInstruction = `You are an expert appraiser and collection advisor helping a user manage their collection.

User's Collection Summary (${appraisals?.length || 0} items):
${collectionSummary}

Total Estimated Value: $${totalLow.toLocaleString()} - $${totalHigh.toLocaleString()}

Help the user with:
- Collection analysis and portfolio advice
- Insurance recommendations
- Most valuable items to prioritize
- Market trends and investment potential
- Selling strategies across different categories
- Storage and preservation tips
- Authentication and documentation advice

Be helpful and provide specific, actionable advice based on their actual collection. Keep responses conversational but professional.`;
    }

    // Build conversation messages
    const messages = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // Add current message
    messages.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Create streaming response
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await ai.models.generateContentStream({
            model: 'gemini-2.0-flash',
            contents: messages,
            config: {
              systemInstruction,
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          });

          for await (const chunk of response) {
            const text = chunk.text || '';
            fullResponse += text;
            controller.enqueue(encoder.encode(text));
          }

          // Save assistant response after streaming completes
          await chatService.saveMessage(userId, 'assistant', fullResponse, appraisalId);

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Chat failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
