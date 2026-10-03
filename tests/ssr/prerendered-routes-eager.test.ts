import type { ReactElement } from 'react';

import { describe, it, expect } from 'vitest';

import { ROUTE_ELEMENTS } from '../../src/routes';
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
//
// It reads the elements App.tsx actually renders rather than regex-parsing its
// JSX, so it asks whether a component IS lazy instead of whether the source
// happens to look that way. React.lazy tags its result with this symbol.
const REACT_LAZY = Symbol.for('react.lazy');

function isLazyElement(element: ReactElement): boolean {
  const type = element.type as { $$typeof?: symbol } | string;
  return typeof type === 'object' && type !== null && type.$$typeof === REACT_LAZY;
}

describe('pre-rendered routes must be eagerly imported', () => {
  it('has enough routes, lazy and eager, for this test to mean anything', () => {
    // Guards against the assertions below passing vacuously — if nothing were
    // lazy, or the map were empty, every case would trivially succeed.
    const elements = Object.values(ROUTE_ELEMENTS);
    expect(elements.length).toBeGreaterThan(20);
    expect(elements.filter(isLazyElement).length).toBeGreaterThan(5);
  });

  it.each(PRE_RENDERED_STATIC_ROUTES.map((route) => route.path))(
    '%s renders an eager component',
    (path) => {
      const element = ROUTE_ELEMENTS[path as keyof typeof ROUTE_ELEMENTS];

      // A pre-rendered path with no element is its own bug: the pre-renderer
      // would emit the SPA's NotFound page at that URL. This cannot happen while
      // ROUTE_ELEMENTS is a total Record over the route table, but the assertion
      // costs nothing and states the requirement.
      expect(element, `no element for ${path} in ROUTE_ELEMENTS`).toBeDefined();
      expect(
        isLazyElement(element),
        `${path} renders a lazy() component. Pre-rendered routes must be eager ` +
          `or the route pre-renders blank — see the split policy comment in ` +
          `src/App.tsx.`,
      ).toBe(false);
    },
  );

  // The static list above is not the whole of what gets pre-rendered, and the
  // gap is not theoretical: scripts/pre-render.ts also walks routes whose paths
  // come from the API at build time, so they can never appear in
  // PRE_RENDERED_STATIC_ROUTES. /entity/* was made pre-rendered while still
  // lazy() and shipped 1,544 empty-titled Suspense stubs past a green run of
  // this very file, because this file only knew about the static half.
  //
  // Keep in step with the route blocks in scripts/pre-render.ts main(): a route
  // belongs here once that script writes an index.html for it. /case/* is
  // deliberately absent — cases are listed in the sitemap but not pre-rendered.
  const DYNAMIC_PRE_RENDERED_ROUTES = ['/entity/*', '/updates/:slug'] as const;

  it.each(DYNAMIC_PRE_RENDERED_ROUTES)(
    '%s (pre-rendered from API-derived paths) renders an eager component',
    (path) => {
      const element = ROUTE_ELEMENTS[path as keyof typeof ROUTE_ELEMENTS];

      expect(
        element,
        `no element for ${path} in ROUTE_ELEMENTS — either the route key changed ` +
          `or this list has drifted from scripts/pre-render.ts.`,
      ).toBeDefined();
      expect(
        isLazyElement(element),
        `${path} renders a lazy() component but scripts/pre-render.ts writes ` +
          `HTML for it, so every one of those pages ships as the Suspense ` +
          `fallback: empty <title>, no og: tags, no content. Make the page an ` +
          `eager import in src/routes.tsx.`,
      ).toBe(false);
    },
  );
});
