# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RealWorth.ai is an AI-powered appraisal platform that uses Google Gemini to analyze images of items (books, collectibles, antiques) and provide detailed valuations. Production site: https://realworth.ai

## Commands

```bash
# Development
npm run dev          # Start dev server on port 3001
npm run build        # Production build
npm run lint         # ESLint

# Deployment
git push origin main # Auto-deploys to Vercel
```

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **AI**: Google Gemini 2.5 Flash (`@google/genai`)
- **Auth**: Supabase Auth (Google OAuth)
- **Database**: Supabase PostgreSQL with RLS
- **Payments**: Stripe (products, subscriptions, webhooks)
- **Hosting**: Vercel

## Architecture

### Data Flow
1. User uploads images via `AppraisalForm.tsx`
2. Images sent to `/api/appraise/route.ts` → Gemini API for analysis
3. Results stored in Supabase via `services/dbService.ts`
4. Auth handled by `services/authService.ts` using Supabase Auth

### Key Files

**API Routes** (`app/api/`):
- `appraise/route.ts` - Main AI appraisal endpoint (Gemini structured output)
- `appraise/[id]/route.ts` - Fetch single appraisal
- `chat/route.ts` - AI chat for Pro users
- `stripe/checkout/route.ts` - Stripe checkout session
- `stripe/webhook/route.ts` - Stripe webhook handler
- `stripe/portal/route.ts` - Customer portal redirect

**Services** (`services/`):
- `authService.ts` - Supabase Auth wrapper (signIn, signOut, onAuthStateChange)
- `dbService.ts` - Database operations (appraisals CRUD)
- `subscriptionService.ts` - Pro tier logic, usage limits
- `collectionService.ts` - Collection management
- `chatService.ts` - AI chat history

**Type Definitions** (`lib/types.ts`):
- `User`, `AppraisalResult`, `AppraisalRequest`, `Collection`

### Database Schema

Two main tables in Supabase (see `supabase/schema.sql`):
- `users` - Profiles from Google OAuth (auto-created via trigger)
- `appraisals` - Appraisal results with foreign key to users

RLS policies ensure users only access their own data.

## Environment Variables

Required in `.env.local`:
```bash
GEMINI_API_KEY="..."                      # Server-side only
NEXT_PUBLIC_SUPABASE_URL="..."            # Public
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."       # Public
STRIPE_SECRET_KEY="..."                   # Server-side only
STRIPE_WEBHOOK_SECRET="..."               # For webhook verification
```

## Stripe MCP Integration

The Stripe MCP is configured for this project. To verify:
```
List my Stripe products to confirm the Stripe MCP is connected.
```

MCP config requires: `STRIPE_SECRET_KEY` env var and `--tools=all` flag.

## Design Conventions

- **Colors**: Teal (#14B8A6) primary, Navy (#1e293b) secondary
- **Icons**: Use SVG icons from `components/icons.tsx` (no emojis)
- **Import paths**: Use `@/` alias (e.g., `@/lib/types`)
- **TypeScript**: Strict mode enabled, all files must pass type checks

## Important Notes

- Images currently stored as base64 data URLs in database (technical debt - migrate to Supabase Storage)
- Free tier has usage limits enforced by `subscriptionService.ts`
- All auth state managed via `AuthContext.tsx`
- Vercel auto-deploys on push to `main` branch
