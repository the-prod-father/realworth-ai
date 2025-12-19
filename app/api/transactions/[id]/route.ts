import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transactionService } from '@/services/transactionService';

// Create authenticated Supabase client from request
function getAuthClient(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
}

/**
 * GET /api/transactions/[id] - Get transaction details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getAuthClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transaction = await transactionService.getTransaction(id, user.id);

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Error in GET /api/transactions/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/transactions/[id] - Update transaction
 * Actions: confirm_payment, set_pickup, confirm_complete, cancel
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getAuthClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    let result: { success: boolean; error: string | null };

    switch (action) {
      case 'confirm_payment':
        // Called after Stripe payment authorized
        result = await transactionService.confirmPaymentAuthorized(
          id,
          data.paymentIntentId
        );
        break;

      case 'set_pickup':
        // Seller sets pickup address
        result = await transactionService.setPickupDetails(
          user.id,
          id,
          data.pickupAddress,
          data.pickupScheduledAt
        );
        break;

      case 'confirm_complete':
        // Buyer confirms pickup complete - captures payment
        result = await transactionService.confirmPickupComplete(user.id, id);
        break;

      case 'cancel':
        // Cancel the transaction
        result = await transactionService.cancelTransaction(
          user.id,
          id,
          data.reason
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Fetch updated transaction
    const transaction = await transactionService.getTransaction(id, user.id);

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    console.error('Error in PATCH /api/transactions/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}
