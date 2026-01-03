# Mobile App Development Setup Guide

## Phase 1: Apple Developer Account Setup & Verification

### 1.1 Verify Apple Developer Account Status
**Manual Steps Required:**
1. Log into [developer.apple.com](https://developer.apple.com)
2. Verify:
   - Account is active (paid $99/year)
   - Team ID is accessible (note this for later)
   - Certificates & Profiles section is accessible
   - App Store Connect access is enabled

**Deliverable**: Confirmed active account with Team ID noted

### 1.2 Set Up App Store Connect
**Manual Steps Required:**
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - Platform: iOS
   - Name: "RealWorth" (or "RealWorth.ai" if available)
   - Primary Language: English
   - Bundle ID: `ai.realworth.app` (or similar, must be unique - create in Certificates, Identifiers & Profiles if needed)
   - SKU: `realworth-ios-001`
   - User Access: Full Access

**Deliverable**: App created in App Store Connect with Bundle ID

### 1.3 Configure App Information
**Manual Steps Required:**
1. In App Store Connect, complete:
   - App description (4000 char max)
   - Keywords (100 char max)
   - Support URL: `https://realworth.ai`
   - Marketing URL (optional): `https://realworth.ai`
   - Privacy Policy URL: `https://realworth.ai/privacy`
   - Category: Utilities or Finance
   - Age rating questionnaire (complete honestly)

**Deliverable**: All metadata fields completed

**Note**: These steps must be completed manually before proceeding with iOS build configuration.
