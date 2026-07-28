/**
 * Google Analytics 4 loader — only invoked after the visitor opts in via the
 * cookie consent banner. IP anonymization is enabled. Until this runs,
 * gtag.js is never fetched and no GA cookies are set.
 *
 * Admin/casework routes are excluded from analytics (see
 * `isAnalyticsExcludedPath`): gtag.js is not loaded while the visitor is on one
 * of those paths, and if the tag is already live (visitor navigated in from a
 * public page) it is muted via gtag's `ga-disable-<id>` opt-out flag — which
 * suppresses ALL hits for the property, including Enhanced Measurement's
 * history-change page_views, not just the ones this app fires explicitly. The
 * flag is set synchronously inside the history navigation itself (see
 * `installAnalyticsNavigationSuppression`) so it wins the race against Enhanced
 * Measurement's own history listener, even on the first hop into an admin route.
 */
import {
  JAWAFDEHI_GA_MEASUREMENT_ID,
  isAnalyticsExcludedPath,
} from "@/config/analytics-config";
import { telemetryAllowedHere } from "./telemetry";

let loaded = false;

/**
 * gtag's documented per-property opt-out global (`window['ga-disable-G-XXXX']`).
 * When truthy, gtag.js drops every hit for that measurement id before it is
 * sent — the same switch the "opt out" links in privacy policies use.
 */
function setGaDisabled(disabled: boolean): void {
  (window as unknown as Record<string, boolean>)[
    `ga-disable-${JAWAFDEHI_GA_MEASUREMENT_ID}`
  ] = disabled;
}

/**
 * Mute or un-mute analytics for the current route. Safe to call before gtag has
 * loaded (it just sets the global that a later-loading tag will honour) and on
 * every SPA navigation. Call this on route changes so an already-live tag stops
 * reporting the moment the visitor enters an excluded (admin) path and resumes
 * when they leave it.
 */
export function applyAnalyticsPathSuppression(pathname: string): void {
  if (typeof window === "undefined") return;
  setGaDisabled(isAnalyticsExcludedPath(pathname));
}

/** Set the opt-out flag for a history entry's target URL (the 3rd pushState arg). */
function suppressForHistoryUrl(url: string | URL | null | undefined): void {
  if (url == null) {
    // Same-URL state replacement: reconcile against the current location.
    applyAnalyticsPathSuppression(window.location.pathname);
    return;
  }
  try {
    setGaDisabled(
      isAnalyticsExcludedPath(new URL(String(url), window.location.href).pathname),
    );
  } catch {
    // Malformed URL: leave the flag as-is rather than guess.
  }
}

let navigationSuppressionInstalled = false;

/**
 * Close the SPA race against GA4 Enhanced Measurement. GA auto-collects a
 * `page_view` on `history.pushState`/`replaceState`/`popstate`; on a
 * client-side navigation INTO an admin route that fires synchronously, before a
 * React route effect could set the opt-out flag — so a `useEffect` alone can
 * leak the first admin hit.
 *
 * Wrapping the history methods ourselves sets `ga-disable` for the TARGET path
 * as part of the same synchronous navigation call, before the URL commits.
 * Enhanced Measurement wraps these same methods and reads `location` only after
 * the original runs, so the flag is already set when it decides whether to send
 * — regardless of which wrapper loaded first. Idempotent; call once on the
 * client, as early as possible (ideally before gtag.js loads).
 */
export function installAnalyticsNavigationSuppression(): void {
  if (typeof window === "undefined" || navigationSuppressionInstalled) return;
  navigationSuppressionInstalled = true;

  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method];
    window.history[method] = function patchedHistoryMethod(
      this: History,
      ...args: Parameters<History["pushState"]>
    ): void {
      suppressForHistoryUrl(args[2]);
      return original.apply(this, args);
    } as History[typeof method];
  }

  // Back/forward: the URL is already current by the time popstate fires.
  window.addEventListener("popstate", () => {
    applyAnalyticsPathSuppression(window.location.pathname);
  });
}

export function loadGoogleAnalytics(): void {
  if (typeof window === "undefined" || loaded || window.gtag) return;
  // Never load the production GA property from a dev build, localhost, or a
  // Cloudflare `*.workers.dev` preview — otherwise their page views pollute
  // prod analytics.
  if (!telemetryAllowedHere()) return;
  // Don't fetch gtag.js while on an admin/casework route: staff landing
  // directly on /admin (bookmark, or the OIDC /admin/callback fresh load) would
  // otherwise fire an initial page_view for that path. The consent banner
  // re-checks on later navigations, so a public route can still load it.
  if (isAnalyticsExcludedPath(window.location.pathname)) return;
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

  // Set the opt-out flag for the current path before the config page_view fires,
  // so a tag that loads on an excluded path can never emit even its first hit.
  applyAnalyticsPathSuppression(window.location.pathname);
  window.gtag("js", new Date());
  window.gtag("config", JAWAFDEHI_GA_MEASUREMENT_ID, { anonymize_ip: true });
}
