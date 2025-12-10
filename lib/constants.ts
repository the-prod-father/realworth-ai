
export const CONDITIONS = ['Mint', 'Excellent', 'Good', 'Fair', 'Poor'];

// Subscription limits - SINGLE SOURCE OF TRUTH
export const FREE_APPRAISAL_LIMIT = 3;

// Stripe Price IDs
// Legacy prices (for grandfathered users - DO NOT USE FOR NEW SIGNUPS)
export const STRIPE_LEGACY_PRICES = {
  MONTHLY: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || '', // $9.99/mo - grandfathered
  ANNUAL: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL || '',   // Old annual price
};

// Current prices (for new signups)
export const STRIPE_PRICES = {
  MONTHLY: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY_V2 || '', // $19.99/mo
  ANNUAL: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL_V2 || '',   // $149.99/yr
};
