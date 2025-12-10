import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { renderToBuffer } from '@react-pdf/renderer';
import { InsuranceCertificate } from '@/components/InsuranceCertificate';
import { subscriptionService } from '@/services/subscriptionService';
import React from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const appraisalId = params.id;

  // Get auth token from Authorization header
  const authHeader = req.headers.get('authorization');
  const authToken = authHeader?.replace('Bearer ', '');

  if (!authToken) {
    return NextResponse.json(
      { error: 'Authentication required', requiresAuth: true },
      { status: 401 }
    );
  }

  // Verify user and get their ID
  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user } } = await authClient.auth.getUser(authToken);

  if (!user) {
    return NextResponse.json(
      { error: 'Invalid authentication', requiresAuth: true },
      { status: 401 }
    );
  }

  const userId = user.id;

  // Check if user is Pro
  const isPro = await subscriptionService.isPro(userId);

  if (!isPro) {
    return NextResponse.json(
      {
        error: 'Pro subscription required',
        requiresPro: true,
        message: 'Upgrade to Pro to download insurance-ready appraisal certificates'
      },
      { status: 403 }
    );
  }

  // Fetch the appraisal with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: appraisal, error: appraisalError } = await supabase
    .from('appraisals')
    .select(`
      *,
      users:user_id (id, name, email, picture)
    `)
    .eq('id', appraisalId)
    .single();

  if (appraisalError || !appraisal) {
    return NextResponse.json(
      { error: 'Appraisal not found' },
      { status: 404 }
    );
  }

  // Verify user owns this appraisal
  if (appraisal.user_id !== userId) {
    return NextResponse.json(
      { error: 'You can only generate certificates for your own appraisals' },
      { status: 403 }
    );
  }

  try {
    // Parse confidence factors if they exist
    let confidenceFactors = [];
    if (appraisal.ai_response) {
      try {
        const aiResponse = typeof appraisal.ai_response === 'string'
          ? JSON.parse(appraisal.ai_response)
          : appraisal.ai_response;
        confidenceFactors = aiResponse.confidenceFactors || [];
      } catch {
        // Ignore parsing errors
      }
    }

    // Generate the PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(InsuranceCertificate, {
        itemName: appraisal.item_name,
        author: appraisal.author,
        era: appraisal.era,
        category: appraisal.category,
        description: appraisal.description,
        priceLow: appraisal.price_low,
        priceHigh: appraisal.price_high,
        currency: appraisal.currency || 'USD',
        reasoning: appraisal.reasoning,
        imageUrl: appraisal.image_url,
        confidenceScore: appraisal.confidence_score || 75,
        confidenceFactors: confidenceFactors,
        appraisalId: appraisal.id,
        appraisalDate: appraisal.created_at,
        ownerName: appraisal.users?.name,
      })
    );

    // Create filename from item name
    const safeFileName = appraisal.item_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    // Return the PDF - convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="realworth-certificate-${safeFileName}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[Certificate API] Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificate' },
      { status: 500 }
    );
  }
}
