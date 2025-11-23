# Pro Tier Implementation Plan

## Overview
Implement Stripe subscription for Pro tier ($10.99/month) with AI Chat as the flagship Pro feature.

## Phase 1: Stripe Integration

### Database Migration
```sql
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN monthly_appraisal_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN appraisal_count_reset_at TIMESTAMP;
```

### Stripe Setup
1. Create Stripe account / use existing
2. Create Product: "RealWorth Pro"
3. Create Price: $10.99/month recurring
4. Set up webhook endpoint

### Files to Create
- `app/api/stripe/checkout/route.ts` - Create checkout session
- `app/api/stripe/webhook/route.ts` - Handle Stripe events
- `app/api/stripe/portal/route.ts` - Customer portal redirect
- `services/subscriptionService.ts` - Subscription CRUD
- `components/UpgradeModal.tsx` - Pro upgrade CTA

### Webhook Events to Handle
- `checkout.session.completed` - Activate Pro
- `customer.subscription.updated` - Status changes
- `customer.subscription.deleted` - Downgrade to free
- `invoice.payment_failed` - Handle failed payments

### User Flow
1. User clicks "Upgrade to Pro" button
2. Frontend calls `/api/stripe/checkout`
3. Redirects to Stripe Checkout (hosted page)
4. User completes payment
5. Webhook receives `checkout.session.completed`
6. Update user's subscription_tier to 'pro'
7. Redirect back to app with success message
8. UI immediately reflects Pro status

## Phase 2: AI Chat Feature

### Database Schema
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  appraisal_id UUID REFERENCES appraisals(id), -- NULL for global chat
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_appraisal ON chat_messages(appraisal_id);
```

### Chat Architecture
- **Model**: Gemini 2.0 Flash (fast, cost-effective for chat)
- **Streaming**: Yes - Server-Sent Events via ReadableStream
- **Context**: Last 10 messages + item/collection summary
- **Access**: Pro tier only

### Two Chat Modes

**Item Chat** (context: single appraisal)
- Appears in ResultCard or detail view
- System prompt includes item details (name, era, value, description)
- Questions: "What makes this valuable?", "Where to sell?", "Investment potential?"

**Global Chat** (context: all items)
- Separate chat interface / page
- System prompt includes summary of all items
- Questions: "Most valuable item?", "What to insure?", "Collection value?"

### Files to Create
- `app/api/chat/route.ts` - Streaming chat endpoint
- `services/chatService.ts` - Chat message CRUD
- `components/ChatInterface.tsx` - iMessage-style UI
- `components/ChatMessage.tsx` - Individual message bubble
- `hooks/useChat.ts` - Chat state management

### Streaming Implementation
```typescript
// app/api/chat/route.ts
export async function POST(req: NextRequest) {
  // Verify Pro subscription
  // Get conversation history
  // Build context (item or global)

  const stream = new ReadableStream({
    async start(controller) {
      const response = await ai.models.generateContentStream({
        model: 'gemini-2.0-flash',
        contents: messages,
        config: { systemInstruction }
      });

      for await (const chunk of response) {
        controller.enqueue(encoder.encode(chunk.text));
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

## Phase 3: Pro Feature Gating

### Features by Tier

**Free Tier**
- 10 appraisals per month
- Basic history
- Single item scanning
- Archive appraisals
- Add more photos (limit 3 per item?)

**Pro Tier ($10.99/month)**
- Unlimited appraisals
- Collections feature
- AI Chat (item + global)
- Unlimited photos per item
- Priority support

### Implementation
- Check `subscription_tier` before Pro features
- Show upgrade modal when free user tries Pro feature
- Track monthly appraisal count for free tier
- Reset count on 1st of month

### UI Components
- `components/ProBadge.tsx` - Show on Pro features
- `components/UpgradeModal.tsx` - Conversion CTA
- `components/UsageMeter.tsx` - Show "3/10 appraisals used"

## Environment Variables Needed
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

## Testing Checklist
- [ ] Stripe Checkout flow works
- [ ] Webhook updates user subscription
- [ ] Pro features gated correctly
- [ ] Chat streaming works
- [ ] Chat context includes item/collection data
- [ ] Customer portal accessible
- [ ] Subscription cancellation works
- [ ] Free tier limits enforced

## Launch Order
1. Database migration for subscription fields
2. Stripe integration (checkout, webhook, portal)
3. Pro gating logic
4. Chat database schema
5. Chat API with streaming
6. Chat UI components
7. Integration testing
8. Deploy!

---

## Quick Reference

### Stripe Test Cards
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- 3D Secure: 4000 0025 0000 3155

### Useful Stripe CLI Commands
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
stripe trigger checkout.session.completed
```
