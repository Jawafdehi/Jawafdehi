// Which paths the edge should treat as real, and which are 404s.
//
// The Cloudflare Worker serves index.html for anything ASSETS does not hold, so
// without this check every typo, every dead link and every probe for /wp-login
// answered 200 with the full site shell. Google indexes those as real pages, and
// link checkers report a clean site. The worker answers 404 for anything the SPA
// does not route — the body is still the shell, so React Router renders the
// styled NotFound page and only the status line changes.
//
// Matching is React Router's own matcher over SITE_ROUTES, the same table App.tsx
// renders from. There is no second copy of the route list to keep in step, and no
// hand-written regex re-implementing `:param` / `*` precedence — /entity/42 picks
// /entity/:id over /entity/*, /updates/preview beats /updates/:slug, and
// /case/a/b matches nothing, because that is what the app itself does.
//
// matchRoutes comes from @remix-run/router, react-router's DOM-free and
// React-free core, so importing it here does not pull React into the edge bundle.
import { matchRoutes } from "@remix-run/router";

import { SITE_ROUTES } from "./site-routes";

const MATCHABLE_ROUTES = SITE_ROUTES.map((route) => ({ path: route.path }));

// Paths the Worker answers itself — redirects and edge endpoints — before the
// SPA fallback is reached. Deliberately absent from SITE_ROUTES: React routes
// none of them, so if a dispatch ever stops matching, the path should surface as
// a 404 rather than quietly serve the SPA shell at 200.
// tests/ssr/worker.endpoints.test.ts drives every entry here, and its trailing-
// slash form, through the real worker, so this list cannot drift from the
// dispatch in worker.ts.
export const WORKER_OWNED_PATHS: readonly string[] = [
  "/weekly",
  "/oembed",
  "/document-preview",
  "/api/latest-videos",
];

// A trailing slash is not significant anywhere on this site. Both the Worker's
// endpoint dispatch and the route match normalise through this, so they can
// never disagree about whether /api/latest-videos/ is the same path as
// /api/latest-videos — a disagreement that served the SPA shell at 200 in place
// of the API response.
export function normalizePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

// True when the Worker handles this path itself, before the SPA sees it.
export function isWorkerOwnedPath(pathname: string): boolean {
  return WORKER_OWNED_PATHS.includes(normalizePath(pathname));
}

// Which route a path resolves to, and the params it carries — or null when the
// SPA would render NotFound. Params arrive percent-decoded.
//
// Callers should branch on `path` (the matched *pattern*) rather than re-testing
// the URL. /updates/preview and /updates/:slug are different routes; a regex for
// the latter swallows the former, which is how the Wagtail preview target ended
// up answering 404 — the CMS has no article called "preview".
export function matchRoute(
  pathname: string,
): { path: string; params: Record<string, string | undefined> } | null {
  const path = normalizePath(pathname);
  // matchRoutes reads "" as "/", so "//" — which normalises to "" — would claim
  // to be the homepage. It is not a canonical URL here; leave it unrouted.
  if (path === "") return null;
  const matches = matchRoutes(MATCHABLE_ROUTES, path);
  if (!matches || matches.length === 0) return null;
  const leaf = matches[matches.length - 1];
  return { path: leaf.route.path ?? "", params: leaf.params };
}

// True when the SPA has a route for this path.
export function isKnownRoute(pathname: string): boolean {
  return matchRoute(pathname) !== null;
}
