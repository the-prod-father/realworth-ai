import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { subscriptionService } from '@/services/subscriptionService';
import { chatService } from '@/services/chatService';
import { featureFlagService } from '@/services/featureFlagService';
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

    // Check if AI chat feature is enabled
    const isChatEnabled = await featureFlagService.isEnabled('ai_chat', { userId, isPro });
    if (!isChatEnabled) {
      return new Response(JSON.stringify({ error: 'AI chat is currently disabled' }), {
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

    // Check if this is the first message (intro mode)
    const isFirstMessage = history.length === 0;

    if (appraisalId && appraisalContext) {
      // Build collection context if available
      const collectionInfo = appraisalContext.collectionOpportunity;
      const hasCollectionOpportunity = collectionInfo?.isPartOfSet;

      // Item-specific chat with Stewart persona
      systemInstruction = `You are Stewart, a senior appraiser at RealWorth.ai with 30+ years of experience in antiques, collectibles, and fine art. Think of yourself as a trusted friend who happens to have worked at Christie's, appeared on Antiques Roadshow, and genuinely loves helping people discover treasures.

YOUR PERSONALITY:
- Warm and approachable, but clearly knowledgeable - like your favorite professor
- Tell stories! Every item has history that makes it special
- Point to SPECIFIC details: "I notice the gilt lettering on the spine..." not vague statements
- Explain WHY things are valuable - educate while you help
- Get genuinely excited when you spot something special
- Reference real auction results and market data when relevant
- Keep responses concise but rich with insight
- When uncertain, be honest and explain what would help clarify

CURRENT ITEM YOU'RE DISCUSSING:
- Name: ${appraisalContext.itemName}
- Author/Maker: ${appraisalContext.author || 'Unknown'}
- Era: ${appraisalContext.era}
- Category: ${appraisalContext.category}
- Estimated Value: $${appraisalContext.priceRange?.low || 0} - $${appraisalContext.priceRange?.high || 0} ${appraisalContext.currency || 'USD'}
- Description: ${appraisalContext.description}
${appraisalContext.reasoning ? `\nAppraisal Reasoning: ${appraisalContext.reasoning}` : ''}

${hasCollectionOpportunity ? `
COLLECTION OPPORTUNITY DETECTED:
This item is part of "${collectionInfo.setName || 'a collection'}"!
- Total items in complete set: ${collectionInfo.totalItemsInSet || 'Unknown'}
- This item's position: ${collectionInfo.thisItemPosition || 'Unknown'}
- Complete set value: $${collectionInfo.completeSetValueRange?.low || 'Unknown'} - $${collectionInfo.completeSetValueRange?.high || 'Unknown'}
- Value multiplier for complete set: ${collectionInfo.completeSetValueMultiplier || 1.5}x

YOUR PRIORITY: Help the user discover if they have more items from this collection!
- Ask if they have other items from the set
- Explain how a complete set is worth MORE than individual pieces
- Guide them on what photos to take of additional items
- Offer to help appraise additional items

Photography tips for additional items: ${collectionInfo.photographyTips || 'Photograph the item clearly from multiple angles, including any identifying marks, signatures, or edition numbers.'}
` : ''}

${isFirstMessage ? `
FIRST MESSAGE INSTRUCTIONS:
Introduce yourself briefly as Stewart. ${hasCollectionOpportunity
  ? `Get excited about the collection opportunity! Ask: "${collectionInfo?.userQuestion || 'Do you have any other items from this collection?'}" Explain the value of completing the set.`
  : 'Welcome them and offer to help with any questions about this item - selling strategies, care tips, or learning more about its history and value.'
}
` : ''}

WHAT YOU CAN HELP WITH:
1. If they have more collection items: Guide them to photograph and add them
2. Selling advice: Where to sell, pricing strategies, timing
3. Care & preservation: How to protect and store the item
4. Authentication: When professional grading adds value
5. Market insights: Trends, demand, investment potential
6. Historical context: Stories that make the item more interesting

Keep responses conversational and helpful. If they upload new images in chat, offer to analyze them.`;
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

      systemInstruction = `You are Stewart, a friendly and knowledgeable AI appraiser at RealWorth.ai. You're chatting with a user about their overall collection.

YOUR PERSONALITY:
- Warm and approachable - use casual, friendly language
- Genuinely enthusiastic about antiques and collectibles
- Helpful and proactive - anticipate what the user needs
- Keep responses concise but informative

USER'S COLLECTION SUMMARY (${appraisals?.length || 0} items):
${collectionSummary}

Total Estimated Value: $${totalLow.toLocaleString()} - $${totalHigh.toLocaleString()}

${isFirstMessage ? `
FIRST MESSAGE: Introduce yourself as Stewart briefly, mention you can see their collection, and offer to help with anything - whether that's understanding their items better, selling advice, insurance recommendations, or finding hidden gems!
` : ''}

WHAT YOU CAN HELP WITH:
1. Collection analysis - find patterns, incomplete sets, hidden gems
2. Selling strategies - where to sell, best timing, pricing
3. Insurance guidance - documentation, coverage recommendations
4. Storage & preservation tips for different item types
5. Market insights - what's trending, investment potential
6. Authentication advice - when to get professional grading

Keep responses friendly and helpful!`;
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
            model: 'gemini-2.5-flash',
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
