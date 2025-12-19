# Marketplace & Discovery Feature Spec

## Overview

Transform RealWorth from an appraisal tool into a full marketplace ecosystem with:
1. **Marketplace** - Buy/sell appraised items with local pickup
2. **Discovery Map** - Find garage sales, estate sales, and events nearby

## Business Model

- **Pro Subscription**: Required to list items for sale
- **Transaction Fee**: 2.5% on all completed sales
- **Buyers**: Free to browse and purchase (no subscription required)

---

## Part 1: Marketplace

### 1.1 Seller Verification & Onboarding

**Verification Levels:**
```
Unverified → Email Verified → Phone Verified → ID Verified → Bank Connected
```

**Requirements to Sell:**
- [ ] Pro subscription active
- [ ] Email verified (already have via Google OAuth)
- [ ] Phone number verified (SMS code)
- [ ] Stripe Connect account connected (for payouts)

**Optional (trust badges):**
- [ ] ID verification (Stripe Identity)
- [ ] Address verification

**Database: `users` table additions**
```sql
ALTER TABLE users ADD COLUMN phone_number TEXT;
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN stripe_connect_id TEXT;
ALTER TABLE users ADD COLUMN stripe_connect_onboarded BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN seller_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN seller_rating DECIMAL(2,1); -- 0.0 to 5.0
ALTER TABLE users ADD COLUMN seller_total_sales INTEGER DEFAULT 0;
```

### 1.2 Listing Items for Sale

**Flow:**
1. User completes appraisal → "List for Sale" button appears
2. Or: User goes to existing appraisal → "List for Sale"
3. Seller sets asking price (AI suggests based on appraisal)
4. Seller adds pickup location (city/zip, not exact address)
5. Listing goes live

**Database: `listings` table**
```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appraisal_id UUID REFERENCES appraisals(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Pricing
  asking_price INTEGER NOT NULL, -- cents
  ai_suggested_price INTEGER, -- cents (from appraisal)
  accepts_offers BOOLEAN DEFAULT TRUE,

  -- Location (for local pickup)
  pickup_city TEXT NOT NULL,
  pickup_state TEXT NOT NULL,
  pickup_zip TEXT NOT NULL,
  pickup_lat DECIMAL(10, 8),
  pickup_lng DECIMAL(11, 8),

  -- Status
  status TEXT DEFAULT 'active', -- active, pending, sold, cancelled

  -- Metadata
  views_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sold_at TIMESTAMPTZ,

  UNIQUE(appraisal_id) -- One listing per appraisal
);

CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_location ON listings(pickup_zip, status);
CREATE INDEX idx_listings_seller ON listings(seller_id, status);
```

### 1.3 Browsing & Discovery

**Browse Listings:**
- Grid view with item photos, price, location
- Filter by: category, price range, distance
- Sort by: newest, price low/high, closest
- Save favorites (wishlist)

**Database: `saved_listings` table**
```sql
CREATE TABLE saved_listings (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);
```

### 1.4 Purchasing Flow (Local Pickup)

**Flow:**
1. Buyer clicks "Buy Now" or "Make Offer"
2. Buyer confirms purchase (payment authorized, not captured)
3. Seller receives notification, shares exact pickup address
4. Buyer and seller coordinate via in-app messaging
5. After pickup, buyer confirms receipt
6. Payment captured, seller paid (minus 2.5% fee)

**Database: `transactions` table**
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),

  -- Pricing
  amount INTEGER NOT NULL, -- cents (final price)
  platform_fee INTEGER NOT NULL, -- cents (2.5%)
  seller_payout INTEGER NOT NULL, -- cents (amount - fee)

  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT, -- Transfer to seller's Connect account

  -- Status
  status TEXT DEFAULT 'pending',
  -- pending → payment_authorized → pickup_scheduled → completed → paid_out
  -- OR → cancelled / disputed

  -- Pickup coordination
  pickup_address TEXT, -- Revealed after purchase
  pickup_scheduled_at TIMESTAMPTZ,
  pickup_notes TEXT,

  -- Completion
  buyer_confirmed_at TIMESTAMPTZ,
  seller_confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  payout_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.5 Messaging System

**Simple in-app messaging for transaction coordination:**

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_transaction ON messages(transaction_id, created_at);
```

### 1.6 Reviews & Ratings

**After transaction completes:**

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id),
  reviewer_id UUID REFERENCES users(id), -- buyer
  reviewee_id UUID REFERENCES users(id), -- seller
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(transaction_id, reviewer_id) -- One review per transaction per user
);
```

---

## Part 2: Discovery Map

### 2.1 Event Types

- **Garage Sales** - Single-day or weekend sales
- **Estate Sales** - Multi-day, often professionally run
- **Flea Markets** - Recurring events
- **Auctions** - Live auction events
- **Pop-up Shops** - Temporary retail events

### 2.2 Event Submissions

**Database: `events` table**
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id),

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL, -- garage_sale, estate_sale, flea_market, auction, other

  -- Location
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,

  -- Timing
  start_date DATE NOT NULL,
  end_date DATE, -- NULL for single-day
  start_time TIME,
  end_time TIME,

  -- Details
  categories TEXT[], -- books, furniture, vintage, etc.
  photos TEXT[], -- URLs
  website_url TEXT,

  -- Status
  status TEXT DEFAULT 'active', -- active, cancelled, completed
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT, -- 'weekly', 'monthly', etc.

  -- Engagement
  views_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  attendees_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_location ON events USING GIST (
  ll_to_earth(lat, lng)
); -- For radius searches
CREATE INDEX idx_events_dates ON events(start_date, end_date, status);
CREATE INDEX idx_events_type ON events(event_type, status);
```

### 2.3 Event Interactions

```sql
-- Users saving events they want to attend
CREATE TABLE saved_events (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  notify_before BOOLEAN DEFAULT TRUE, -- Send reminder
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

-- Users marking attendance
CREATE TABLE event_attendees (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going', -- interested, going, went
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);
```

### 2.4 Map Interface

**Features:**
- Interactive map (Mapbox or Google Maps)
- Cluster markers when zoomed out
- Filter by: event type, date range, categories
- "Events this weekend" quick filter
- User's location with radius search
- List view toggle

**Route Planning (Future):**
- Select multiple events
- Generate optimized driving route
- Estimated travel times

---

## Part 3: Technical Implementation

### 3.1 New API Routes

```
# Seller Onboarding
POST   /api/seller/verify-phone      - Send SMS verification code
POST   /api/seller/confirm-phone     - Confirm SMS code
POST   /api/seller/connect-stripe    - Create Stripe Connect onboarding link
GET    /api/seller/connect-status    - Check Stripe Connect status

# Listings
POST   /api/listings                 - Create listing from appraisal
GET    /api/listings                 - Browse listings (with filters)
GET    /api/listings/[id]            - Get listing details
PATCH  /api/listings/[id]            - Update listing
DELETE /api/listings/[id]            - Cancel listing

# Transactions
POST   /api/transactions             - Initiate purchase
POST   /api/transactions/[id]/confirm - Buyer confirms pickup
GET    /api/transactions             - User's transactions (as buyer/seller)
GET    /api/transactions/[id]        - Transaction details

# Messages
GET    /api/transactions/[id]/messages - Get conversation
POST   /api/transactions/[id]/messages - Send message

# Events
POST   /api/events                   - Create event
GET    /api/events                   - Browse events (with location/filters)
GET    /api/events/[id]              - Event details
PATCH  /api/events/[id]              - Update event
DELETE /api/events/[id]              - Cancel event
POST   /api/events/[id]/save         - Save event
POST   /api/events/[id]/attend       - Mark attendance

# Reviews
POST   /api/reviews                  - Leave review after transaction
GET    /api/users/[id]/reviews       - Get user's reviews
```

### 3.2 New Pages

```
/sell                    - Seller onboarding flow
/sell/listings           - Manage your listings
/marketplace             - Browse all listings
/marketplace/[id]        - Listing detail page
/messages                - All conversations
/messages/[transactionId] - Conversation thread

/discover                - Map view of events
/discover/create         - Submit new event
/discover/[id]           - Event detail page
/discover/saved          - Saved events

/profile/[id]            - Public profile with reviews
```

### 3.3 Stripe Connect Setup

**Required:**
1. Enable Stripe Connect in dashboard
2. Set up Connect webhook endpoints
3. Platform fee configuration (2.5%)

**Flow:**
1. User clicks "Become a Seller"
2. We create Stripe Connect account (Express)
3. User completes Stripe's onboarding
4. Webhook confirms account is ready
5. User can now receive payouts

### 3.4 Geolocation Services

**For events map:**
- Geocoding: Address → lat/lng (Mapbox/Google)
- Reverse geocoding: lat/lng → address
- Distance calculations in Postgres with PostGIS or earthdistance

**User location:**
- Browser geolocation API
- Fallback to IP-based location
- Manual zip code entry

---

## Part 4: MVP Scope

### Phase 1: Foundation (Week 1-2)
- [ ] Database migrations for new tables
- [ ] Seller verification flow (phone + Stripe Connect)
- [ ] Basic listing creation from appraisals
- [ ] Listing browse page with filters

### Phase 2: Transactions (Week 3-4)
- [ ] Purchase flow with Stripe
- [ ] In-app messaging
- [ ] Transaction status tracking
- [ ] Pickup confirmation flow

### Phase 3: Events & Map (Week 5-6)
- [ ] Event submission form
- [ ] Map interface with Mapbox
- [ ] Event browsing with filters
- [ ] Save events, attendance tracking

### Phase 4: Polish (Week 7-8)
- [ ] Reviews system
- [ ] Email notifications
- [ ] Push notifications (PWA)
- [ ] Analytics dashboard for sellers

---

## Future Enhancements

- [ ] Aggregate event data from external sources
- [ ] Route optimization for multiple events
- [ ] Shipping option (expand beyond local pickup)
- [ ] Verified seller badges (ID verification)
- [ ] Seller analytics dashboard
- [ ] Promoted listings (paid feature)
- [ ] API for estate sale companies to post events
