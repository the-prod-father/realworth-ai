
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const treasureId = params.id;

  // Get auth token from Authorization header
  const authHeader = req.headers.get('authorization');
  const authToken = authHeader?.replace('Bearer ', '');

  // Create Supabase client with user's auth if available
  const supabase = authToken
    ? createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      })
    : createClient(supabaseUrl, supabaseAnonKey);

  // Try to fetch the treasure
  const { data: treasure, error } = await supabase
    .from('appraisals')
    .select(`
      *,
      users:user_id (id, name, picture)
    `)
    .eq('id', treasureId)
    .single();

  if (error || !treasure) {
    // Check if treasure exists but user doesn't have access
    // Try to fetch just the is_public status (anon can see public ones)
    const { data: publicCheck } = await createClient(supabaseUrl, supabaseAnonKey)
      .from('appraisals')
      .select('id, is_public')
      .eq('id', treasureId)
      .eq('is_public', true)
      .single();

    if (publicCheck) {
      // Treasure exists and is public, but query failed for some reason
      return NextResponse.json({ error: 'Failed to load treasure' }, { status: 500 });
    }

    // Either treasure doesn't exist, or it's private and user doesn't have access
    return NextResponse.json({ error: 'Treasure not found or private' }, { status: 404 });
  }

  // Determine if the current user is the owner
  let isOwner = false;
  if (authToken) {
    const { data: { user } } = await supabase.auth.getUser(authToken);
    isOwner = user?.id === treasure.user_id;
  }

  return NextResponse.json({
    treasure,
    isOwner,
  });
}
