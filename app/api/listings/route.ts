import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { listingService } from '@/services/listingService';
import { sellerService } from '@/services/sellerService';

// GET /api/listings - Browse listings
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters = {
      category: searchParams.get('category') || undefined,
      minPrice: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined,
      zip: searchParams.get('zip') || undefined,
      sellerId: searchParams.get('sellerId') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const listings = await listingService.getListings(filters);

    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Error in GET /api/listings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/listings - Create a new listing
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

    // Check if user is a verified seller
    const sellerStatus = await sellerService.getSellerStatus(user.id);
    if (!sellerStatus?.isVerifiedSeller) {
      return NextResponse.json(
        { error: 'You must be a verified seller to create listings' },
        { status: 403 }
      );
    }

    // Get listing data from request
    const body = await request.json();
    const { appraisalId, askingPrice, acceptsOffers, pickupCity, pickupState, pickupZip } = body;

    // Validate required fields
    if (!appraisalId || !askingPrice || !pickupCity || !pickupState || !pickupZip) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create listing
    const result = await listingService.createListing(
      user.id,
      {
        appraisalId,
        askingPrice,
        acceptsOffers,
        pickupCity,
        pickupState,
        pickupZip,
      },
      token
    );

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ listing: result.listing }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/listings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
