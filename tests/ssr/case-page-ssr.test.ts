// SPDX-License-Identifier: Hippocratic-3.0
// @vitest-environment node
//
// node, not the suite's default jsdom: react-helmet-async writes to
// document.head when a DOM exists and only fills helmetContext.helmet when one
// does not. Under jsdom the head tags this file exists to check are silently
// undefined — which is also why tests/ssr/render.property.test.ts had to make
// its own title assertion conditional. The edge renderer has no DOM either, so
// node is the faithful environment for a question about what a crawler gets.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Case } from "@/types/jds";

/**
 * A case page must server-render its case — not a skeleton.
 *
 * tests/ssr/prefetch-contract.test.ts already pins that the prefetch SUCCEEDS,
 * and that was not enough: between #465 and this file, every one of 2,847 case
 * pages served crawlers an empty <title> and 1,531 characters of navbar and
 * footer. The prefetch had worked perfectly. CaseDetail just read the cache
 * under ["case", id, stressMode] while entry-server wrote ["case", slug], so
 * the component missed, rendered its skeleton, and never reached <Seo>.
 *
 * Nothing in the suite looked at the rendered output, so nothing failed. This
 * does: it renders the real page through the real entry-server and asserts the
 * things a crawler needs — a title, a canonical, and the case's own words in
 * the body.
 */

const { getCaseById, getStatistics, getCasesCitingEntity, getCasesCitingCourtCase } = vi.hoisted(() => ({
  getCaseById: vi.fn(),
  getStatistics: vi.fn(),
  getCasesCitingEntity: vi.fn(),
  getCasesCitingCourtCase: vi.fn(),
}));

vi.mock("@/services/jds-api", () => ({
  getCaseById,
  getStatistics,
  getCasesCitingEntity,
  getCasesCitingCourtCase,
}));

const SLUG = "bhaktapur-malpot-bribe-076-cr-0047";
const TITLE = "मालपोत कार्यालय भक्तपुरमा घुस लिएको मुद्दा";

// Shaped after the real payload of /api/cases/<slug>/ — every collection the
// page walks is present, because CaseDetail reads several of them unguarded and
// a missing one throws inside the render rather than failing an assertion.
const testCase = {
  id: 1447,
  slug: SLUG,
  title: TITLE,
  description: "",
  short_description: "मालपोत कार्यालयका कर्मचारीले लिखत पारित गर्न घुस मागेको अभियोग।",
  notes: "",
  public_notes: "",
  case_type: "CORRUPTION",
  offence_type: "रिसवत(घुस)",
  state: "PUBLISHED",
  status: "DECIDED",
  status_override: null,
  case_track: null,
  missing_details: null,
  no_one_charged: false,
  weight: 0,
  bigo: 4000,
  banner: null,
  banner_url: "",
  banner_image_id: null,
  thumbnail: null,
  thumbnail_url: "",
  thumbnail_image_id: null,
  public_iri: `https://jawafdehi.org/case/${SLUG}/`,
  created_at: "2026-06-10T00:00:00Z",
  updated_at: "2026-11-16T00:00:00Z",
  case_start_date: "2019-08-27",
  case_end_date: "2021-03-14",
  case_publish_date: "2026-06-10",
  proceedings_started_on: "2019-08-27",
  proceedings_decided_on: "2021-03-14",
  dates: { stages: [] },
  entities: [],
  evidence: [],
  court_cases: [],
  tags: ["घुस"],
  key_allegations: [],
  timeline: [],
  authors: [],
  ai_generated_sections: [],
  public_edit_history: [],
  appeal_parties: {},
  appeal_verdicts: {},
  versionInfo: {},
} as unknown as Case;

const { render } = await import("../../src/entry-server");

// Case pages are rendered at the edge, one per request, and only the edge path
// awaits Suspense (entry-server: `options.edge ? renderComplete : renderToString`).
// Rendering without it would assert against a path no case page ever takes.
const renderCase = () => render(`/case/${SLUG}/`, undefined, { edge: true });

describe("SSR of a case page", () => {
  beforeEach(() => {
    getCaseById.mockResolvedValue(testCase);
    getCasesCitingEntity.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    getCasesCitingCourtCase.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  });
  afterEach(() => vi.clearAllMocks());

  it("renders the case, not its loading skeleton", async () => {
    const result = await renderCase();

    expect(result.html).toContain(TITLE);
    // CaseDetail's loading branch marks itself aria-busy; the page proper never
    // does. (Not a blanket animate-pulse check — the Disqus thread is legitimately
    // a client-only placeholder and keeps its own.)
    expect(result.html).not.toContain('aria-busy="true"');
  });

  it("gives a crawler a title and a canonical", async () => {
    const result = await renderCase();
    const helmet = result.helmetContext.helmet;

    const title = helmet?.title?.toString() ?? "";
    expect(title).toContain(TITLE);
    // An empty <title data-rh="true"></title> is exactly what the regression
    // emitted, and it matches /<title/ — so assert on the CONTENT.
    expect(title).toMatch(/>[^<]+</);

    expect(helmet?.link?.toString() ?? "").toContain(
      `rel="canonical" href="https://jawafdehi.org/case/${SLUG}/"`,
    );
    expect(helmet?.meta?.toString() ?? "").toMatch(/name="description" content="[^"]+"/);
  });

  it("hands the client a cache the page can actually read", async () => {
    // The contract that broke: entry-server writes this key, CaseDetail reads
    // it. If either side adds an element, the page silently goes blank again.
    const keys = (result: { dehydratedState: unknown }) =>
      (result.dehydratedState as { queries: { queryKey: unknown[] }[] }).queries.map((q) => q.queryKey);

    expect(keys(await renderCase())).toContainEqual(["case", SLUG]);
  });

  it("titles the case with its court number when the title lacks one", async () => {
    // 099-* is fictional: it cannot collide with a real register entry.
    getCaseById.mockResolvedValue({
      ...testCase,
      court_cases: ["https://jawafdehi.org/courtcase/special/099-cr-9001"],
    });
    const title = (await renderCase()).helmetContext.helmet?.title?.toString() ?? "";
    expect(title).toContain(`${TITLE} (099-CR-9001) | Jawafdehi`);
  });

  it("ships the case as a schema.org Report", async () => {
    const script = (await renderCase()).helmetContext.helmet?.script?.toString() ?? "";
    const blocks = [...script.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map(
      (m) => JSON.parse(m[1]) as Record<string, unknown>,
    );
    const report = blocks.find((b) => b["@type"] === "Report");
    expect(report).toMatchObject({
      name: TITLE,
      url: `https://jawafdehi.org/case/${SLUG}/`,
    });
  });
});
