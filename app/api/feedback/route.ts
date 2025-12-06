import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, rating, message, pageUrl, userAgent } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: 'Feedback type is required' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['bug', 'feature', 'general', 'satisfaction'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      );
    }

    // Validate rating if provided
    if (rating !== null && rating !== undefined) {
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'Rating must be between 1 and 5' },
          { status: 400 }
        );
      }
    }

    // Must have either rating or message
    if (!rating && !message) {
      return NextResponse.json(
        { error: 'Please provide a rating or message' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Insert feedback
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: userId || null,
        type,
        rating: rating || null,
        message: message || null,
        page_url: pageUrl || null,
        user_agent: userAgent || null,
        status: 'new',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Feedback] Error inserting feedback:', error);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    console.log('[Feedback] New feedback submitted:', {
      id: data.id,
      type,
      rating,
      hasMessage: !!message,
      userId: userId || 'anonymous',
    });

    return NextResponse.json({
      success: true,
      id: data.id,
    });
  } catch (error) {
    console.error('[Feedback] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
