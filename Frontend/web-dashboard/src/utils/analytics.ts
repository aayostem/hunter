// src/utils/analytics.ts

// Using 'unknown' instead of 'any' to satisfy the "Unexpected any" rule
type EventProperties = Record<string, string | number | boolean | undefined | unknown>;

/**
 * We adjust the global declaration to match the existing type 
 * or stay flexible enough to avoid the "Subsequent property" error.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Track an event
 * In Vite, we use import.meta.env.DEV and PROD
 */
export const trackEvent = (eventName: string, properties?: EventProperties): void => {
  // In development, log to console
  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${eventName}:`, properties || {});
  }

  // In production, send to analytics service
  if (import.meta.env.PROD) {
    // Example with Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, properties || {});
    }
  }
};

/**
 * Track page view
 */
export const trackPageView = (page: string, title?: string): void => {
  trackEvent('page_view', { page, title: title || '' });
};

/**
 * Track user identification
 */
export const trackUser = (userId: string, traits?: Record<string, unknown>): void => {
  trackEvent('identify_user', { userId, ...(traits || {}) });
};

/**
 * Track error
 */
export const trackError = (error: Error, context?: string): void => {
  trackEvent('error', {
    message: error.message || 'Unknown error',
    stack: error.stack || '',
    context: context || '',
  });
};