import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';

// Initialize Resend (will silently fail if no API key - feedback still stored)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

    // Send email notification (non-blocking)
    if (resend) {
      const typeEmoji = type === 'bug' ? '🐛' : type === 'feature' ? '💡' : '💬';
      const ratingStars = rating ? '⭐'.repeat(rating) : 'No rating';

      try {
        await resend.emails.send({
          from: 'RealWorth Feedback <feedback@realworth.ai>',
          to: ['support@realworth.ai'],
          subject: `${typeEmoji} New ${type} feedback from RealWorth`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #14B8A6;">${typeEmoji} New ${type.charAt(0).toUpperCase() + type.slice(1)} Feedback</h2>

              <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Rating:</strong> ${ratingStars}</p>
                <p style="margin: 0 0 8px 0;"><strong>Type:</strong> ${type}</p>
                <p style="margin: 0 0 8px 0;"><strong>User:</strong> ${userId || 'Anonymous'}</p>
                <p style="margin: 0;"><strong>Page:</strong> ${pageUrl || 'Unknown'}</p>
              </div>

              ${message ? `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0; white-space: pre-wrap;">${message}</p>
                </div>
              ` : '<p style="color: #64748b; font-style: italic;">No message provided</p>'}

              <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
                Feedback ID: ${data.id}<br>
                Submitted: ${new Date().toISOString()}
              </p>
            </div>
          `,
        });
        console.log('[Feedback] Email notification sent');
      } catch (emailError) {
        // Don't fail the request if email fails
        console.error('[Feedback] Failed to send email notification:', emailError);
      }
    }

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
