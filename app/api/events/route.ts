import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { eventService, EventType } from '@/services/eventService';

// GET /api/events - Browse events
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters = {
      eventType: searchParams.get('eventType') as EventType | undefined,
      city: searchParams.get('city') || undefined,
      state: searchParams.get('state') || undefined,
      zip: searchParams.get('zip') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      lat: searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined,
      lng: searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined,
      radiusMiles: searchParams.get('radius') ? parseInt(searchParams.get('radius')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const events = await eventService.getEvents(filters);

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error in GET /api/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/events - Create a new event
export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get event data from request
    const body = await request.json();
    const {
      title,
      description,
      eventType,
      address,
      city,
      state,
      zip,
      lat,
      lng,
      startDate,
      endDate,
      startTime,
      endTime,
      categories,
      photos,
      websiteUrl,
    } = body;

    // Validate required fields
    if (!title || !eventType || !address || !city || !state || !zip || !lat || !lng || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create event
    const result = await eventService.createEvent(user.id, {
      title,
      description,
      eventType,
      address,
      city,
      state,
      zip,
      lat,
      lng,
      startDate,
      endDate,
      startTime,
      endTime,
      categories,
      photos,
      websiteUrl,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ event: result.event }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
