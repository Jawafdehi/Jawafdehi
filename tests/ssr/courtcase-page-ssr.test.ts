// SPDX-License-Identifier: Hippocratic-3.0
// @vitest-environment node
//
// node, not jsdom: react-helmet-async only fills helmetContext when there is no
// DOM, and the head tags are what this file checks. See case-page-ssr.test.ts.
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A court-case page must give a crawler the same head every other record page
 * does: a canonical, a description built from the record, and its breadcrumb
 * as structured data.
 *
 * It did not. CourtCaseProfile wrote its own Helmet tags instead of going
 * through <Seo>, and so — unlike cases, entities and materials — never emitted
 * a rel=canonical at all (measured on production 2026-11-23), and every one of
 * its 19,217 pages shared one description sentence.
 */

const { httpGet, getCasesCitingCourtCase } = vi.hoisted(() => ({
  httpGet: vi.fn(),
  getCasesCitingCourtCase: vi.fn(),
}));

// /courtcase/* is a lazy route, and only renderToReadableStream waits for a lazy
// chunk. The Worker has it; React 18's NODE build of react-dom/server does not,
// so under Node entry-server's renderComplete falls back to renderToString and
// renders the Suspense fallback — which is why related-cases-prefetch.test.ts
// had to settle for asserting the dehydrated cache instead of the HTML.
//
// React's BROWSER server build does ship renderToReadableStream, and Node has
// the web streams it needs. Pointing react-dom/server at it runs the Worker's
// own render path here, so the head and body can be checked as a crawler gets
// them.
vi.mock("react-dom/server", async () => vi.importActual("react-dom/server.browser"));

vi.mock("@/services/http", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/services/http")>();
  real.http.get = httpGet as unknown as typeof real.http.get;
  return real;
});
vi.mock("@/services/jds-api", () => ({
  getStatistics: vi.fn(),
  getCaseById: vi.fn(),
  getCasesCitingEntity: vi.fn(),
  getCasesCitingCourtCase,
}));

// Mixed case on purpose: a court reference is typed both ways, and the page
// must name ONE canonical form for both.
const PATH = "/courtcase/special/071-CR-0232";
const CANONICAL = "https://jawafdehi.org/courtcase/special/071-cr-0232";

const { render } = await import("../../src/entry-server");

const renderCourtCase = () => render(PATH, undefined, { edge: true });

describe("SSR of a court-case page", () => {
  beforeEach(() => {
    getCasesCitingCourtCase.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    httpGet.mockImplementation(async (url: string) => {
      if (/^\/api\/courtcases\/[^/]+\/[^/]+\/$/.test(url)) {
        return {
          data: {
            case_number: "071-CR-0232",
            court_identifier: "special",
            case_type: "रकम हिनामिना",
            case_status: "फैसला >> सफाई",
            registration_date_bs: "2071-10-22",
            registration_date_ad: "2015-02-05",
            plaintiff: "नेपाल सरकार",
            defendant: "राम बहादुर थापा समेत २",
            orders: [],
            court_chain: [],
          },
        };
      }
      // hearings / entities pages
      return { data: { results: [], next: null } };
    });
  });

  it("emits a canonical — the lowercase IRI the sitemap advertises", async () => {
    const link = (await renderCourtCase()).helmetContext.helmet?.link?.toString() ?? "";
    expect(link).toContain(`rel="canonical" href="${CANONICAL}"`);
  });

  it("describes the record, outcome included, not with the shared sentence", async () => {
    const meta = (await renderCourtCase()).helmetContext.helmet?.meta?.toString() ?? "";
    const description = /name="description" content="([^"]*)"/.exec(meta)?.[1] ?? "";
    expect(description).toContain("रकम हिनामिना");
    expect(description).toContain("सफाई");
    expect(description).not.toContain("in the Jawafdehi governance archive");
    // And it keeps party names out of the snippet.
    expect(description).not.toContain("राम बहादुर थापा");
  });

  it("carries a title built from the record", async () => {
    const title = (await renderCourtCase()).helmetContext.helmet?.title?.toString() ?? "";
    expect(title).toMatch(/>[^<]*071-CR-0232[^<]*रकम हिनामिना[^<]*</);
  });

  it("ships its breadcrumb as BreadcrumbList structured data", async () => {
    const { html } = await renderCourtCase();
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
      (m) => JSON.parse(m[1]) as Record<string, unknown>,
    );
    const crumbs = blocks.find((b) => b["@type"] === "BreadcrumbList");
    expect(crumbs).toBeDefined();
    const items = crumbs!.itemListElement as Record<string, unknown>[];
    expect(items[0]).toMatchObject({ position: 1, item: "https://jawafdehi.org/" });
    expect(items.at(-1)).toMatchObject({ name: "071-CR-0232" });
  });
});
