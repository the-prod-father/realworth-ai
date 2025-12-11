# Lessons Learned & Issues Resolved

A log of problems encountered and their solutions. Check here first when debugging!

---

## 2025-12-10: Supabase Service Role Key Missing in Vercel

### Symptoms
- Free users immediately hit "Monthly appraisal limit reached" error
- Database showed `monthly_appraisal_count = 0` but API returned `canCreate: false`
- UI showed correct "0/3 appraisals used" but server blocked the request

### Root Cause
The `SUPABASE_SERVICE_ROLE_KEY` environment variable was **not set** in Vercel production.

Vercel had a misnamed variable:
```
NEXT_PUBLIC_SUPABASE_SUPABASE_SERVICE_ROLE_KEY  ❌ (wrong name)
```

But the code in `lib/supabase.ts` looks for:
```
SUPABASE_SERVICE_ROLE_KEY  ✅ (correct name)
```

Without this key, `getSupabaseAdmin()` falls back to the anon client, which **can't read other users' data due to RLS policies**.

### Solution
```bash
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste the service role key value
vercel --prod  # Redeploy
```

### Prevention
- Always verify server-side env vars are set correctly after Supabase integration
- The service role key should NEVER have `NEXT_PUBLIC_` prefix (it's a secret!)
- Add a startup check or health endpoint that verifies critical env vars

---

## 2025-12-10: Free Tier Limit Not Being Enforced

### Symptoms
- User (David O'Hara) had 14 appraisals on free tier when limit was 10
- `monthly_appraisal_count` in database was 0 despite having appraisals

### Root Cause
1. **Client-side only enforcement**: Limit check only happened in frontend, not API
2. **RLS blocking updates**: `incrementAppraisalCount()` used anon client, RLS silently blocked the update
3. **Fire-and-forget**: `incrementUsage()` was called without `await`, errors were swallowed

### Solution
1. Created `FREE_APPRAISAL_LIMIT = 3` constant in `lib/constants.ts` (single source of truth)
2. Added **server-side enforcement** in `/api/appraise/route.ts`:
   - Check limit BEFORE processing (returns 403 if exceeded)
   - Increment count AFTER successful appraisal
3. Changed `incrementAppraisalCount()` to use `getSupabaseAdmin()` (bypasses RLS)
4. Changed `canCreateAppraisal()` to use `getSupabaseAdmin()`

### Key Code Pattern
```typescript
// Always use admin client for trusted server operations
const supabaseAdmin = getSupabaseAdmin();
const { data, error } = await supabaseAdmin
  .from('users')
  .update({ monthly_appraisal_count: newCount })
  .eq('id', userId);
```

### Prevention
- Server-side enforcement for ALL limits (never trust the client)
- Use admin client for operations that need to bypass RLS
- Always `await` database operations and handle errors
- Log all subscription/limit operations with `[SubscriptionService]` prefix

---

## 2025-12-10: Stripe Prices Created as One-Time Instead of Recurring

### Symptoms
- Created prices via Stripe MCP tool
- Prices showed in Stripe Dashboard but without "Per month" / "Per year" indicator
- Would fail if used for subscriptions

### Root Cause
The Stripe MCP `create_price` tool doesn't support the `recurring` parameter.

### Solution
Create recurring prices in Stripe Dashboard:
1. Product catalog → Select product
2. Add another price → Select **"Recurring"** (not "One-off")
3. Set billing period (Monthly/Yearly)

Or use Stripe CLI:
```bash
stripe prices create \
  --product="prod_xxx" \
  --unit-amount=1999 \
  --currency=usd \
  -d "recurring[interval]=month"
```

### Prevention
- Always verify price type in Stripe Dashboard after creation
- Recurring prices show "Per month" or "Per year" in the pricing list
- One-time prices show just the amount with no interval

---

## 2025-12-10: Double Increment Bug (Usage Counter +2 on Single Appraisal)

### Symptoms
- After one appraisal, usage meter showed "2/3 appraisals used" instead of "1/3"
- Database `monthly_appraisal_count` was double what it should be

### Root Cause
**Both frontend AND backend were incrementing the counter:**

1. **Backend** (`/api/appraise/route.ts:389`): `incrementAppraisalCount(userId)` - ✅ Correct
2. **Frontend** (`app/page.tsx:169`): `incrementUsage()` - ❌ Redundant
3. **Frontend** (`app/page.tsx:61`): `incrementUsage()` in `handleQueueItemComplete` - ❌ Redundant

This happened because we added server-side enforcement but forgot to remove the legacy client-side increment calls.

### Solution
Removed ALL frontend `incrementUsage()` calls since the server handles this now:
- Removed `incrementUsage()` at line 169 (sync appraisal flow)
- Removed `incrementUsage()` at line 61 (queue completion handler)
- Removed `incrementUsage` from useCallback dependency array
- Removed `incrementUsage` from useSubscription destructure

**Single source of truth:** The increment now ONLY happens in `/api/appraise/route.ts` after a successful appraisal.

### Prevention
- **Server handles ALL state mutations** - client only refreshes/displays state
- When adding server-side enforcement, audit ALL client-side calls doing the same thing
- Search for function names across the entire codebase before declaring "fixed"
- Use `grep -r "incrementUsage\|incrementAppraisalCount" .` to find all increment calls

### Debugging Pattern
```bash
# Find all increment calls
grep -rn "incrementUsage\|incrementAppraisalCount" --include="*.ts" --include="*.tsx" .
```

---

## 2025-12-10: Stripe "No such price" Error - Trailing Newline in Env Var

### Symptoms
- Checkout fails immediately with "Failed to create checkout session"
- Error message: `No such price: 'price_xxx\n'` (note the `\n`)

### Root Cause
When setting environment variables via Vercel CLI or Dashboard, copy-pasting can include a **trailing newline character** (`\n`). Stripe's API doesn't trim these, so it looks for a price ID that literally ends with a newline.

### Solution
Remove and re-add the env var using `printf` to ensure no trailing newline:
```bash
vercel env rm STRIPE_PRO_PRICE_ID_V2 production -y
printf 'price_xxx' | vercel env add STRIPE_PRO_PRICE_ID_V2 production
vercel --prod  # Redeploy
```

### Prevention
- Always use `printf` (not `echo`) when piping values to `vercel env add`
- Test checkout after setting any Stripe env vars
- Look for `\n` in error messages - it's a telltale sign

### Debugging Pattern
```bash
# Test checkout API directly to see raw error
curl -sL https://yoursite.com/api/stripe/checkout \
  -X POST -H "Content-Type: application/json" \
  -d '{"userId":"test","userEmail":"test@test.com","billingInterval":"monthly"}'
```

---

## Template for New Entries

```markdown
## YYYY-MM-DD: Brief Title

### Symptoms
- What did you observe?

### Root Cause
Why did it happen?

### Solution
How did you fix it?

### Prevention
How to avoid this in the future?
```
