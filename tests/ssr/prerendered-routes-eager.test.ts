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
});
