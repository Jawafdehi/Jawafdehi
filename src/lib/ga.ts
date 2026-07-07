/**
 * Google Analytics 4 loader — only invoked after the visitor opts in via the
 * cookie consent banner. IP anonymization is enabled. Until this runs,
 * gtag.js is never fetched and no GA cookies are set.
 */
import { JAWAFDEHI_GA_MEASUREMENT_ID } from "@/config/analytics-config";

let loaded = false;

export function loadGoogleAnalytics(): void {
  if (typeof window === "undefined" || loaded || window.gtag) return;
  loaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${JAWAFDEHI_GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  // gtag must push the literal `arguments` object, so a rest array won't work.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  } as Window["gtag"];

  window.gtag("js", new Date());
  window.gtag("config", JAWAFDEHI_GA_MEASUREMENT_ID, { anonymize_ip: true });
}
