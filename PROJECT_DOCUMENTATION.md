# RealWorth.ai - Complete Project Documentation

**Last Updated**: 2025-01-27  
**Version**: 1.0.0

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Core Features](#core-features)
6. [Database Schema](#database-schema)
7. [Storage Architecture](#storage-architecture)
8. [API Endpoints](#api-endpoints)
9. [Authentication Flow](#authentication-flow)
10. [Image Processing Workflow](#image-processing-workflow)
11. [Environment Variables](#environment-variables)
12. [Deployment](#deployment)
13. [Known Issues & Future Improvements](#known-issues--future-improvements)

---

## Project Overview

**RealWorth.ai** is an AI-powered appraisal platform that uses Google Gemini AI to analyze images of items (books, collectibles, antiques, etc.) and provide detailed valuations with market pricing estimates.

### Key Features
- **AI-Powered Appraisals**: Uses Google Gemini 2.5 Flash to analyze item images
- **Image Regeneration**: Uses Gemini Image Preview to recreate item images
- **User Authentication**: Supabase Auth with Google OAuth
- **Appraisal History**: Persistent storage of all user appraisals
- **Gamification**: Stats tracking (total value, item count)
- **Price References**: AI-provided links to external marketplaces

### Current Status
- ✅ Production-ready and deployed
- ✅ Supabase integration complete
- ✅ Google OAuth authentication working
- ⚠️ **Image storage needs optimization** (currently using public bucket)

---

## Architecture

### High-Level Flow

```
User Uploads Image
    ↓
[AppraisalForm] → [useAppraisal Hook]
    ↓
[POST /api/appraise]
    ↓
[Google Gemini API]
    ├─→ Analysis (gemini-2.5-flash)
    └─→ Image Regeneration (gemini-2.5-flash-image-preview)
    ↓
[Supabase Storage] → Upload regenerated image
    ↓
[Supabase Database] → Save appraisal metadata
    ↓
[ResultCard] → Display results
```

### Component Hierarchy

```
app/
├── layout.tsx (Root layout with AuthProvider)
├── page.tsx (Main page component)
└── api/
    └── appraise/
        └── route.ts (API endpoint)

components/
├── AppraisalForm.tsx (Upload form)
├── ResultCard.tsx (Display results)
├── HistoryList.tsx (Show appraisal history)
├── Header.tsx (Navigation)
├── FileUpload.tsx (Drag-and-drop upload)
├── GamificationStats.tsx (User stats)
└── contexts/
    └── AuthContext.tsx (Auth state management)

services/
├── authService.ts (Supabase Auth wrapper)
└── dbService.ts (Database operations)

hooks/
└── useAppraisal.ts (Appraisal API logic)
```

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.1
- **Runtime**: React 18

### Backend & APIs
- **AI Service**: Google Gemini 2.5 Flash
  - `gemini-2.5-flash` for appraisal analysis
  - `gemini-2.5-flash-image-preview` for image regeneration
- **Authentication**: Supabase Auth with Google OAuth provider
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Storage**: Supabase Storage (for images)

### Infrastructure
- **Hosting**: Vercel (auto-deploy from GitHub)
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage Buckets

### Key Dependencies
```json
{
  "@google/genai": "^0.14.0",
  "@supabase/supabase-js": "^2.83.0",
  "next": "^14.2.33",
  "react": "^18",
  "react-dom": "^18"
}
```

---

## Project Structure

```
realworth-ai/
├── app/
│   ├── layout.tsx              # Root layout with AuthProvider
│   ├── page.tsx                # Main page with view state management
│   ├── globals.css             # Global styles
│   └── api/
│       └── appraise/
│           └── route.ts        # AI appraisal API endpoint
│
├── components/
│   ├── AppraisalForm.tsx       # Upload form with condition selector
│   ├── FileUpload.tsx          # Drag-and-drop file upload
│   ├── HistoryList.tsx         # Display user's appraisal history
│   ├── ResultCard.tsx          # Display appraisal results
│   ├── Header.tsx              # Navigation header
│   ├── GamificationStats.tsx   # User statistics display
│   ├── Loader.tsx              # Loading spinner
│   ├── Auth.tsx                # Auth component (legacy?)
│   ├── icons.tsx               # SVG icon components
│   └── contexts/
│       └── AuthContext.tsx     # React Context for auth state
│
├── hooks/
│   └── useAppraisal.ts         # Custom hook for appraisal API calls
│
├── lib/
│   ├── types.ts                # TypeScript type definitions
│   ├── constants.ts            # App constants (CONDITIONS array)
│   └── supabase.ts             # Supabase client initialization
│
├── services/
│   ├── authService.ts          # Supabase Auth wrapper
│   └── dbService.ts            # Database operations (CRUD)
│
├── supabase/
│   ├── schema.sql              # Database schema (users, appraisals)
│   ├── setup_storage.sql       # Storage bucket setup
│   └── migration_add_references.sql  # References column migration
│
├── public/
│   ├── logo.svg                # Main logo
│   ├── og-image.png            # Open Graph image
│   └── apple-touch-icon.png    # iOS home screen icon
│
├── package.json                # Dependencies and scripts
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── next.config.mjs             # Next.js configuration
```

---

## Core Features

### 1. AI Appraisal Workflow

**Two-Step Process**:

1. **Analysis Phase** (`app/api/appraise/route.ts:73-90`)
   - Uploads images to Gemini 2.5 Flash
   - Uses structured JSON response schema
   - Extracts: item name, author, era, category, description, price range, reasoning, references

2. **Image Regeneration Phase** (`app/api/appraise/route.ts:92-113`)
   - Uses Gemini 2.5 Flash Image Preview
   - Regenerates the item image
   - Converts to buffer for storage

**Response Schema**:
```typescript
{
  itemName: string;        // Book title or item name
  author: string;          // Author (N/A if not a book)
  era: string;             // Publication year or estimated period
  category: string;        // Single-word category
  description: string;     // Content summary or physical description
  priceRange: {
    low: number;           // Minimum estimated value
    high: number;          // Maximum estimated value
  };
  currency: string;        // USD, EUR, etc.
  reasoning: string;       // Step-by-step valuation explanation
  references: Array<{      // External marketplace links
    title: string;
    url: string;
  }>;
}
```

### 2. Authentication

**Implementation**: Supabase Auth with Google OAuth

**Flow**:
1. User clicks "Sign in with Google"
2. `authService.signInWithGoogle()` called
3. Supabase redirects to Google OAuth
4. User authorizes
5. Redirect back to app with session
6. `AuthContext` updates user state
7. User profile created in `public.users` table (via trigger)

**Files**:
- `services/authService.ts` - Auth methods
- `components/contexts/AuthContext.tsx` - React Context
- `supabase/schema.sql` - Database trigger for user creation

### 3. Appraisal History

**Storage**: Supabase PostgreSQL (`appraisals` table)

**Features**:
- Persistent storage across devices
- Row Level Security (users only see their own)
- Automatic timestamps
- Category filtering
- Delete functionality

**Database Operations** (`services/dbService.ts`):
- `getHistory(userId)` - Fetch all user appraisals
- `saveAppraisal(userId, appraisal)` - Save new appraisal
- `deleteAppraisal(userId, appraisalId)` - Delete appraisal
- `getCategories(userId)` - Get unique categories
- `getHistoryByCategory(userId, category)` - Filter by category

### 4. Image Storage

**Current Implementation** (`app/api/appraise/route.ts:119-147`):
- Images uploaded to Supabase Storage bucket `appraisal-images`
- Stored in `public/` folder (needs optimization)
- Public URLs stored in database `image_url` field

**Issues**:
- ⚠️ Using public bucket (should be user-specific)
- ⚠️ No authentication context in API route
- ⚠️ Storage policies need optimization

---

## Database Schema

### Tables

#### `public.users`
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

**RLS Policies**:
- Users can SELECT, UPDATE, INSERT their own data only

#### `public.appraisals`
```sql
CREATE TABLE public.appraisals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  item_name TEXT NOT NULL,
  author TEXT,
  era TEXT,
  category TEXT NOT NULL,
  description TEXT,
  price_low NUMERIC(10, 2) NOT NULL,
  price_high NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  reasoning TEXT,
  image_url TEXT,
  references JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

**RLS Policies**:
- Users can SELECT, INSERT, UPDATE, DELETE their own appraisals only

**Indexes**:
- `idx_appraisals_user_id` - Fast user lookups
- `idx_appraisals_created_at` - Chronological ordering
- `idx_appraisals_category` - Category filtering

**Triggers**:
- `update_appraisals_updated_at` - Auto-update timestamp
- `on_auth_user_created` - Auto-create user profile

---

## Storage Architecture

### Current Setup

**Bucket**: `appraisal-images`
- **Type**: Public (needs to be optimized)
- **Path Structure**: `public/{timestamp}-{random}.{ext}`

**Issues**:
1. All images in public folder (no user isolation)
2. API route uses anon key (no auth context)
3. Storage policies don't enforce user ownership

### Recommended Setup

**Bucket**: `appraisal-images`
- **Type**: Private with public read access
- **Path Structure**: `{user_id}/{appraisal_id}/{filename}`

**Benefits**:
- User-specific folders for organization
- Better security (users can only access their own)
- Easier cleanup when user deletes account
- Better performance (folder-level permissions)

---

## API Endpoints

### POST `/api/appraise`

**Purpose**: Analyze item images and generate appraisal

**Request**:
- `Content-Type`: `multipart/form-data`
- `files`: File[] (images)
- `condition`: string (Mint, Excellent, Good, Fair, Poor)

**Response**:
```json
{
  "appraisalData": {
    "itemName": "...",
    "author": "...",
    "era": "...",
    "category": "...",
    "description": "...",
    "priceRange": { "low": 0, "high": 0 },
    "currency": "USD",
    "reasoning": "...",
    "references": [...]
  },
  "imageDataUrl": "https://..."
}
```

**Process**:
1. Validate files and condition
2. Convert images to base64 for Gemini
3. Call Gemini for analysis
4. Call Gemini for image regeneration
5. Upload regenerated image to Supabase Storage
6. Return appraisal data + image URL

**Error Handling**:
- Returns 400 for invalid requests
- Returns 500 for AI/storage errors
- Logs errors to console

---

## Authentication Flow

### Sign In

```
User clicks "Sign in with Google"
    ↓
authService.signInWithGoogle()
    ↓
supabase.auth.signInWithOAuth({ provider: 'google' })
    ↓
Redirect to Google OAuth
    ↓
User authorizes
    ↓
Redirect back to app
    ↓
AuthContext.onAuthStateChange() triggered
    ↓
User state updated
    ↓
Database trigger creates user profile
```

### Sign Out

```
User clicks "Sign out"
    ↓
authService.signOut()
    ↓
supabase.auth.signOut()
    ↓
Session cleared
    ↓
AuthContext updates user to null
```

### Session Management

- Sessions persist via Supabase client
- Auto-refresh tokens enabled
- Auth state changes trigger React updates

---

## Image Processing Workflow

### Current Flow

```
1. User uploads image(s) via FileUpload component
    ↓
2. FormData created with files + condition
    ↓
3. POST /api/appraise
    ↓
4. Convert files to base64 for Gemini
    ↓
5. Gemini Analysis (gemini-2.5-flash)
    - Extracts item details
    - Determines price range
    - Generates reasoning
    - Finds references
    ↓
6. Gemini Image Regeneration (gemini-2.5-flash-image-preview)
    - Regenerates item image
    - Returns as base64 buffer
    ↓
7. Upload to Supabase Storage
    - Convert buffer to file
    - Upload to public/{filename}
    - Get public URL
    ↓
8. Return appraisal data + image URL
    ↓
9. Save to database (if user logged in)
    - Store image_url in appraisals table
    - Store all appraisal metadata
```

### Storage Optimization Needed

**Current**: `public/{timestamp}-{random}.{ext}`  
**Recommended**: `{user_id}/{appraisal_id}/{filename}`

**Benefits**:
- User isolation
- Better organization
- Easier cleanup
- Security improvements

---

## Environment Variables

### Required

```bash
# Google Gemini API Key (server-side only)
GEMINI_API_KEY="your-gemini-api-key"

# Supabase Configuration (public - exposed in browser)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

### Optional

```bash
# Google OAuth (for reference, configured in Supabase)
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

---

## Deployment

### Vercel Setup

1. Connect GitHub repository
2. Configure environment variables
3. Auto-deploy on push to `main`

### Supabase Setup

1. Create project
2. Run `schema.sql` in SQL Editor
3. Run `setup_storage.sql` in SQL Editor
4. Configure Google OAuth provider
5. Set up storage bucket policies

---

## Known Issues & Future Improvements

### Current Issues

1. **Image Storage** ⚠️
   - Using public bucket folder
   - No user-specific organization
   - API route lacks auth context

2. **Storage Policies** ⚠️
   - Policies don't enforce user ownership
   - Public access may be too permissive

### Planned Improvements

1. **Storage Optimization**
   - User-specific folders
   - Authenticated uploads in API route
   - Better storage policies

2. **Performance**
   - Image compression before upload
   - CDN for image delivery
   - Caching strategies

3. **Features**
   - Batch uploads
   - PDF export
   - Share appraisals via link
   - Price tracking over time

---

## Development Workflow

### Local Setup

```bash
# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local
# Edit with your keys

# Run dev server
npm run dev
# App runs on http://localhost:3001
```

### Database Migrations

1. Make changes to `supabase/schema.sql`
2. Run in Supabase SQL Editor
3. Update TypeScript types in `lib/supabase.ts`
4. Test locally
5. Deploy

### Testing Checklist

- [ ] Google sign-in works
- [ ] File upload works (drag-and-drop and file picker)
- [ ] Appraisal returns valid data
- [ ] Image displays correctly
- [ ] History saves and loads
- [ ] Sign-out clears session
- [ ] RLS policies work correctly

---

## Security Considerations

### Row Level Security (RLS)

- All tables have RLS enabled
- Users can only access their own data
- Policies enforced at database level

### API Security

- API routes are server-side only
- Environment variables not exposed to client
- File upload validation

### Storage Security

- ⚠️ Currently public (needs improvement)
- Should be user-specific with proper policies

---

## Support & Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Project Files
- Database Schema: `supabase/schema.sql`
- Storage Setup: `supabase/setup_storage.sql`
- Type Definitions: `lib/types.ts`
- Constants: `lib/constants.ts`

---

**End of Documentation**

