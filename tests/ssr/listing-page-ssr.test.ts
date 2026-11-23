// SPDX-License-Identifier: Hippocratic-3.0
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ArchiveSearchResponse } from "@/types/search";

/**
 * A crawlable listing page, rendered for real through entry-server: its result
 * cards must link to the records, and its pager must link to the next page.
 * Those two kinds of <a href> are the whole point — together they are a path a
 * crawler can walk from /search/?type=case to every case.
 */

const { searchArchive } = vi.hoisted(() => ({ searchArchive: vi.fn() }));
vi.mock("@/services/search-api", () => ({ searchArchive }));

// Fictional, per the repo's fixture rule.
function response(page: number): ArchiveSearchResponse {
  return {
    query: "",
    lang: "both",
    sort: "newest",
    page,
    page_size: 12,
    count: 100,
    counts: { case: 100 },
    facets: {
      entity_type: [], case_origin: [], case_stage: [], case_type: [], tags: [],
      status: [], court: [], court_type: [], district: [], province: [], material_type: [],
    },
    results: [
      {
        type: "case",
        id: "https://jawafdehi.org/case/namuna-cooperative-fraud",
        source_app: "jawafdehi",
        title: { ne: "नमुना सहकारी प्रकरण", en: "Namuna Cooperative Fraud" },
        snippet: { ne: null, en: null },
        url: "/case/namuna-cooperative-fraud",
        api_url: "/api/cases/namuna-cooperative-fraud/",
        matched_fields: [],
        score: 1,
        extra: { case_type: "CORRUPTION" },
        // Production case hits carry the denormalised card (checked against
        // /api/search on 2026-11-23). Without it the card fetches its case on
        // the client and renders a skeleton on the server — older index
        // documents only.
        card: {
          slug: "namuna-cooperative-fraud",
          title: "नमुना सहकारी प्रकरण",
          short_description: "नमुना विवरण।",
          case_type: "CORRUPTION",
          offence_type: "CORRUPTION",
          status: "ongoing",
          tags: [],
          entities: [],
          stages: [],
          timeline: [],
          key_allegations: [],
          bigo: null,
          banner_url: null,
          thumbnail_url: null,
          thumbnail: null,
          case_start_date: null,
          case_end_date: null,
          proceedings_started_on: null,
          proceedings_decided_on: null,
        },
      },
    ],
    next_cursor: null,
    did_you_mean: null,
  } as unknown as ArchiveSearchResponse;
}

const { render } = await import("../../src/entry-server");

describe("SSR of a crawlable listing", () => {
  beforeEach(() => {
    searchArchive.mockReset();
    searchArchive.mockImplementation(async (params: { page: number }) => response(params.page));
  });

  it("renders its records as links", async () => {
    const { html } = await render("/search/?type=case&page=2", undefined, { edge: true });
    expect(html).toMatch(/href="\/case\/namuna-cooperative-fraud\/?"/);
  });

  it("links its pager, so a crawler can reach the next page", async () => {
    const { html } = await render("/search/?type=case&page=2", undefined, { edge: true });
    expect(html).toContain('href="/search/?type=case&amp;page=3"');
  });

  it("fetches exactly the page the URL names, and the cache entry the page reads", async () => {
    const { dehydratedState, prefetch } = await render("/search/?type=case&page=2", undefined, { edge: true });
    expect(prefetch.failed).toEqual([]);
    expect(searchArchive).toHaveBeenCalledTimes(1);
    expect(searchArchive.mock.calls[0][0]).toMatchObject({ type: "case", page: 2, page_size: 12 });
    const keys = (dehydratedState as { queries: { queryKey: unknown[] }[] }).queries.map((q) => q.queryKey[0]);
    expect(keys).toContain("archive-search");
  });

  it("renders an entity listing's records as links too", async () => {
    // Entity cards query the record for their avatar only; the name and link
    // render from the search hit, so an entity listing is walkable at the edge.
    searchArchive.mockImplementation(async () => ({
      ...response(1),
      counts: { entity: 40 },
      count: 40,
      results: [
        {
          type: "entity",
          id: "https://jawafdehi.org/entity/person/namuna-byakti",
          source_app: "nes",
          title: { ne: "नमुना व्यक्ति", en: "Namuna Byakti" },
          snippet: { ne: null, en: null },
          url: "/entity/person/namuna-byakti",
          api_url: null,
          matched_fields: [],
          score: 1,
          extra: { entity_type: "Person" },
        },
      ],
    }));
    const { html } = await render("/search/?type=entity", undefined, { edge: true });
    expect(html).toMatch(/href="\/entity\/person\/namuna-byakti\/?"/);
  });

  it("leaves a filtered search alone: no prefetch, no linked pager", async () => {
    // Filtered views keep button paging (PaginationControls' rule) and are not
    // rendered at the edge; this branch must not fire for them.
    await render("/search/?type=case&q=bribe", undefined, { edge: true });
    expect(searchArchive).not.toHaveBeenCalled();
  });

  it("does not touch the build: bare /search is not a listing", async () => {
    // The build pre-renders /search; prefetching there would change the static
    // page and spend the build's time budget.
    await render("/search/");
    expect(searchArchive).not.toHaveBeenCalled();
  });
});
