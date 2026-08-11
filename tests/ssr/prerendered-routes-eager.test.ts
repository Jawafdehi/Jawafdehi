import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

import { PRE_RENDERED_STATIC_ROUTES } from '../../src/data/site-routes';

// App.tsx documents a hard rule: a route that gets pre-rendered MUST be an eager
// import, because React 18's renderToString does not await React.lazy/Suspense.
// Break it and the build still succeeds — the page just pre-renders as the
// Suspense fallback, shipping an empty <title> and no og: tags for that route.
//
// That is not hypothetical. /donate, /donate/success and /donate/cancel were
// lazy() while sitting in PRE_RENDERED_STATIC_ROUTES, and all three shipped
// blank to production. The rule was a comment that nothing checked, so nothing
// caught it. This test checks it.

// vitest runs with the project root as cwd (see vitest.config.ts).
const APP_TSX = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

/** Component names bound via `const X = lazy(() => import(...))`. */
function lazyComponentNames(source: string): Set<string> {
  return new Set(
    [...source.matchAll(/const\s+(\w+)\s*=\s*lazy\(/g)].map((m) => m[1]),
  );
}

/** path -> component name, from `<Route path="..." element={<X ... />} />`. */
function routeElements(source: string): Map<string, string> {
  const found = new Map<string, string>();
  const pattern = /<Route\s+path="([^"]+)"\s+element=\{<(\w+)/g;
  for (const match of source.matchAll(pattern)) {
    found.set(match[1], match[2]);
  }
  return found;
}

describe('pre-rendered routes must be eagerly imported', () => {
  const lazyNames = lazyComponentNames(APP_TSX);
  const routes = routeElements(APP_TSX);

  it('parses App.tsx well enough for this test to mean anything', () => {
    // Guards against the regexes silently matching nothing after a refactor,
    // which would make every assertion below vacuously pass.
    expect(routes.size).toBeGreaterThan(20);
    expect(lazyNames.size).toBeGreaterThan(5);
  });

  it.each(PRE_RENDERED_STATIC_ROUTES.map((route) => route.path))(
    '%s renders an eager component',
    (path) => {
      const component = routes.get(path);

      // A pre-rendered path with no matching <Route> is its own bug: the
      // pre-renderer would emit the SPA's NotFound page at that URL.
      expect(component, `no <Route path="${path}"> found in App.tsx`).toBeDefined();
      expect(
        lazyNames.has(component as string),
        `${path} renders <${component} />, which is lazy(). Pre-rendered routes ` +
          `must be eager or the route pre-renders blank — see the split policy ` +
          `comment in src/App.tsx.`,
      ).toBe(false);
    },
  );
});
