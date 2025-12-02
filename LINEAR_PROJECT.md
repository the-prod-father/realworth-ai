# RealWorth.ai - Linear Project Management Document

**Project**: RealWorth.ai
**Team**: Why Not Us Labs
**Start Date**: November 17, 2025
**Production URL**: https://realworth.ai
**Repository**: https://github.com/the-prod-father/realworth-ai
**Mission**: Build a $5M ARR AI-powered appraisal platform by 2026

---

## Project Overview

RealWorth.ai is an AI-powered appraisal platform that uses Google Gemini to analyze images of collectibles, antiques, and valuables to provide instant valuations. Users can upload photos, get detailed appraisals with price ranges, organize items into collections, and chat with AI about their items.

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **AI**: Google Gemini 2.5 Flash
- **Auth**: Supabase Auth (Google OAuth)
- **Database**: Supabase PostgreSQL with RLS
- **Payments**: Stripe (subscriptions, webhooks)
- **Storage**: Supabase Storage
- **Hosting**: Vercel
- **Analytics**: Google Analytics 4, Vercel Analytics

---

## Linear Configuration

### Labels
Create these labels in Linear:
- `frontend` - UI/UX changes
- `backend` - API/server changes
- `ai` - AI/ML related
- `payments` - Stripe/billing
- `auth` - Authentication
- `database` - Database/Supabase
- `mobile` - Mobile-specific
- `performance` - Performance optimization
- `security` - Security related
- `bug` - Bug fix
- `feature` - New feature
- `tech-debt` - Technical debt
- `documentation` - Docs updates
- `marketing` - Marketing/launch related

### Priority Levels
- `Urgent` - Production issue, blocking
- `High` - Current sprint priority
- `Medium` - Backlog, next sprint
- `Low` - Nice to have, future

### Status Workflow
`Backlog` → `Todo` → `In Progress` → `In Review` → `Done` → `Canceled`

---

## COMPLETED TICKETS (Sprint 1-3)

### Epic: Infrastructure & Deployment [COMPLETED]
**Status**: Done | **Completed**: Nov 17-19, 2025

#### RW-001: Initial Next.js Setup
- **Status**: Done
- **Priority**: High
- **Labels**: `frontend`, `backend`
- **Description**: Initialize Next.js 14 project with TypeScript, Tailwind CSS, and App Router
- **Completed**: Nov 17, 2025

#### RW-002: Vercel Deployment
- **Status**: Done
- **Priority**: High
- **Labels**: `backend`
- **Description**: Deploy to Vercel with auto-deployment from GitHub main branch
- **Completed**: Nov 17, 2025

#### RW-003: Custom Domain Setup
- **Status**: Done
- **Priority**: High
- **Labels**: `backend`
- **Description**: Connect realworth.ai custom domain to Vercel, configure DNS A records
- **Completed**: Nov 19, 2025

#### RW-004: Logo & Branding
- **Status**: Done
- **Priority**: Medium
- **Labels**: `frontend`, `documentation`
- **Description**: Create treasure chest SVG logo (512x512), PNG for social (1200x1200), iOS icon (180x180), update metadata with favicon, Open Graph, Twitter cards
- **Completed**: Nov 19, 2025

---

### Epic: Database & Authentication [COMPLETED]
**Status**: Done | **Completed**: Nov 18, 2025

#### RW-005: Supabase Setup
- **Status**: Done
- **Priority**: High
- **Labels**: `database`, `backend`
- **Description**: Set up Supabase project, create users and appraisals tables, implement Row Level Security policies
- **Completed**: Nov 18, 2025

#### RW-006: Google OAuth Integration
- **Status**: Done
- **Priority**: High
- **Labels**: `auth`, `backend`
- **Description**: Implement Supabase Auth with Google OAuth, update authService.ts
- **Completed**: Nov 18, 2025

#### RW-007: Database Migration from localStorage
- **Status**: Done
- **Priority**: High
- **Labels**: `database`, `backend`
- **Description**: Migrate from localStorage to Supabase PostgreSQL, update dbService.ts
- **Completed**: Nov 18, 2025

---

### Epic: Core AI Appraisal [COMPLETED]
**Status**: Done | **Completed**: Nov 17-21, 2025

#### RW-008: Gemini API Integration
- **Status**: Done
- **Priority**: High
- **Labels**: `ai`, `backend`
- **Description**: Integrate Google Gemini API for image analysis and appraisal generation
- **Completed**: Nov 17, 2025

#### RW-009: Appraisal Form UI
- **Status**: Done
- **Priority**: High
- **Labels**: `frontend`
- **Description**: Create AppraisalForm component with image upload, drag-and-drop support
- **Completed**: Nov 17, 2025

#### RW-010: Result Display
- **Status**: Done
- **Priority**: High
- **Labels**: `frontend`
- **Description**: Create ResultCard component showing item name, description, price range, category, era
- **Completed**: Nov 17, 2025

#### RW-011: Multi-Photo Support
- **Status**: Done
- **Priority**: Medium
- **Labels**: `frontend`, `ai`
- **Description**: Add "More Photos" feature for multi-angle appraisals, image carousel navigation
- **Completed**: Nov 21, 2025

#### RW-012: Upgrade to Gemini 2.5 Flash
- **Status**: Done
- **Priority**: Medium
- **Labels**: `ai`
- **Description**: Upgrade AI model from Gemini Pro to Gemini 2.5 Flash for faster, higher quality responses
- **Completed**: Nov 21, 2025

---

### Epic: UI/UX Overhaul [COMPLETED]
**Status**: Done | **Completed**: Nov 19-24, 2025

#### RW-013: Replace Emojis with SVG Icons
- **Status**: Done
- **Priority**: Medium
- **Labels**: `frontend`
- **Description**: Replace all emojis with custom SVG icons throughout the app for professional appearance
- **Completed**: Nov 19, 2025

#### RW-014: Mobile Responsive Design
- **Status**: Done
- **Priority**: High
- **Labels**: `frontend`, `mobile`
- **Description**: Ensure all pages are mobile-responsive, test on various screen sizes
- **Completed**: Nov 24, 2025

#### RW-015: Mobile Bottom Navigation
- **Status**: Done
- **Priority**: Medium
- **Labels**: `frontend`, `mobile`
- **Description**: Add BottomTabNav component for mobile navigation (Home, Discover, Collections, Profile)
- **Completed**: Nov 24, 2025

#### RW-016: Loading Skeletons
- **Status**: Done
- **Priority**: Medium
- **Labels**: `frontend`, `performance`
- **Description**: Add skeleton loading states for better perceived performance
- **Completed**: Nov 25, 2025

---

### Epic: Collections & Organization [COMPLETED]
**Status**: Done | **Completed**: Nov 21, 2025

#### RW-017: Collection Builder
- **Status**: Done
- **Priority**: High
- **Labels**: `frontend`, `feature`
- **Description**: Add ability to create collections and organize appraisals into groups
- **Completed**: Nov 21, 2025

#### RW-018: Scan Mode / Batch Processing
- **Status**: Done
- **Priority**: Medium
- **Labels**: `frontend`, `ai`, `feature`
- **Description**: Add AI-powered Scan Mode for bulk item processing
- **Completed**: Nov 21, 2025

#### RW-019: Archive/Unarchive Feature
- **Status**: Done
- **Priority**: Low
- **Labels**: `frontend`, `feature`
- **Description**: Allow users to archive items they no longer want visible
- **Completed**: Nov 21, 2025

#### RW-020: Pagination & Search
- **Status**: Done
- **Priority**: Medium
- **Labels**: `frontend`, `performance`
- **Description**: Add pagination to history list, implement search/filter functionality
- **Completed**: Nov 25, 2025

---

### Epic: Social Features [COMPLETED]
**Status**: Done | **Completed**: Nov 20-23, 2025

#### RW-021: User Profiles
- **Status**: Done
- **Priority**: Medium
- **Labels**: `frontend`, `feature`
- **Description**: Create user profile pages with username support, anonymous user fallback
- **Completed**: Nov 20, 2025

#### RW-022: Friends System
- **Status**: Done
- **Priority**: Low
- **Labels**: `frontend`, `backend`, `feature`
- **Description**: Implement friend request system and friend list
- **Completed**: Nov 20, 2025

#### RW-023: Leaderboard
- **Status**: Done
- **Priority**: Low
- **Labels**: `frontend`, `feature`
- **Description**: Create leaderboard page showing top collectors
- **Completed**: Nov 20, 2025

#### RW-024: Discover Page
- **Status**: Done
- **Priority**: Medium
- **Labels**: `frontend`, `feature`
- **Description**: Public discover page showing recently appraised items
- **Completed**: Nov 20, 2025

#### RW-025: Expert Opinion Links
- **Status**: Done
- **Priority**: Low
- **Labels**: `frontend`, `feature`
- **Description**: Add links to expert resources for second opinions on valuations
- **Completed**: Nov 23, 2025

---

### Epic: Pro Tier & Monetization [COMPLETED]
**Status**: Done | **Completed**: Nov 22-Dec 1, 2025

#### RW-026: Stripe Integration
- **Status**: Done
- **Priority**: High
- **Labels**: `payments`, `backend`
- **Description**: Set up Stripe with products, prices, checkout sessions
- **Completed**: Nov 22, 2025

#### RW-027: Pro Subscription Flow
- **Status**: Done
- **Priority**: High
- **Labels**: `payments`, `frontend`
- **Description**: Implement checkout flow, create UpgradeModal component
- **Completed**: Dec 1, 2025

#### RW-028: Stripe Webhook Handler
- **Status**: Done
- **Priority**: High
- **Labels**: `payments`, `backend`
- **Description**: Create webhook endpoint to handle subscription events (checkout.session.completed, subscription.updated, etc.)
- **Completed**: Dec 1, 2025

#### RW-029: Usage Limits for Free Tier
- **Status**: Done
- **Priority**: High
- **Labels**: `payments`, `backend`
- **Description**: Implement 10 appraisals/month limit for free users, unlimited for Pro
- **Completed**: Nov 22, 2025

#### RW-030: Prominent Upgrade CTAs
- **Status**: Done
- **Priority**: Medium
- **Labels**: `frontend`, `payments`
- **Description**: Add "Go Pro" button in header, upgrade banner on home page, mobile upgrade button
- **Completed**: Dec 1, 2025

#### RW-031: Access Code System
- **Status**: Done
- **Priority**: Low
- **Labels**: `payments`, `backend`, `feature`
- **Description**: Allow admin-generated access codes to grant Pro status
- **Completed**: Nov 25, 2025

---

### Epic: AI Chat Feature [COMPLETED]
**Status**: Done | **Completed**: Nov 25, 2025

#### RW-032: Chat Interface
- **Status**: Done
- **Priority**: Medium
- **Labels**: `frontend`, `ai`, `feature`
- **Description**: Create ChatInterface component for conversational AI about appraisals
- **Completed**: Nov 25, 2025

#### RW-033: Chat API Endpoint
- **Status**: Done
- **Priority**: Medium
- **Labels**: `backend`, `ai`
- **Description**: Create /api/chat endpoint using Gemini for contextual conversations
- **Completed**: Nov 25, 2025

#### RW-034: Chat FAB (Floating Action Button)
- **Status**: Done
- **Priority**: Low
- **Labels**: `frontend`
- **Description**: Add floating chat button accessible from any page (Pro users only)
- **Completed**: Nov 25, 2025

---

### Epic: Analytics & Monitoring [COMPLETED]
**Status**: Done | **Completed**: Dec 1, 2025

#### RW-035: Google Analytics 4 Setup
- **Status**: Done
- **Priority**: High
- **Labels**: `backend`, `marketing`
- **Description**: Integrate GA4 (G-QP4YVC37S9), track page views, login, upgrade_click, begin_checkout events
- **Completed**: Dec 1, 2025

#### RW-036: Vercel Analytics
- **Status**: Done
- **Priority**: Low
- **Labels**: `backend`, `performance`
- **Description**: Enable Vercel Analytics and Speed Insights
- **Completed**: Nov 22, 2025

---

### Epic: Image Storage Migration [COMPLETED]
**Status**: Done | **Completed**: Nov 2025

#### RW-037: Supabase Storage Setup
- **Status**: Done
- **Priority**: High
- **Labels**: `database`, `backend`, `performance`
- **Description**: Create appraisal-images bucket, configure public access
- **Completed**: Nov 2025

#### RW-038: Image Upload Service
- **Status**: Done
- **Priority**: High
- **Labels**: `backend`
- **Description**: Update dbService to upload images to Supabase Storage instead of storing base64 in database
- **Completed**: Nov 2025

---

### Sprint 4 (Dec 1, 2025) [COMPLETED TODAY]

#### RW-039: Webhook Admin Client Fix
- **Status**: Done
- **Priority**: Urgent
- **Labels**: `payments`, `backend`, `bug`
- **Description**: Fix webhook subscription updates by using Supabase admin client to bypass RLS
- **Completed**: Dec 1, 2025

#### RW-040: Clickable Appraisal Cards
- **Status**: Done
- **Priority**: Medium
- **Labels**: `frontend`
- **Description**: Make appraisal cards in history list navigate to /treasure/[id] detail page when clicked
- **Completed**: Dec 1, 2025

#### RW-041: Switch to Live Stripe Mode
- **Status**: Done
- **Priority**: High
- **Labels**: `payments`
- **Description**: Switch production from test to live Stripe keys, configure environment separation (Production=Live, Preview=Test)
- **Completed**: Dec 1, 2025

---

## CURRENT SPRINT TICKETS

### Epic: Launch Preparation
**Status**: In Progress | **Target**: Dec 2-7, 2025

#### RW-042: Fix Live Webhook Failures
- **Status**: Todo
- **Priority**: Urgent
- **Labels**: `payments`, `backend`, `bug`
- **Estimate**: 1 point
- **Description**: Investigate why 19 webhook events failed in Stripe dashboard. Check Event deliveries tab for specific errors, ensure live webhook secret is correct.
- **Acceptance Criteria**:
  - [ ] Review failed events in Stripe dashboard
  - [ ] Verify webhook signature verification is working
  - [ ] Test with new subscription to confirm fix
  - [ ] All future subscription activations work automatically

#### RW-043: Demo Video Creation
- **Status**: Todo
- **Priority**: High
- **Labels**: `marketing`
- **Estimate**: 2 points
- **Description**: Create 2-minute screen recording showing RealWorth.ai in action - upload photo, get appraisal, show collections, demonstrate Pro features
- **Acceptance Criteria**:
  - [ ] Script written
  - [ ] Recording completed
  - [ ] Edited and uploaded to YouTube/Loom

#### RW-044: Launch Social Posts
- **Status**: Todo
- **Priority**: High
- **Labels**: `marketing`
- **Estimate**: 1 point
- **Description**: Write and schedule 5 social media posts for launch (Twitter, LinkedIn)
- **Acceptance Criteria**:
  - [ ] 5 posts written
  - [ ] Posts scheduled
  - [ ] Hashtags and mentions included

#### RW-045: Reddit Launch Strategy
- **Status**: Todo
- **Priority**: High
- **Labels**: `marketing`
- **Estimate**: 2 points
- **Description**: Prepare posts for target subreddits: r/SideProject, r/Entrepreneur, r/Flipping, r/BookCollecting, r/Antiques
- **Acceptance Criteria**:
  - [ ] Read rules for each subreddit
  - [ ] Draft posts tailored to each community
  - [ ] Plan posting schedule (stagger to avoid spam)

---

## BACKLOG TICKETS

### Epic: User Experience Polish
**Priority**: Medium | **Target**: Dec 2025

#### RW-046: Error Boundaries
- **Status**: Backlog
- **Priority**: Medium
- **Labels**: `frontend`, `tech-debt`
- **Estimate**: 2 points
- **Description**: Implement React error boundaries for graceful failure handling throughout the app

#### RW-047: Empty State Illustrations
- **Status**: Backlog
- **Priority**: Low
- **Labels**: `frontend`
- **Estimate**: 1 point
- **Description**: Add custom illustrations for empty states (no appraisals, no collections, etc.)

#### RW-048: Toast Notifications
- **Status**: Backlog
- **Priority**: Medium
- **Labels**: `frontend`
- **Estimate**: 2 points
- **Description**: Implement toast notification system for success/error messages

---

### Epic: Enhanced Features
**Priority**: Medium | **Target**: Jan 2026

#### RW-049: PDF Export
- **Status**: Backlog
- **Priority**: Medium
- **Labels**: `frontend`, `feature`
- **Estimate**: 3 points
- **Description**: Allow users to export appraisals as professionally formatted PDF documents

#### RW-050: Price Comparison Tool
- **Status**: Backlog
- **Priority**: Low
- **Labels**: `feature`, `ai`
- **Estimate**: 5 points
- **Description**: Compare similar items across the platform to see price trends

#### RW-051: Email Notifications
- **Status**: Backlog
- **Priority**: Low
- **Labels**: `backend`, `feature`
- **Estimate**: 3 points
- **Description**: Send email when appraisal is complete (optional user setting)

---

### Epic: Technical Debt
**Priority**: Low | **Target**: Q1 2026

#### RW-052: Refactor useAppraisal Hook
- **Status**: Backlog
- **Priority**: Low
- **Labels**: `tech-debt`, `frontend`
- **Estimate**: 3 points
- **Description**: Break down 300+ line useAppraisal hook into smaller, focused hooks

#### RW-053: Unit Test Coverage
- **Status**: Backlog
- **Priority**: Medium
- **Labels**: `tech-debt`
- **Estimate**: 5 points
- **Description**: Add unit tests for critical functions (currently 0% coverage)

#### RW-054: E2E Testing Setup
- **Status**: Backlog
- **Priority**: Medium
- **Labels**: `tech-debt`
- **Estimate**: 3 points
- **Description**: Set up Playwright for end-to-end testing of critical user flows

#### RW-055: API Rate Limiting
- **Status**: Backlog
- **Priority**: Medium
- **Labels**: `security`, `backend`
- **Estimate**: 2 points
- **Description**: Implement rate limiting on API routes to prevent abuse

#### RW-056: TypeScript Strict Mode
- **Status**: Backlog
- **Priority**: Low
- **Labels**: `tech-debt`
- **Estimate**: 3 points
- **Description**: Enable strict TypeScript mode and fix all type errors

---

### Epic: Future Roadmap
**Priority**: Low | **Target**: Q2 2026

#### RW-057: Mobile PWA Optimization
- **Status**: Backlog
- **Priority**: Low
- **Labels**: `mobile`, `performance`
- **Estimate**: 3 points
- **Description**: Full PWA support with offline mode, app-like experience

#### RW-058: React Native App
- **Status**: Backlog
- **Priority**: Low
- **Labels**: `mobile`, `feature`
- **Estimate**: 13 points
- **Description**: Native iOS/Android app for better mobile experience

#### RW-059: Historical Price Tracking
- **Status**: Backlog
- **Priority**: Low
- **Labels**: `feature`
- **Estimate**: 5 points
- **Description**: Track how item values change over time

#### RW-060: Community Valuations
- **Status**: Backlog
- **Priority**: Low
- **Labels**: `feature`
- **Estimate**: 8 points
- **Description**: Allow community voting/input on valuations

---

## KNOWN BUGS

#### RW-BUG-001: Mobile Safari Drag-and-Drop
- **Status**: Backlog
- **Priority**: Low
- **Labels**: `bug`, `mobile`
- **Description**: Drag-and-drop file upload doesn't work on iOS Safari. Users must use file picker.

#### RW-BUG-002: Large Image Timeout
- **Status**: Backlog
- **Priority**: Medium
- **Labels**: `bug`, `performance`
- **Description**: Images over 10MB cause timeout issues during upload/processing

#### RW-BUG-003: Session Persistence
- **Status**: Backlog
- **Priority**: Medium
- **Labels**: `bug`, `auth`
- **Description**: Users logged out after browser restart, needs "remember me" functionality

---

## METRICS & MILESTONES

### North Star Metric
**$5M ARR by 2026** = 41,742 Pro subscribers @ $9.99/month

### Milestone Tracking

| Milestone | Target | MRR | Pro Users | Free Users | Status |
|-----------|--------|-----|-----------|------------|--------|
| M1: First Revenue | Month 1-2 | $1K | 100 | 1,000 | Not Started |
| M2: Ramen Profitable | Month 3-6 | $10K | 1,000 | 10,000 | Not Started |
| M3: Growth Phase | Month 7-12 | $50K | 5,000 | 50,000 | Not Started |
| M4: Scale Phase | Month 13-18 | $100K | 10,000 | 100,000 | Not Started |
| M5: $5M ARR | Month 19-24 | $417K | 41,742 | 400,000+ | Not Started |

### Current Metrics (Dec 1, 2025)
- **Total Users**: TBD (check GA)
- **Pro Subscribers**: 2
- **MRR**: $19.98
- **Total Appraisals**: 43
- **Conversion Rate**: TBD

---

## WINS LOG

Track accomplishments for team morale and retrospectives:

| Date | Win |
|------|-----|
| Dec 1, 2025 | First real paying customer (gavindmcnamara@gmail.com) |
| Dec 1, 2025 | Google Analytics 4 live |
| Dec 1, 2025 | Live Stripe payments enabled |
| Nov 25, 2025 | AI Chat feature launched for Pro users |
| Nov 24, 2025 | Mobile navigation polished |
| Nov 22, 2025 | Stripe integration completed |
| Nov 21, 2025 | Collection Builder launched |
| Nov 21, 2025 | Scan Mode for batch processing |
| Nov 20, 2025 | Social features and profiles |
| Nov 19, 2025 | Custom domain live at realworth.ai |
| Nov 18, 2025 | Supabase migration complete |
| Nov 17, 2025 | First production deployment |

---

## HOW TO USE THIS DOCUMENT

### For Claude Desktop Linear Integration

1. **Create Project**: Create a new Linear project called "RealWorth.ai"
2. **Create Labels**: Add all labels from the "Labels" section above
3. **Import Completed Tickets**: Create all RW-001 through RW-041 tickets and mark as Done
4. **Import Current Sprint**: Create RW-042 through RW-045 as Todo
5. **Import Backlog**: Create remaining tickets as Backlog

### After Each Work Session

Provide Claude Desktop with an update like:
```
Update Linear for RealWorth.ai:
- Completed: [ticket numbers and brief description]
- New issues discovered: [any bugs or tasks]
- Blockers: [any blockers]
- Next session focus: [what you'll work on next]
```

### Weekly Review

Every Friday, ask Claude Desktop to:
1. Move any completed tickets to Done
2. Update milestone progress
3. Add new wins to the wins log
4. Prioritize next week's sprint

---

**Document Version**: 1.0
**Last Updated**: December 1, 2025
**Maintained By**: Claude Code + Gavin McNamara
