# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RealWorth.ai is an AI-powered appraisal platform that uses Google Gemini to analyze images of items (books, collectibles, antiques) and provide detailed valuations. Production site: https://realworth.ai

## Commands

```bash
npm run dev          # Start dev server on port 3001
npm run build        # Production build
npm run lint         # ESLint
git push origin main # Auto-deploys to Vercel
```

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **AI**: Google Gemini (`@google/genai`) - `gemini-3-pro-preview` for appraisals, `gemini-3-pro-image-preview` for image regeneration
- **Auth**: Supabase Auth (Google OAuth)
- **Database**: Supabase PostgreSQL with RLS
- **Storage**: Supabase Storage (appraisal-images bucket)
- **Payments**: Stripe (subscriptions, webhooks, customer portal)
- **Hosting**: Vercel (120s timeout for appraise, 60s for chat)

## Architecture

### Core Data Flow
1. User uploads images via `AppraisalForm.tsx` → images uploaded to Supabase Storage
2. API route `/api/appraise/route.ts` fetches images, sends to Gemini for structured JSON appraisal
3. Gemini regenerates a clean version of the image using `gemini-3-pro-image-preview`
4. Results stored in Supabase via `services/dbService.ts`
5. Auth state managed globally via `AuthContext.tsx` wrapping the app

### View State Machine (`app/page.tsx`)
The main page uses a state machine for the appraisal flow:
```
HOME → FORM → LOADING (trivia quiz) → CELEBRATION → RESULT
```

### Key Patterns

**Authentication Flow**:
- `AuthContext` (`components/contexts/AuthContext.tsx`) provides user state app-wide
- `authService.ts` wraps Supabase Auth (signInWithGoogle, onAuthStateChange)
- API routes validate auth via `Authorization: Bearer <token>` header
- RLS policies enforce data isolation at database level

**Subscription System**:
- `subscriptionService.ts` manages Pro tier logic with Stripe integration
- Free tier: 3 appraisals/month (tracked in `users.monthly_appraisal_count`)
- Pro tier: $19.99/mo or $149.99/yr (V2 prices with legacy $9.99 grandfathering)
- Free limit defined in `lib/constants.ts` as `FREE_APPRAISAL_LIMIT`
- Super admin emails bypass limits (hardcoded in subscriptionService)
- `useSubscription` hook provides subscription state to components
- Stripe webhooks (`/api/stripe/webhook`) handle subscription lifecycle

**Appraisal API** (`/api/appraise/route.ts`):
- Uses Gemini structured output with JSON schema for consistent responses
- Two-step AI process: (1) appraisal data extraction, (2) image regeneration
- Supports collection validation when `collectionId` provided
- Images stored in Supabase Storage, falls back to original URL on upload failure

**Gamification System**:
- Streak tracking via `updateUserStreak()` in `dbService.ts`
- Trivia quiz (`TriviaQuiz.tsx`, `lib/triviaQuestions.ts`) shown during AI processing
- Celebration screen (`CelebrationScreen.tsx`) with confetti and value-based messages
- API returns `streakInfo` object with current/longest streak data

**Social/Friends System**:
- User search via `dbService.searchUsers()` (case-insensitive name/@username)
- Friends page (`app/friends/page.tsx`) with Search, Requests, and Friends tabs
- Bottom nav badge (`BottomTabNav.tsx`) shows pending request count with 30s polling
- Friendship states: `none` → `pending` → `accepted`/`declined`

**Feature Flags** (`services/featureFlagService.ts`, `hooks/useFeatureFlag.ts`):
- Database-driven feature flags with admin UI at `/admin`
- Supports: global toggle, pro-only, percentage rollout, specific user targeting
- Known flags: `ai_chat`, `insurance_certificates`, `dealer_network`, `one_click_selling`, `price_tracking`
- 1-minute client-side cache to reduce database queries
- Use `useFeatureFlag()` hook in components

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/appraise` | POST | Core appraisal (120s timeout) |
| `/api/appraise/[id]` | GET/PATCH | Get/update appraisal |
| `/api/chat` | POST | AI chat (Pro only, 60s timeout) |
| `/api/stripe/webhook` | POST | Stripe event handler |
| `/api/stripe/checkout` | POST | Create checkout session |
| `/api/stripe/portal` | POST | Customer portal redirect |
| `/api/stripe/cancel` | POST | Cancel subscription |
| `/api/treasure/[id]` | GET/PATCH | Public appraisal endpoint |
| `/api/queue/add` | POST | Add to batch queue |
| `/api/queue/status` | GET | Poll queue status |
| `/api/access-code` | POST | Validate pro access codes |
| `/api/feedback` | POST | Internal feedback submission |
| `/api/surveys/*` | GET/POST | Survey management |
| `/api/transactions` | GET/POST | List/create transactions |
| `/api/transactions/[id]` | GET/PATCH | View/update transaction |
| `/api/listings` | GET/POST | List/create marketplace listings |
| `/api/listings/[id]` | GET/PATCH/DELETE | Manage listing |
| `/api/events` | GET/POST | List/create local events |
| `/api/events/[id]` | GET/PATCH/DELETE | Manage event |
| `/api/seller/*` | Various | Seller onboarding (Stripe Connect, phone) |

### Services Layer (`services/`)
- `authService.ts` - Supabase Auth wrapper
- `dbService.ts` - Appraisals CRUD, user streaks, friend operations
- `subscriptionService.ts` - Pro tier, usage limits, Stripe customer management
- `collectionService.ts` - Collection management with validation
- `chatService.ts` - AI chat history for Pro users
- `featureFlagService.ts` - Database-driven feature flag management
- `transactionService.ts` - Marketplace transactions with Stripe Connect
- `listingService.ts` - Marketplace listings management
- `eventService.ts` - Local events/garage sales
- `sellerService.ts` - Seller onboarding and verification

### Custom Hooks (`hooks/`)
- `useAppraisal.ts` - Appraisal submission and state
- `useSubscription.ts` - Subscription state and limit checking
- `useChat.ts` - AI chat functionality
- `useLocalStorage.ts` - Persistent storage wrapper
- `useQueue.ts` - Batch processing queue state with polling
- `useSurvey.ts` - Feature validation survey management
- `useSpeechRecognition.ts` - Browser speech-to-text wrapper
- `useDescriptionGenerator.ts` - AI-powered item descriptions
- `useFeatureFlag.ts` - Feature flag state for components

### Database Schema

Main tables (see `supabase/schema.sql` and migrations):
- `users` - Extends auth.users with profile, subscription, and streak fields
- `appraisals` - Appraisal results with foreign key to users
- `collections` - User collections with validation metadata
- `access_codes` - Pro access codes for promotional grants
- `friendships` - Friend requests (user_id, friend_id, status)
- `chat_messages` - Pro user AI chat history
- `surveys` - Feature validation survey responses

User profile auto-created via `handle_new_user()` trigger on auth signup.

## Environment Variables

Required in `.env.local`:
```bash
GEMINI_API_KEY="..."                      # Server-side only
NEXT_PUBLIC_SUPABASE_URL="..."            # Public
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."       # Public
SUPABASE_SERVICE_ROLE_KEY="..."           # Server-side only (bypasses RLS)
STRIPE_SECRET_KEY="..."                   # Server-side only
STRIPE_WEBHOOK_SECRET="..."               # For webhook verification
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="..."  # Public - for Stripe Elements
NEXT_PUBLIC_MAPBOX_TOKEN="..."            # Public - for map views
```

## MCP Integrations

**Stripe MCP** - Configured for this project. To verify:
```
List my Stripe products to confirm the Stripe MCP is connected.
```

**Supabase MCP** - Configured for database operations. To verify:
```
List my Supabase projects to confirm the Supabase MCP is connected.
```
Project ID: `gwoahdeybyjfonoahmvv`

## Design Conventions

- **Colors**: Teal (#14B8A6) primary, Navy (#1e293b) secondary
- **Icons**: Use SVG icons from `components/icons.tsx` (no emojis in code)
- **Import paths**: Use `@/` alias (e.g., `@/lib/types`)
- **TypeScript**: Strict mode, all files must pass type checks

## Important Notes

- API route timeouts configured in `vercel.json`: 120s for `/api/appraise`, 60s for `/api/chat` - requires Vercel Pro
- Supabase client in `lib/supabase.ts` is for client-side; API routes create authenticated clients with user tokens
- `getSupabaseAdmin()` returns a service-role client that bypasses RLS - use only in API routes/webhooks
- Free tier limit of 3 appraisals/month enforced via `FREE_APPRAISAL_LIMIT` constant in `lib/constants.ts`
- Super admin emails are hardcoded in `subscriptionService.ts` and bypass all limits
- Admin dashboard at `/admin` requires super admin authentication; manages feature flags

## Project Management

### Linear Integration
- Team ID: `29ce6072-3771-4391-9ef6-4f2ccaf88acb`
- Project: RealWorth.ai (`1bbc9e45-98dd-4bc6-9526-f3a7c435db8d`)
- Assignee (Gavin): `ab6f874f-1af3-4a8a-8d1a-71ae542bf019`
- See `HISTORY.md` for development changelog
