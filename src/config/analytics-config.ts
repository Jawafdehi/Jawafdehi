export const JAWAFDEHI_GA_MEASUREMENT_ID = "G-ZDV84KYJDJ";

/**
 * Route prefixes whose page views must NEVER reach Google Analytics: the
 * auth-gated admin panel (`/admin/*`, which also holds the OIDC `/admin/login`
 * and `/admin/callback` flows) plus the two legacy paths that redirect into it
 * (`/portal/*` → `/admin/*`, and `/moderation` → `/admin/moderation`). This is
 * staff casework traffic; counting it would pollute the public-usage picture the
 * GA property exists to measure.
 *
 * GA4 has no server-side path-exclusion data filter (only Internal-Traffic-by-IP
 * and Developer-Traffic filters), so the exclusion is enforced client-side — see
 * `applyAnalyticsPathSuppression` and `loadGoogleAnalytics` in `@/lib/ga`.
 */
const ANALYTICS_EXCLUDED_PREFIXES = ["/admin", "/portal", "/moderation"];

/**
 * Whether analytics must be suppressed for `pathname`. Matches a prefix exactly
 * (`/moderation`) or on a path-segment boundary (`/admin/...`), so unrelated
 * paths like `/administration` are NOT caught.
 */
export function isAnalyticsExcludedPath(pathname: string): boolean {
  return ANALYTICS_EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
