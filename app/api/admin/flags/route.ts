import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET: Fetch all feature flags
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ flags: data });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update a feature flag
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, enabled, description, targetPercentage, targetProOnly } = body;

    if (!name) {
      return NextResponse.json({ error: 'Flag name is required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const updateData: Record<string, unknown> = {};
    if (enabled !== undefined) updateData.enabled = enabled;
    if (description !== undefined) updateData.description = description;
    if (targetPercentage !== undefined) updateData.target_percentage = targetPercentage;
    if (targetProOnly !== undefined) updateData.target_pro_only = targetProOnly;

    const { data, error } = await supabase
      .from('feature_flags')
      .update(updateData)
      .eq('name', name)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ flag: data });
  } catch (error) {
    console.error('Error updating feature flag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
