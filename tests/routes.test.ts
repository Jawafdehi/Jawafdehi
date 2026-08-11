import { describe, it, expect } from "vitest";

import { isKnownRoute, matchRoute } from "../src/data/route-patterns";
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
      "/materials",
      "/courtcases",
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
  //
  // Asserting the *selected pattern*, not just that something matched. A path
  // resolving to the wrong route still "exists" — /updates/preview matching
  // /updates/:slug is what sent the Wagtail preview target to the CMS as an
  // article slug and 404'd it.
  it("selects the same route the app would", () => {
    const selected = (path: string) => matchRoute(path)?.path ?? null;

    expect({
      numericEntity: selected("/entity/42"),
      iriEntity: selected("/entity/organization/np/gov/tu"),
      preview: selected("/updates/preview"),
      slug: selected("/updates/some-post"),
      caseSlug: selected("/case/some-slug"),
      overDeep: selected("/case/a/b"),
      junk: selected("/wp-login.php"),
    }).toEqual({
      numericEntity: "/entity/:id",
      iriEntity: "/entity/*",
      preview: "/updates/preview",
      slug: "/updates/:slug",
      caseSlug: "/case/:id",
      overDeep: null,
      junk: null,
    });
  });

  it("exposes the decoded params the Worker passes to the API", () => {
    // The Worker hands these straight to the cases/CMS lookups, so a double
    // decode or a missed one would query for the wrong record.
    expect(matchRoute("/case/%E0%A4%9C%E0%A4%A8")?.params.id).toBe("जन");
    expect(matchRoute("/case/100%25-pure")?.params.id).toBe("100%-pure");
    expect(matchRoute("/updates/some-post")?.params.slug).toBe("some-post");
  });
});
