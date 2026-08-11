// Every path the SPA is willing to render, as edge-checkable patterns.
//
// The Cloudflare Worker serves index.html for anything ASSETS does not hold, so
// without this list every typo, every dead link and every probe for /wp-login
// answered 200 with the full site shell. Google indexes those as real pages.
// The worker matches against this list and answers 404 for the rest — the body
// is still the SPA shell, so React Router renders the styled NotFound page.
//
// MUST mirror the <Route path> set in src/App.tsx. tests/routes.test.ts parses
// App.tsx and fails if the two drift apart, so a new route cannot silently
// start 404-ing at the edge.

// A single URL segment. Deliberately excludes "/" so /case/:id cannot swallow
// /case/a/b, which App.tsx would send to NotFound.
const SEG = "[^/]+";

export const KNOWN_ROUTE_PATTERNS: readonly RegExp[] = [
  // Standalone (outside AppLayout).
  new RegExp(`^/embed/case/${SEG}$`),
  /^\/document-viewer$/,
  /^\/admin(\/.*)?$/,
  /^\/portal(\/.*)?$/,

  // Public shell.
  /^\/$/,
  /^\/cases$/,
  new RegExp(`^/case/${SEG}$`),
  /^\/entities$/,
  /^\/search$/,
  /^\/materials$/,
  /^\/courtcases$/,
  // /entity/:id and the hierarchical /entity/<type>/<...> IRI tail.
  new RegExp(`^/entity/${SEG}(/.*)?$`),
  new RegExp(`^/material/${SEG}(/.*)?$`),
  new RegExp(`^/courtcase/${SEG}(/.*)?$`),
  /^\/moderation$/,
  /^\/feedback$/,
  /^\/report$/,
  /^\/updates$/,
  /^\/updates\/preview$/,
  new RegExp(`^/updates/${SEG}$`),
  /^\/information$/,
  /^\/faq$/,
  /^\/about$/,
  /^\/commitment$/,
  /^\/data-quality$/,
  /^\/research\/corruption-accountability$/,
  /^\/our-process$/,
  /^\/team$/,
  /^\/volunteer$/,
  /^\/donate$/,
  /^\/donate\/cancel$/,
  /^\/donate\/success$/,
  /^\/products$/,
  /^\/saptahik$/,
  /^\/privacy$/,
  /^\/terms$/,
  /^\/newsletter\/confirmed$/,
  new RegExp(`^/newsletter/unsubscribe/${SEG}$`),

  // Worker-owned paths that never reach React: redirects and edge endpoints.
  /^\/weekly$/,
  /^\/oembed$/,
  /^\/document-preview$/,
  /^\/api\/latest-videos$/,
];

// True when the SPA has a route for this path. The caller passes a URL
// pathname; a trailing slash is not significant anywhere on this site.
export function isKnownRoute(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return KNOWN_ROUTE_PATTERNS.some((pattern) => pattern.test(path));
}
