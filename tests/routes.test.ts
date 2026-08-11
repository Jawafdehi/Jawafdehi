import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

import { isKnownRoute } from "../src/data/route-patterns";

// vitest runs from the project root; import.meta.url is not a file URL here.
const APP_TSX = resolve(process.cwd(), "src/App.tsx");

// Every <Route path="…"> declared in App.tsx, in source order.
function declaredRoutePaths(): string[] {
  const source = readFileSync(APP_TSX, "utf8");
  return [...source.matchAll(/<Route\s[^>]*path="([^"]+)"/g)].map((m) => m[1]);
}

// Turn a React Router pattern into one concrete path the edge could receive.
function sampleFor(pattern: string): string {
  return pattern
    .replace(/:[A-Za-z0-9_]+/g, "sample-value")
    .replace(/\/\*$/, "/sample-tail")
    .replace(/^\*$/, "/no-such-page");
}

describe("route-patterns mirrors App.tsx", () => {
  it("finds the route table", () => {
    expect(declaredRoutePaths().length).toBeGreaterThan(30);
  });

  it("recognises every declared route except the catch-all", () => {
    const missed = declaredRoutePaths()
      .filter((pattern) => pattern !== "*")
      .map((pattern) => ({ pattern, sample: sampleFor(pattern) }))
      .filter(({ sample }) => !isKnownRoute(sample));

    // A route added to App.tsx but not to KNOWN_ROUTE_PATTERNS would start
    // returning 404 at the edge while rendering fine in dev.
    expect(missed).toEqual([]);
  });

  it("still rejects the catch-all sample", () => {
    expect(isKnownRoute("/no-such-page")).toBe(false);
  });
});

describe("isKnownRoute", () => {
  it.each([
    "/",
    "/cases",
    "/case/some-slug",
    "/report",
    "/report/",
    "/updates/preview",
    "/updates/an-article",
    "/entity/42",
    "/entity/organization/np/gov/tu",
    "/material/ngm/some-doc",
    "/admin",
    "/admin/reviews/case/x",
    "/embed/case/12",
    "/newsletter/unsubscribe/tok3n",
  ])("accepts %s", (path) => {
    expect(isKnownRoute(path)).toBe(true);
  });

  it.each([
    "/wp-login.php",
    "/reports",
    "/case",
    "/case/a/b",
    "/donate/refund",
    "/faq/extra",
    "/research",
    "/research/something-else",
    "/.env",
    "/admin-panel",
  ])("rejects %s", (path) => {
    expect(isKnownRoute(path)).toBe(false);
  });
});
