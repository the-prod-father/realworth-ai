import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const { surveyId, userId, answers, appraisalCount } = await request.json();

    if (!surveyId || !answers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get survey details for email
    const { data: survey } = await supabase
      .from('surveys')
      .select('title, slug')
      .eq('id', surveyId)
      .single();

    // Insert response
    const { data, error } = await supabase
      .from('survey_responses')
      .insert({
        survey_id: surveyId,
        user_id: userId || null,
        answers,
        completed: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Surveys] Error saving response:', error);
      return NextResponse.json(
        { error: 'Failed to save response' },
        { status: 500 }
      );
    }

    // Update user's last survey appraisal count (for recurring survey logic)
    if (userId && appraisalCount) {
      await supabase
        .from('users')
        .update({ last_survey_appraisal_count: appraisalCount })
        .eq('id', userId);
    }

    console.log('[Surveys] New response submitted:', {
      responseId: data.id,
      surveyId,
      userId: userId || 'anonymous',
    });

    // Send email notification
    if (resend && survey) {
      try {
        const answersHtml = Object.entries(answers)
          .map(([questionId, answer]) => `
            <div style="margin-bottom: 12px;">
              <strong style="color: #64748b;">${questionId}:</strong>
              <p style="margin: 4px 0 0 0;">${answer}</p>
            </div>
          `)
          .join('');

        await resend.emails.send({
          from: 'RealWorth Surveys <surveys@realworth.ai>',
          to: ['support@realworth.ai'],
          subject: `📊 New survey response: ${survey.title}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #14B8A6;">📊 New Survey Response</h2>
              <p style="color: #64748b;">Survey: <strong>${survey.title}</strong></p>
              <p style="color: #64748b;">User: ${userId || 'Anonymous'}</p>

              <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
                ${answersHtml}
              </div>

              <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
                Response ID: ${data.id}<br>
                Submitted: ${new Date().toISOString()}
              </p>
            </div>
          `,
        });
        console.log('[Surveys] Email notification sent');
      } catch (emailError) {
        console.error('[Surveys] Failed to send email:', emailError);
      }
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('[Surveys] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
