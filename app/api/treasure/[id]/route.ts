
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const treasureId = params.id;

  // Get auth token from Authorization header
  const authHeader = req.headers.get('authorization');
  const authToken = authHeader?.replace('Bearer ', '');

  // Get current user ID if authenticated
  let currentUserId: string | null = null;
  if (authToken) {
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await authClient.auth.getUser(authToken);
    currentUserId = user?.id || null;
  }

  // Use service role key if available to bypass RLS, otherwise use anon
  const supabase = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : createClient(supabaseUrl, supabaseAnonKey);

  // Fetch the treasure - service role bypasses RLS
  // If using anon key, RLS will restrict to public items only
  let treasure = null;
  let isOwner = false;

  if (supabaseServiceKey) {
    // With service role, we can fetch any treasure
    const { data, error } = await supabase
      .from('appraisals')
      .select(`
        *,
        users:user_id (id, name, picture)
      `)
      .eq('id', treasureId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Treasure not found' }, { status: 404 });
    }

    treasure = data;
    isOwner = currentUserId === treasure.user_id;

    // Check access: owner or public
    if (!isOwner && !treasure.is_public) {
      return NextResponse.json({ error: 'Treasure is private' }, { status: 404 });
    }
  } else {
    // Without service role, try to fetch with explicit conditions
    // First check if user owns it
    if (currentUserId) {
      const { data: ownedTreasure } = await supabase
        .from('appraisals')
        .select(`
          *,
          users:user_id (id, name, picture)
        `)
        .eq('id', treasureId)
        .eq('user_id', currentUserId)
        .single();

      if (ownedTreasure) {
        treasure = ownedTreasure;
        isOwner = true;
      }
    }

    // If not owned, try to fetch as public
    if (!treasure) {
      const { data: publicTreasure } = await supabase
        .from('appraisals')
        .select(`
          *,
          users:user_id (id, name, picture)
        `)
        .eq('id', treasureId)
        .eq('is_public', true)
        .single();

      if (publicTreasure) {
        treasure = publicTreasure;
        isOwner = currentUserId === publicTreasure.user_id;
      }
    }

    if (!treasure) {
      return NextResponse.json({ error: 'Treasure not found or private' }, { status: 404 });
    }
  }

  return NextResponse.json({
    treasure,
    isOwner,
  });
}
