// SPDX-License-Identifier: Hippocratic-3.0
import { lazy, Suspense } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { render, cleanup, waitFor } from "@testing-library/react";

import { lazyChart } from "@/components/charts/lazy";

// `lazyChart` defers recharts (-110 KB gzip, -14.8%) off the initial payload. Every page it
// is used on is PRE-RENDERED, and this file exists because the idiomatic
// implementation silently corrupts those pages.
//
// React 18's `renderToString` does not support Suspense. It DOES emit the
// boundary's `fallback` — that part is fine, and is easy to check and be reassured
// by — but it wraps it in a FAILED-boundary marker (`<!--$!-->`, not `<!--$-->`)
// preceded by a `<template data-msg="The server did not finish this Suspense
// boundary…" data-stck="…">` whose stack contains ABSOLUTE PATHS FROM THE BUILD
// MACHINE.
//
// So the page looks right and is still wrong two ways: build-machine paths ship
// inside a public static file, and the marker tells React at hydration that the
// boundary failed on the server, so it discards that markup and re-renders. Measured
// on /research/corruption-accountability: 177 extra lines, 14 stack traces — and
// `scripts/pre-render.ts` reported the route with a ✓, because a failed boundary is
// not a thrown error. Only diffing the pre-rendered HTML against `main` caught it.
//
// `lazyChart` therefore loads in an effect and uses NO Suspense at all, which makes
// the failure unreachable by construction. The first three tests pin the server
// half, `after mount` pins that it still actually loads (without which the server
// assertions would pass on a component that never renders a chart at all), and the
// last is a positive control: it demonstrates the React behaviour still exists, so a
// future upgrade that fixes `renderToString` makes this file fail loudly rather than
// leaving the assertions above passing for a reason that no longer holds.

afterEach(cleanup);

function Placeholder({ h }: { h: number }) {
  return <div className="w-full" style={{ height: h }} data-testid="ph" />;
}

function RealChart({ height }: { height: number }) {
  return <div data-testid="chart">chart at {height}</div>;
}

describe("lazyChart on the server", () => {
  const Chart = lazyChart<{ height: number }>(
    () => new Promise(() => {}),
    (p) => <Placeholder h={p.height} />,
  );

  it("renders the placeholder, not a failed Suspense boundary", () => {
    const html = renderToString(<Chart height={260} />);

    expect(html).toContain("height:260px");
    expect(html, "a failed-boundary marker reached the pre-rendered HTML").not.toContain("<!--$!-->");
    expect(html, "React's Suspense error template reached the pre-rendered HTML").not.toContain(
      "data-msg=",
    );
  });

  it("never leaks a filesystem path into the markup", () => {
    const html = renderToString(<Chart height={300} />);

    expect(html, "the embedded stack is what leaks build-machine paths").not.toContain("data-stck=");
    expect(html).not.toContain("/node_modules/");
  });

  it("passes props through to the placeholder", () => {
    expect(renderToString(<Chart height={123} />)).toContain("height:123px");
  });
});

describe("lazyChart on the client", () => {
  it("shows the placeholder first, then swaps in the chart after mount", async () => {
    const Chart = lazyChart<{ height: number }>(
      () => Promise.resolve(RealChart),
      (p) => <Placeholder h={p.height} />,
    );

    const { queryByTestId, findByTestId } = render(<Chart height={260} />);

    // First paint must match what the server emitted, or hydration mismatches.
    expect(queryByTestId("ph"), "the first client render was not the placeholder").not.toBeNull();
    expect(queryByTestId("chart")).toBeNull();

    // …and then it must actually arrive. Without this the server assertions above
    // would be satisfied by a component that renders a placeholder forever.
    expect((await findByTestId("chart")).textContent).toBe("chart at 260");
    expect(queryByTestId("ph")).toBeNull();
  });

  it("keeps the placeholder when the chunk fails, instead of throwing", async () => {
    const Chart = lazyChart<{ height: number }>(
      () => Promise.reject(new Error("chunk 404")),
      () => <Placeholder h={200} />,
    );

    const { queryByTestId } = render(<Chart height={200} />);

    // A rejected React.lazy throws to the nearest error boundary and takes the page
    // with it. A missing chart is the better failure on a reading-heavy site.
    await waitFor(() => expect(queryByTestId("ph")).not.toBeNull());
    expect(queryByTestId("chart")).toBeNull();
  });
});

describe("why there is no Suspense in lazyChart", () => {
  const Never = lazy(
    () =>
      new Promise<{ default: () => JSX.Element }>(() => {
        /* never resolves: stands in for a chunk that has not arrived */
      }),
  );

  // POSITIVE CONTROL. This is the shape `lazyChart` deliberately does NOT use.
  // If it stops emitting a failed boundary, `renderToString` has gained Suspense
  // support — read that failure as "React changed", not "the test is broken".
  it("a bare Suspense + lazy emits a failed boundary and an absolute-path stack", () => {
    const html = renderToString(
      <Suspense fallback={<Placeholder h={260} />}>
        <Never />
      </Suspense>,
    );

    expect(
      html,
      "renderToString no longer marks the boundary failed — the trap this file documents is gone",
    ).toContain("<!--$!-->");
    expect(html, "no error template: React stopped embedding the stack").toContain("data-msg=");
    expect(html, "the embedded stack is what leaks build-machine paths").toContain("data-stck=");

    // The placeholder IS present here. That is precisely why this was easy to miss:
    // eyeballing the page, or grepping for the placeholder, both look correct. The
    // marker and the template are the damage, not a blank chart.
    expect(html).toContain("height:260px");
  });
});
