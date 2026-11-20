import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Case } from "@/types/jds";

const { httpGet, getCasesCitingEntity, getCasesCitingCourtCase } = vi.hoisted(() => ({
  httpGet: vi.fn(),
  getCasesCitingEntity: vi.fn(),
  getCasesCitingCourtCase: vi.fn(),
}));

vi.mock("@/services/http", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/services/http")>();
  real.http.get = httpGet as unknown as typeof real.http.get;
  return real;
});
vi.mock("@/services/jds-api", () => ({
  getStatistics: vi.fn(),
  getCaseById: vi.fn(),
  getCasesCitingEntity,
  getCasesCitingCourtCase,
}));

const ENTITY = "https://jawafdehi.org/entity/person/hari-narayan-upadhyay";
const COURTCASE = "https://jawafdehi.org/courtcase/special/076-cr-0047";

const citingCase = {
  id: 1,
  slug: "bhaktapur-malpot-bribe-076-cr-0047",
  title: "मालपोत कार्यालय भक्तपुरमा घुस",
  case_type: "CORRUPTION",
  state: "PUBLISHED",
  created_at: "2026-06-10T00:00:00Z",
  updated_at: "2026-11-16T00:00:00Z",
  proceedings_started_on: "2019-08-27",
  dates: { stages: [] },
  entities: [{ nes_id: ENTITY, display_name: "हरि नारायण उपाध्याय", type: "accused", outcome: null }],
  tags: [],
  key_allegations: [],
  court_cases: [],
  bigo: null,
} as unknown as Case;

const { render } = await import("../../src/entry-server");
const { entityRelatedCasesQuery, courtCaseRelatedCasesQuery } = await import("@/queries/related-cases");

function apiGet(record: Record<string, unknown>) {
  httpGet.mockImplementation(async (url: string) => {
    if (url.startsWith("/api/entities/")) return { data: record };
    if (/^\/api\/courtcases\/[^/]+\/[^/]+\/$/.test(url)) {
      return { data: { court: "special", case_number: "076-CR-0047", case_type: "रिसवत(घुस)" } };
    }
    // hearings / entities pages of the court case
    return { data: { results: [], next: null } };
  });
}

const keysOf = (dehydratedState: unknown) =>
  (dehydratedState as { queries: { queryKey: unknown }[] }).queries.map((q) => q.queryKey);

/**
 * Entity and court-case pages are the natural internal links into case pages,
 * but their related-cases lists were never server-rendered: every entity page
 * shipped an aria-busy skeleton and no href="/case/", so a crawler could reach
 * case pages from almost nowhere but the sitemap. These pin that the lists are
 * rendered into the HTML — and that they stay optional, never failing the page.
 */
describe("SSR of related-cases lists", () => {
  beforeEach(() => {
    getCasesCitingEntity.mockResolvedValue({ count: 1, next: null, previous: null, results: [citingCase] });
    getCasesCitingCourtCase.mockResolvedValue({ count: 1, next: null, previous: null, results: [citingCase] });
  });
  afterEach(() => vi.clearAllMocks());

  it("renders an entity page's citing cases as links", async () => {
    apiGet({ "@id": ENTITY, "@type": "Person", name: "हरि नारायण उपाध्याय" });

    const { html, dehydratedState, prefetch } = await render("/entity/person/hari-narayan-upadhyay/", undefined, { edge: true });

    expect(html).toContain('href="/case/bhaktapur-malpot-bribe-076-cr-0047');
    expect(keysOf(dehydratedState)).toContainEqual([...entityRelatedCasesQuery(ENTITY).queryKey]);
    expect(prefetch.failed).toEqual([]);
  });

  it("drops the speculative list when the record's @id is not the IRI the URL implies", async () => {
    apiGet({ "@id": "https://jawafdehi.org/entity/person/merged-target", "@type": "Person", name: "x" });

    const { dehydratedState } = await render("/entity/person/hari-narayan-upadhyay/", undefined, { edge: true });

    expect(keysOf(dehydratedState)).not.toContainEqual([...entityRelatedCasesQuery(ENTITY).queryKey]);
  });

  it("still renders the entity page when the related-cases call fails", async () => {
    apiGet({ "@id": ENTITY, "@type": "Person", name: "हरि नारायण उपाध्याय" });
    getCasesCitingEntity.mockRejectedValue(new Error("timeout of 4000ms exceeded"));

    const { prefetch, dehydratedState } = await render("/entity/person/hari-narayan-upadhyay/", undefined, { edge: true });

    // A failed prefetch makes the edge serve the fallback shell; this one must not.
    expect(prefetch.failed).toEqual([]);
    expect(keysOf(dehydratedState)).toContainEqual(["entity-record", "person/hari-narayan-upadhyay"]);
  });

  // The HTML itself cannot be asserted here: /courtcase/* is a lazy route, which
  // only the Worker's renderToReadableStream resolves (Node's react-dom/server
  // has none, so this falls back to renderToString and the Suspense fallback).
  // What the edge renders from is the dehydrated cache, so pin that instead.
  it("prefetches a court-case page's citing cases, keyed on the lowercased IRI", async () => {
    apiGet({});

    const { dehydratedState, prefetch } = await render("/courtcase/special/076-CR-0047", undefined, { edge: true });

    expect(getCasesCitingCourtCase).toHaveBeenCalledWith(COURTCASE, expect.anything());
    expect(keysOf(dehydratedState)).toContainEqual([...courtCaseRelatedCasesQuery(COURTCASE).queryKey]);
    expect(prefetch.failed).toEqual([]);
  });
});
