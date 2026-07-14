/**
 * Google Analytics 4 tracking utility
 * 
 * Provides type-safe event tracking for GA4.
 * Events are only sent in production when gtag is available.
 */

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'js',
      targetOrEvent: string | Date,
      params?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

// Event type definitions for type-safety
export type AnalyticsEvent =
  | { name: 'case_view'; params: { case_id: string; slug: string } }
  | { name: 'entity_view'; params: { entity_type: string; entity_id: string; slug: string } }
  | { name: 'language_switch'; params: { from_lang: string; to_lang: string } }
  // Archive site search. `view_search_results` is GA4's canonical site-search
  // event, so `search_term` populates the built-in Search terms reporting
  // directly — the SPA fires it manually because enhanced measurement cannot
  // observe client-side (History API) navigations. `result_type`/`results_count`
  // are extra params (register as custom dimensions/metrics to surface in reports).
  | { name: 'view_search_results'; params: { search_term: string; result_type?: string; results_count?: number } }
  | { name: 'allegation_submitted'; params?: Record<string, never> };

type AnalyticsEventParams<T extends AnalyticsEvent['name']> =
  Extract<AnalyticsEvent, { name: T }>['params'];

/**
 * Track a custom event in Google Analytics
 * 
 * @param eventName - The name of the event to track
 * @param params - Optional parameters to include with the event
 * 
 * @example
 * // Track a case view
 * trackEvent('case_view', { case_id: '123', slug: '/case/123' });
 * 
 * @example
 * // Track language switch
 * trackEvent('language_switch', { from_lang: 'en', to_lang: 'ne' });
 */
export function trackEvent<T extends AnalyticsEvent['name']>(
  eventName: T,
  ...[params]: undefined extends AnalyticsEventParams<T>
    ? [params?: AnalyticsEventParams<T>]
    : [params: AnalyticsEventParams<T>]
): void {
  // SSR-safe: check for window
  if (typeof window === 'undefined') {
    return;
  }

  // Only track if gtag is available (production with GA loaded)
  if (!window.gtag) {
    if (import.meta.env.DEV) {
      console.debug(`[Analytics] Event skipped (gtag not loaded): ${eventName}`, params);
    }
    return;
  }

  // Send the event to GA4
  window.gtag('event', eventName, params);

  if (import.meta.env.DEV) {
    console.debug(`[Analytics] Event sent: ${eventName}`, params);
  }
}
