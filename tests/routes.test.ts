import { describe, it, expect } from "vitest";

import { isKnownRoute } from "../src/data/route-patterns";
import { PRE_RENDERED_STATIC_ROUTES, SITE_ROUTES } from "../src/data/site-routes";

// SITE_ROUTES is the one route table; App.tsx renders from it and the Worker
// matches against it. Drift between the table and the app is now a type error —
// ROUTE_ELEMENTS in App.tsx is a total Record over RoutePath, so a path with no
// element (or an element with no path) fails to compile. This file covers what
// types cannot: that the table matches the paths we expect it to, and that the
// derived views still select the right rows.

describe("the route table", () => {
  it("has no duplicate paths", () => {
    const paths = SITE_ROUTES.map((route) => route.path);
    expect(paths).toEqual([...new Set(paths)]);
  });

  it("excludes the catch-all", () => {
    // "*" matches every path, so a row for it would report every URL as real and
    // undo the edge 404s entirely. It lives in App.tsx only.
    expect(SITE_ROUTES.map((route) => route.path)).not.toContain("*");
  });

  it("derives the pre-rendered subset from rows carrying page metadata", () => {
    expect(PRE_RENDERED_STATIC_ROUTES.map((route) => route.path)).toEqual([
      "/",
      "/cases",
      "/search",
      "/faq",
      "/research/corruption-accountability",
      "/our-process",
      "/commitment",
      "/volunteer",
      "/donate",
      "/donate/success",
      "/donate/cancel",
      "/about",
      "/team",
      "/products",
      "/saptahik",
      "/updates",
      "/feedback",
      "/report",
      "/privacy",
      "/terms",
    ]);
  });

  it("gives every pre-rendered route the metadata the sitemap and search index read", () => {
    for (const route of PRE_RENDERED_STATIC_ROUTES) {
      expect({ path: route.path, hasTitle: !!route.sitemapTitle, hasIcon: !!route.icon }).toEqual({
        path: route.path,
        hasTitle: true,
        hasIcon: true,
      });
    }
  });
});

describe("isKnownRoute", () => {
  it.each([
    "/",
    "/cases",
    "/case/some-slug",
    "/cases/",
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
    // Normalises to "", which the matcher would otherwise read as "/".
    "//",
  ])("rejects %s", (path) => {
    expect(isKnownRoute(path)).toBe(false);
  });

  // These are the cases a hand-written regex list kept getting wrong, and the
  // reason matching now goes through React Router's own matcher: it applies the
  // app's real ranking rules rather than an approximation of them.
  it("prefers the more specific route the same way the app does", () => {
    expect({
      numericEntity: isKnownRoute("/entity/42"),
      iriEntity: isKnownRoute("/entity/organization/np/gov/tu"),
      preview: isKnownRoute("/updates/preview"),
      slug: isKnownRoute("/updates/some-post"),
      overDeep: isKnownRoute("/case/a/b"),
    }).toEqual({
      numericEntity: true,
      iriEntity: true,
      preview: true,
      slug: true,
      overDeep: false,
    });
  });
});
