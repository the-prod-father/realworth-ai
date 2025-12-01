// Google Analytics 4 utility functions

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

// Track page views (automatic with GA4, but can be called manually for SPA navigation)
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!, {
      page_path: url,
    });
  }
};

// Track custom events
export const event = (action: string, params?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, params);
  }
};

// Predefined events for key conversions
export const trackAppraisal = (itemName: string, estimatedValue: number) => {
  event('appraisal_completed', {
    item_name: itemName,
    estimated_value: estimatedValue,
    currency: 'USD',
  });
};

export const trackSignUp = (method: string) => {
  event('sign_up', {
    method,
  });
};

export const trackLogin = (method: string) => {
  event('login', {
    method,
  });
};

export const trackUpgradeClick = (location: string) => {
  event('upgrade_click', {
    location,
    event_category: 'conversion',
  });
};

export const trackCheckoutStart = () => {
  event('begin_checkout', {
    event_category: 'conversion',
  });
};

export const trackPurchase = (transactionId: string, value: number) => {
  event('purchase', {
    transaction_id: transactionId,
    value,
    currency: 'USD',
    event_category: 'conversion',
  });
};

export const trackShare = (itemId: string, method: string) => {
  event('share', {
    item_id: itemId,
    method,
  });
};

export const trackCollectionCreate = () => {
  event('collection_created', {
    event_category: 'engagement',
  });
};

export const trackChatMessage = () => {
  event('chat_message_sent', {
    event_category: 'engagement',
  });
};
