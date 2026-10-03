import { describe, expect, it } from "vitest";

import { SITE_ROUTES } from "./site-routes";
import { casesPagePath, parseCasesPageParam } from "@/lib/cases-pagination";

/**
 * The browse pages have to be REACHABLE, which is a separate fact from existing.
 *
 * `<Routes>` is built from SITE_ROUTES, not from ROUTE_ELEMENTS — App.tsx maps
 * over the former and looks the element up in the latter. A path present only in
 * ROUTE_ELEMENTS therefore falls through to the `*` catch-all and renders
 * NotFound, and nothing complains: lint passes, the build passes, and
 * pre-render happily writes 38 files whose body is the 404 page.
 *
 * That is not hypothetical — it is what this route did on the first build, and
 * the symptom was silent. Every page rendered, every file was written, and the
 * only evidence was that `<title>` said "Page Not Found".
 */
describe("the case browse pages are registered as routes", () => {
  const routePath = "/cases/page/:page";

  it("is in SITE_ROUTES, which is what App.tsx actually renders", () => {
    expect(SITE_ROUTES.map((route) => route.path)).toContain(routePath);
  });

  it("renders inside the site chrome, like /cases", () => {
    const cases = SITE_ROUTES.find((route) => route.path === "/cases");
    const paged = SITE_ROUTES.find((route) => route.path === routePath);
    expect(paged?.chrome).toBe(cases?.chrome);
  });

  it("carries no StaticPageMeta, so it stays out of the constant sitemap list", () => {
    // The number of pages depends on how many cases exist, so these URLs are
    // generated from the live count by scripts/sitemap.ts instead.
    const paged = SITE_ROUTES.find((route) => route.path === routePath);
    expect(paged?.sitemapTitle).toBeUndefined();
    expect(paged?.titleKey).toBeUndefined();
  });

  it("matches the URLs casesPagePath builds", () => {
    // The route pattern and the path builder are edited in different files; this
    // is the only place that checks they still describe the same URL.
    const built = casesPagePath(7);
    expect(built).toBe("/cases/page/7/");

    const param = built.match(/^\/cases\/page\/([^/]+)\/$/)?.[1];
    expect(parseCasesPageParam(param)).toBe(7);
  });

  it("keeps /cases as page one, so the two never compete", () => {
    expect(SITE_ROUTES.map((route) => route.path)).toContain("/cases");
    expect(casesPagePath(1)).toBe("/cases/");
  });
});
