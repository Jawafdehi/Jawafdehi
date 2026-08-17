// SPDX-License-Identifier: Hippocratic-3.0
import { useEffect, useState, type FunctionComponent, type ReactNode } from "react";

/**
 * Put a recharts-backed chart in its own async chunk.
 *
 * WHY, with the measurement: `recharts` and the deps only it pulls in
 * (`lodash`, `decimal.js-light`, `react-smooth`) were the largest removable thing
 * in the initial JS payload, shipped to every visitor of every route. Deferring them
 * cut it from **745.7 KB gzip to 635.5 KB — 110 KB, 14.8%**. They were
 * there because `/research/corruption-accountability` is pre-rendered, so
 * `ResearchCorruption.tsx` must be imported eagerly (see the split policy in
 * src/routes.tsx), and it imported the charts directly. `/data-quality` is already
 * `lazy()`, so recharts had exactly one eager entry point.
 *
 * A `manualChunks` entry does NOT fix this and it is the obvious wrong turn: it
 * moves recharts to its own file, which makes the *entry chunk* smaller while the
 * browser still fetches it on the same paint, because a static import is a static
 * import. Only a dynamic import defers bytes. Measure the sum of the entry chunk
 * and every chunk `index.html` preloads — `scripts/bundle-budget.mjs` does.
 *
 * WHY THIS IS FREE: every one of these charts already rendered nothing but a
 * correctly-sized placeholder until a mount effect fired — see `useMounted`, which
 * exists because `ResponsiveContainer` measures the DOM and has no stable SSR
 * result. So no chart markup was ever in the pre-rendered HTML. Pass that
 * component's own placeholder as `placeholder` and the pre-rendered bytes do not
 * change at all: measured, all 22 pre-rendered pages byte-identical.
 *
 * 🛑 WHY THERE IS NO `<Suspense>` HERE, AND WHY YOU MUST NOT ADD ONE.
 *
 * `React.lazy` + `<Suspense>` is the idiomatic shape and it is wrong on a
 * pre-rendered route. React 18's `renderToString` does not support Suspense. It
 * emits the fallback — which is why this survives a glance — wrapped in a
 * FAILED-boundary marker (`<!--$!-->`, not `<!--$-->`) preceded by a
 * `<template data-msg="The server did not finish this Suspense boundary…"
 * data-stck="…">` whose stack contains ABSOLUTE LOCAL FILESYSTEM PATHS from the
 * build machine. So the page LOOKS right while shipping build paths inside a public
 * static file and telling React at hydration to discard the server markup for that
 * subtree and re-render it.
 *
 * Measured, not theorised: the first version of this file did exactly that and added
 * 177 lines and 14 stack traces to /research/corruption-accountability, while
 * `scripts/pre-render.ts` reported the route with a ✓ — a failed boundary is not a
 * thrown error, so nothing in the build said a word. Only diffing the pre-rendered
 * HTML against `main` caught it.
 *
 * Loading in an effect instead makes that unreachable BY CONSTRUCTION rather than by
 * remembering to gate a boundary: there is no boundary to fail, the server renders
 * `placeholder(props)` and stops, and the client's first pass renders the same thing
 * so hydration matches. It also fails better — if the chunk never arrives the
 * placeholder simply stays, whereas a rejected `lazy()` throws to the nearest error
 * boundary and takes the whole page with it. `tests/ssr/lazy-chart.test.tsx` pins
 * this, including a positive control that fails loudly if a React upgrade ever makes
 * `renderToString` handle Suspense.
 *
 * THE PLACEHOLDER CONTRACT: `placeholder` must render what the chart itself renders
 * pre-mount. Pass something else and you change the pre-rendered HTML and the
 * hydrated layout, and it presents as a content-layout shift rather than an error.
 */
export function lazyChart<P extends object>(
  load: () => Promise<FunctionComponent<P>>,
  placeholder: (props: P) => ReactNode,
): FunctionComponent<P> {
  // Per-chart module cache, shared by every instance: /research renders two
  // RateTrends, and the second must not refetch or flash its placeholder again.
  let loaded: FunctionComponent<P> | null = null;
  let inFlight: Promise<void> | null = null;

  return function LazyChart(props: P) {
    // 🛑 Both wrappers below are required, and dropping either throws at runtime.
    // A component IS a function, and React overloads functions in both positions:
    // `useState(fn)` treats `fn` as a LAZY INITIALISER and calls it with no
    // arguments, and `setState(fn)` treats it as an UPDATER and calls it with the
    // previous state. Either way React invokes the chart as a plain function —
    // measured: `TypeError: Cannot destructure property 'height' of 'object null'`,
    // i.e. the chart rendered with `props === null`. Store it as `() => Component`.
    const [Chart, setChart] = useState<FunctionComponent<P> | null>(() => loaded);

    useEffect(() => {
      if (loaded) {
        setChart(() => loaded);
        return;
      }
      let alive = true;
      inFlight ??= load().then((C) => {
        loaded = C;
      });
      inFlight
        .then(() => {
          if (alive && loaded) setChart(() => loaded);
        })
        .catch(() => {
          // Chunk failed to load (offline, deploy mid-session). Keep the
          // placeholder: a missing chart beats an error boundary eating the page.
          // Reset so a later instance retries rather than inheriting the failure.
          inFlight = null;
        });
      return () => {
        alive = false;
      };
    }, []);

    if (!Chart) return <>{placeholder(props)}</>;
    return <Chart {...props} />;
  };
}
