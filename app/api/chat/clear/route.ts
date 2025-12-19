import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { userId, appraisalId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Create server-side Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build delete query
    let query = supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', userId);

    if (appraisalId) {
      query = query.eq('appraisal_id', appraisalId);
    } else {
      query = query.is('appraisal_id', null);
    }

    const { error } = await query;

    if (error) {
      console.error('Error clearing chat history:', error);
      return NextResponse.json(
        { error: 'Failed to clear chat history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return NextResponse.json(
      { error: 'Failed to clear chat history' },
      { status: 500 }
    );
  }
}
