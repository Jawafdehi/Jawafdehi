// SPDX-License-Identifier: Hippocratic-3.0
// @vitest-environment node
//
// node, not jsdom: react-helmet-async only fills helmetContext when there is no
// DOM, and the head tags are what this file checks. See case-page-ssr.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";

import fixture from "../fixtures/series/deepak-bhatta-affair.json";

/**
 * A case-series page rendered at the edge (/series/<slug>/) must reach a
 * crawler as the whole page with the case page's head conventions: a title
 * from the record, a canonical with the trailing slash, a description, Open
 * Graph, a JSON API alternate and schema.org JSON-LD. And a series the API
 * does not serve must be a 404, not a titleless page.
 */

const { httpGet } = vi.hoisted(() => ({ httpGet: vi.fn() }));

// /series/:slug is lazy; React's browser server build gives the Worker's own
// renderToReadableStream path under Node (see courtcase-page-ssr.test.ts).
vi.mock("react-dom/server", async () => vi.importActual("react-dom/server.browser"));

vi.mock("@/services/http", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/services/http")>();
  real.http.get = httpGet as unknown as typeof real.http.get;
  return real;
});

const SLUG = "deepak-bhatta-affair";
const PATH = `/series/${SLUG}/`;
const CANONICAL = `https://jawafdehi.org/series/${SLUG}/`;

const { render } = await import("../../src/entry-server");

const renderSeries = () => render(PATH, undefined, { edge: true });

describe("SSR of a case-series page", () => {
  beforeEach(() => {
    httpGet.mockReset();
    httpGet.mockImplementation(async (url: string) => {
      if (url === `/api/series/${SLUG}/`) return { data: fixture };
      throw Object.assign(new Error(`unexpected GET ${url}`), { response: { status: 500 } });
    });
  });

  it("prefetches the series under the key the page reads", async () => {
    const { prefetch, dehydratedState } = await renderSeries();
    expect(prefetch.failed).toEqual([]);
    expect(prefetch.fulfilled).toEqual([["series", SLUG]]);
    const queries = (dehydratedState as { queries: { queryKey: unknown[] }[] }).queries;
    expect(queries.map((q) => q.queryKey)).toContainEqual(["series", SLUG]);
  });

  it("renders the page body, not its skeleton", async () => {
    const { html } = await renderSeries();
    expect(html).not.toContain('aria-busy="true"');
    expect(html).toContain("दीपक भट्ट प्रकरण");
    // Every member links to its case page.
    for (const member of fixture.members) {
      expect(html).toContain(`href="/case/${member.case.slug}/"`);
    }
  });

  it("carries a title, a canonical with the slash, a description and Open Graph", async () => {
    const { helmet } = (await renderSeries()).helmetContext;
    const title = helmet?.title?.toString() ?? "";
    expect(title).toMatch(/>दीपक भट्ट प्रकरण — मुद्दा शृङ्खला</);
    const link = helmet?.link?.toString() ?? "";
    expect(link).toContain(`rel="canonical" href="${CANONICAL}"`);
    // The JSON API alternate, on API_BASE_URL like the case page's.
    expect(link).toMatch(new RegExp(`href="[^"]*/api/series/${SLUG}/" rel="alternate"`));
    const meta = helmet?.meta?.toString() ?? "";
    expect(meta).toContain(`property="og:url" content="${CANONICAL}"`);
    expect(meta).toContain('property="og:type" content="article"');
    const description = /name="description" content="([^"]*)"/.exec(meta)?.[1] ?? "";
    expect(description.length).toBeGreaterThan(20);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it("ships CollectionPage JSON-LD listing the member case pages", async () => {
    const script = (await renderSeries()).helmetContext.helmet?.script?.toString() ?? "";
    const body = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/.exec(script)?.[1];
    expect(body).toBeDefined();
    const data = JSON.parse(body!) as Record<string, unknown>;
    expect(data["@type"]).toBe("CollectionPage");
    expect(data.url).toBe(CANONICAL);
    const list = data.mainEntity as { itemListElement: { url: string; position: number }[] };
    expect(list.itemListElement.map((item) => item.url)).toEqual(
      fixture.members.map((m) => `https://jawafdehi.org/case/${m.case.slug}/`),
    );
  });

  it("reports a series the API does not serve as a 404 prefetch", async () => {
    httpGet.mockImplementation(async () => {
      throw Object.assign(new Error("Request failed with status code 404"), {
        // DRF's own "no such series": a JSON 404.
        response: { status: 404, headers: { "content-type": "application/json" } },
      });
    });
    const { prefetch } = await render("/series/no-such-series/", undefined, { edge: true });
    expect(prefetch.fulfilled).toEqual([]);
    expect(prefetch.failed).toEqual([
      expect.objectContaining({ queryKey: ["series", "no-such-series"], status: 404 }),
    ]);
  });

  it("treats an API without the series endpoint (an HTML 404) as an error, not a 404", async () => {
    httpGet.mockImplementation(async () => {
      throw Object.assign(new Error("Request failed with status code 404"), {
        response: { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
      });
    });
    const { prefetch } = await render(PATH, undefined, { edge: true });
    expect(prefetch.fulfilled).toEqual([]);
    expect(prefetch.failed).toHaveLength(1);
    // No status: worker/edge-render.ts classes it an error and serves the
    // client-rendered shell instead of a cached, noindexed 404.
    expect(prefetch.failed[0]).not.toHaveProperty("status");
    expect(prefetch.failed[0].reason).toMatch(/series endpoint missing/);
  });
});
