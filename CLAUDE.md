# RealWorth.ai - Project Documentation

## Overview
RealWorth.ai is an AI-powered appraisal platform that uses Google Gemini to analyze images of items (books, collectibles, antiques, etc.) and provide detailed valuations with market pricing estimates.

**Current Status**: Production-ready and deployed at https://realworth.ai

**Last Updated**: 2025-11-19

## Recent Changes (2025-11-19)

### Logo & Branding Integration ✅
- Created treasure chest SVG logo (512x512) with teal gems and navy outline
- Generated PNG version (1200x1200) for social media previews
- Created iOS home screen icon (180x180)
- Updated metadata with favicon, Open Graph, and Twitter card tags
- Logo appears in browser tabs, social sharing, and iOS home screen
- **Files**: `public/logo.svg`, `public/og-image.png`, `public/apple-touch-icon.png`
- **Deployed**: https://realworth.ai

### Supabase Production Integration ✅
- Migrated from localStorage to Supabase PostgreSQL
- Set up authentication with Supabase Auth (Google OAuth provider)
- Created database schema with users and appraisals tables
- Implemented Row Level Security (RLS) policies
- Updated authService.ts and dbService.ts to use Supabase
- Configured environment variables in Vercel
- **Files**: `supabase/schema.sql`, `lib/supabase.ts`, `services/authService.ts`, `services/dbService.ts`
- **Status**: Fully operational in production

### Domain & Deployment ✅
- Connected realworth.ai custom domain to Vercel
- Configured DNS with proper A records
- Auto-deployment from GitHub main branch working
- Production environment variables configured
- **Live URLs**: https://realworth.ai, https://www.realworth.ai

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
- **Storage**: Supabase (production) - images and appraisal data

### Infrastructure
- **Hosting**: Vercel (auto-deploy from GitHub)
- **Git**: GitHub (the-prod-father/realworth-ai)
- **Database**: Supabase (gwoahdeybyjfonoahmvv.supabase.co)
- **Domains**:
  - Production: https://realworth.ai ✅ LIVE
  - WWW: https://www.realworth.ai ✅ LIVE
  - Vercel: https://real-worth.vercel.app

### Branding Assets
- **Logo SVG**: `/public/logo.svg` (512x512 treasure chest design)
- **Open Graph Image**: `/public/og-image.png` (1200x1200 PNG for social sharing)
- **iOS Icon**: `/public/apple-touch-icon.png` (180x180 PNG for home screen)
- **Colors**: Teal (#14B8A6) and Navy (#1e293b)
- **Design**: Modern minimalist treasure chest with gems/sparkles

## Project Structure

```
realworth-ai/
├── app/
│   ├── layout.tsx              # Root layout with Google OAuth script
│   ├── page.tsx                # Main page with auth and appraisal logic
│   └── api/
│       └── appraise/
│           └── route.ts        # AI appraisal API endpoint
├── components/
│   ├── AppraisalForm.tsx       # Upload form with file picker and condition selector
│   ├── FileUpload.tsx          # Drag-and-drop file upload component
│   ├── HistoryList.tsx         # Display user's appraisal history
│   ├── ResultCard.tsx          # Display appraisal results
│   ├── contexts/
│   │   └── AuthContext.tsx     # React Context for authentication state
│   └── icons.tsx               # SVG icon components
├── hooks/
│   └── useAppraisal.tsx        # Custom hook for appraisal logic
├── lib/
│   ├── types.ts                # TypeScript type definitions
│   └── constants.ts            # App constants (CONDITIONS array)
├── services/
│   ├── authService.ts          # Supabase Auth with Google OAuth
│   └── dbService.ts            # Supabase database operations
├── supabase/
│   ├── schema.sql              # Database schema (users, appraisals tables)
│   └── SETUP.md                # Supabase setup instructions
├── public/
│   ├── logo.svg                # Main logo (treasure chest SVG)
│   ├── og-image.png            # Social sharing image (1200x1200)
│   └── apple-touch-icon.png    # iOS home screen icon (180x180)
├── types/
│   └── google.d.ts             # Google Identity Services type declarations
├── .env.local                  # Environment variables (NOT in git)
├── package.json                # Dependencies and scripts
├── tailwind.config.ts          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

## Core Features

### 1. Supabase Authentication
- Supabase Auth with Google OAuth provider
- Automatic user creation in database on first sign-in
- Session management with JWT tokens
- Real-time auth state changes
- Server-side session validation

**Implementation**:
- `services/authService.ts` - Auth methods (signIn, signOut, getCurrentUser, onAuthStateChange)
- `components/contexts/AuthContext.tsx` - React Context for auth state
- `supabase/schema.sql` - Database trigger for automatic user creation

### 2. AI Appraisal Workflow
Two-step process:
1. **Analysis**: Uploads images to Gemini 2.5 Flash with structured JSON response schema
2. **Image Regeneration**: Uses Gemini 2.5 Flash Image Preview to recreate item image

**API Endpoint**: `app/api/appraise/route.ts:35-104`

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
}
```

### 3. Condition-Based Valuation
Users specify item condition:
- Mint
- Excellent
- Good
- Fair
- Poor

Condition is passed to AI for accurate pricing.

### 4. Appraisal History & Database
- Stored in Supabase PostgreSQL (appraisals table)
- Automatic Row Level Security - users can only see their own appraisals
- Persists across devices and sessions
- Displays in grid layout with thumbnails
- Click to view full appraisal details

**Database Schema**: `supabase/schema.sql`
- `users` table - stores user profiles from Google OAuth
- `appraisals` table - stores appraisal results with foreign key to users
- Automatic timestamps and user creation triggers

## Environment Variables

### Required for Local Development
Create `.env.local` with:

```bash
# Google Gemini API Key (SECRET - server-side only)
GEMINI_API_KEY="your-gemini-api-key"

# Supabase Configuration (PUBLIC - exposed in browser)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Google OAuth (optional, for reference)
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Production (Vercel)
All environment variables are configured in Vercel dashboard:
- `GEMINI_API_KEY` - Google Gemini API key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth client ID (for reference)

### Supabase Setup
See `supabase/SETUP.md` for detailed instructions on:
- Creating Supabase project
- Running database schema
- Configuring Google OAuth
- Setting up Row Level Security

## Google OAuth Configuration

### Authorized JavaScript Origins
Add these to Google Cloud Console:
- `http://localhost:3001` (local development)
- `https://real-worth.vercel.app` (production)
- `https://realworth.ai` (custom domain - after DNS setup)
- `https://www.realworth.ai` (www subdomain - after DNS setup)

### Redirect URIs
Not required for OAuth 2.0 Token Client (popup-based flow)

## Development Workflow

### Initial Setup
```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
# App runs on http://localhost:3001
```

### Available Scripts
- `npm run dev` - Start dev server on port 3001
- `npm run build` - Create production build
- `npm start` - Run production build
- `npm run lint` - Run ESLint

### Git Workflow
```bash
# Add changes
git add .

# Commit with descriptive message
git commit -m "Your message"

# Push to GitHub (triggers Vercel deployment)
git push origin main
```

## Deployment

### Vercel Setup
1. Project connected to GitHub repo: `the-prod-father/realworth-ai`
2. Auto-deploys on push to `main` branch
3. Environment variables configured in Vercel dashboard

### Production URLs
- **Vercel**: https://real-worth.vercel.app
- **Custom Domain**: realworth.ai (requires DNS configuration)

### DNS Configuration for Custom Domain
Add these A records at your domain registrar:

```
Type: A
Name: @
Value: 76.76.21.21

Type: A
Name: www
Value: 76.76.21.21
```

Verification takes 5-30 minutes after DNS propagation.

## TypeScript Configuration

### Strict Mode Enabled
All files must pass TypeScript strict checks for production builds.

### Common Type Definitions

**User** (`lib/types.ts:3-8`):
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}
```

**AppraisalRequest** (`lib/types.ts:10-13`):
```typescript
export interface AppraisalRequest {
  files: File[];
  condition: string;
}
```

**AppraisalResult** (`lib/types.ts:15-31`):
```typescript
export interface AppraisalResult {
  id: string;
  itemName: string;
  author: string;
  era: string;
  category: string;
  description: string;
  priceRange: {
    low: number;
    high: number;
  };
  currency: string;
  reasoning: string;
  image: string;
  timestamp: number;
}
```

## Architecture Patterns

### Client-Side State Management
- React Context for authentication (`components/contexts/AuthContext.tsx`)
- Custom hooks for appraisal logic (`hooks/useAppraisal.tsx`)
- localStorage for persistence (temporary, migrating to Supabase)

### API Design
- Next.js API Routes for server-side logic
- FormData for multi-file uploads
- Structured JSON responses with error handling

### Error Handling
- Try-catch blocks in all async operations
- User-friendly error messages
- Console logging for debugging

## Known Issues & Future Improvements

### Current Limitations
1. **Image Storage**: Images currently stored as base64 data URLs in database
   - Consider migrating to Supabase Storage for better performance
   - Would reduce database size and improve load times

2. **No Email Notifications**: Users don't receive email confirmations or appraisal summaries

3. **Limited Export Options**: No PDF or CSV export functionality yet

### Planned Improvements
1. **Enhanced Features**:
   - PDF export of appraisals with professional formatting
   - Comparison tool for multiple items side-by-side
   - Price tracking over time with historical data
   - Share appraisals via link with public/private toggle
   - Email notifications for completed appraisals

2. **Performance Optimizations**:
   - Migrate images to Supabase Storage
   - Implement caching for frequently accessed appraisals
   - Add pagination for appraisal history
   - Optimize AI response times

3. **User Experience**:
   - Batch upload multiple items at once
   - Mobile app (React Native or PWA)
   - Advanced search and filtering in history
   - Save draft appraisals before completion

## Troubleshooting

### OAuth Issues
**Problem**: "Error retrieving a token"
**Solution**: Ensure JavaScript origins are configured correctly in Google Cloud Console

**Problem**: "Google OAuth services failed to load"
**Solution**: Check internet connection, verify Google script is loading (check Network tab)

### Build Issues
**Problem**: TypeScript errors in production build
**Solution**: All import paths must use `@/lib/types` not `@/types`

**Problem**: "Cannot find module" errors
**Solution**: Check `tsconfig.json` paths configuration and file locations

### API Issues
**Problem**: "GEMINI_API_KEY environment variable not set"
**Solution**: Create `.env.local` file with correct API key

**Problem**: AI response is incomplete
**Solution**: Check Gemini API quota and rate limits

## Testing

### Manual Testing Checklist
- [ ] Google sign-in works
- [ ] File upload (drag-and-drop and file picker)
- [ ] Appraisal returns valid JSON response
- [ ] Image regeneration displays correctly
- [ ] History saves and displays properly
- [ ] Sign-out clears session
- [ ] Responsive design on mobile/tablet

### Test Credentials
Use your own Google account for OAuth testing.

## Performance Considerations

### Image Optimization
- Images converted to base64 for AI processing
- Regenerated images stored as data URLs
- Consider adding image compression in future

### API Response Times
- Appraisal: ~3-5 seconds
- Image regeneration: ~5-10 seconds
- Total workflow: ~8-15 seconds

### Caching Strategy
Currently no caching. Future improvements:
- Cache appraisal results in Supabase
- Add Redis for frequently accessed data

## Security Notes

### Environment Variables
- Never commit `.env.local` to git
- Use `NEXT_PUBLIC_` prefix only for client-safe variables
- Rotate API keys if accidentally exposed

### OAuth Security
- Uses Google's secure OAuth 2.0 flow
- Access tokens are short-lived
- No password storage required

### API Security
- API routes are server-side only
- FormData validation on file uploads
- Error messages don't expose sensitive info

## Contributing

### Code Style
- Use TypeScript strict mode
- Follow existing file structure
- Use Tailwind utility classes (no inline styles)
- Add type definitions for all functions

### Commit Messages
Format: `<type>: <description>`

Types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

### Pull Request Process
1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Test locally
4. Push and create PR
5. Wait for review and deployment

## Next Steps & Roadmap

### Immediate Priorities
1. **Image Storage Migration** (High Priority)
   - Move from base64 data URLs to Supabase Storage
   - Update dbService.ts to upload/retrieve images from storage
   - Will improve performance and reduce database size

2. **User Testing & Feedback** (High Priority)
   - Share with beta users
   - Collect feedback on UX and accuracy
   - Iterate on AI prompts for better valuations

3. **Analytics & Monitoring** (Medium Priority)
   - Add Vercel Analytics or Google Analytics
   - Track user engagement and appraisal patterns
   - Monitor error rates and API performance

### Feature Roadmap

**Phase 1 - Core Improvements** (Next 2-4 weeks)
- [ ] Migrate images to Supabase Storage
- [ ] Add pagination to appraisal history
- [ ] Implement basic search/filter in history
- [ ] Add loading skeletons for better UX
- [ ] Error boundary components for graceful failures

**Phase 2 - Enhanced Features** (1-2 months)
- [ ] PDF export of appraisals
- [ ] Share appraisals via public link
- [ ] Batch upload (multiple items at once)
- [ ] Price comparison tool
- [ ] Email notifications (optional)

**Phase 3 - Advanced Features** (2-3 months)
- [ ] Historical price tracking
- [ ] Market trends and insights
- [ ] Mobile PWA or React Native app
- [ ] Advanced AI features (condition detection, authenticity checks)
- [ ] Social features (share on social media, community valuations)

### Technical Debt
- Refactor useAppraisal hook for better code organization
- Add comprehensive error handling across all components
- Implement proper TypeScript strict mode throughout
- Add unit tests for critical functions
- Set up E2E testing with Playwright or Cypress

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vercel Deployment](https://vercel.com/docs)

### Support
- GitHub Issues: https://github.com/the-prod-father/realworth-ai/issues
- Email: [your-email]

## License
[Add your license here]

## Credits
Built with Claude Code by Anthropic.
