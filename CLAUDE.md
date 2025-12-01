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
- **AI**: Google Gemini 3 Pro (`@google/genai`) for appraisals, image regeneration, and chat
- **Auth**: Supabase Auth (Google OAuth)
- **Database**: Supabase PostgreSQL with RLS
- **Storage**: Supabase Storage (appraisal-images bucket)
- **Payments**: Stripe (subscriptions, webhooks, customer portal)
- **Hosting**: Vercel (120s timeout configured for AI processing)

## Architecture

### Core Data Flow
1. User uploads images via `AppraisalForm.tsx` → images uploaded to Supabase Storage
2. API route `/api/appraise/route.ts` fetches images, sends to Gemini for structured JSON appraisal
3. Gemini regenerates a clean version of the image using `gemini-3-pro-image-preview`
4. Results stored in Supabase via `services/dbService.ts`
5. Auth state managed globally via `AuthContext.tsx` wrapping the app

### Key Patterns

**Authentication Flow**:
- `AuthContext` (`components/contexts/AuthContext.tsx`) provides user state app-wide
- `authService.ts` wraps Supabase Auth (signInWithGoogle, onAuthStateChange)
- API routes validate auth via `Authorization: Bearer <token>` header
- RLS policies enforce data isolation at database level

**Subscription System**:
- `subscriptionService.ts` manages Pro tier logic with Stripe integration
- Free tier: 10 appraisals/month (tracked in `users.monthly_appraisal_count`)
- Super admin emails bypass limits (hardcoded in subscriptionService)
- `useSubscription` hook provides subscription state to components
- Stripe webhooks (`/api/stripe/webhook`) handle subscription lifecycle

**Appraisal API** (`/api/appraise/route.ts`):
- Uses Gemini structured output with JSON schema for consistent responses
- Two-step AI process: (1) appraisal data extraction, (2) image regeneration
- Supports collection validation when `collectionId` provided
- Images stored in Supabase Storage, falls back to original URL on upload failure

### Services Layer (`services/`)
- `authService.ts` - Supabase Auth wrapper
- `dbService.ts` - Appraisals CRUD operations
- `subscriptionService.ts` - Pro tier, usage limits, Stripe customer management
- `collectionService.ts` - Collection management with validation
- `chatService.ts` - AI chat history for Pro users

### Custom Hooks (`hooks/`)
- `useAppraisal.ts` - Appraisal submission and state
- `useSubscription.ts` - Subscription state and limit checking
- `useChat.ts` - AI chat functionality
- `useLocalStorage.ts` - Persistent storage wrapper

### Database Schema

Main tables (see `supabase/schema.sql` and migrations):
- `users` - Extends auth.users with profile + subscription fields
- `appraisals` - Appraisal results with foreign key to users
- `collections` - User collections with validation metadata
- `access_codes` - Pro access codes for promotional grants

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
```

## Stripe MCP Integration

The Stripe MCP is configured for this project. To verify:
```
List my Stripe products to confirm the Stripe MCP is connected.
```

## Design Conventions

- **Colors**: Teal (#14B8A6) primary, Navy (#1e293b) secondary
- **Icons**: Use SVG icons from `components/icons.tsx` (no emojis in code)
- **Import paths**: Use `@/` alias (e.g., `@/lib/types`)
- **TypeScript**: Strict mode, all files must pass type checks

## Important Notes

- API route timeout set to 120s (`maxDuration = 120`) for AI processing - requires Vercel Pro
- Supabase client in `lib/supabase.ts` is for client-side; API routes create authenticated clients with user tokens
- Free tier limit of 10 appraisals/month enforced in `subscriptionService.ts`
