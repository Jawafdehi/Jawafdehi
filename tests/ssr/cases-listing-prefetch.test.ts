import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ArchiveSearchResponse } from "@/types/search";

const { searchArchiveMock } = vi.hoisted(() => ({ searchArchiveMock: vi.fn() }));

vi.mock("@/services/search-api", () => ({ searchArchive: searchArchiveMock }));
vi.mock("@/services/jds-api", () => ({ getStatistics: vi.fn(), getCaseById: vi.fn() }));

/** A full listing page's worth of cases, so page 2 exists (count > one page). */
function listing(page: number): ArchiveSearchResponse {
  return {
    query: "",
    lang: "both",
    sort: "newest",
    page,
    page_size: 12,
    count: 100,
    counts: { case: 100 },
    facets: {
      entity_type: [], case_type: [], tags: [], status: [], court: [], court_type: [], district: [], province: [],
    },
    next_cursor: null,
    results: [
      {
        type: "case",
        id: `https://jawafdehi.org/case/bhaktapur-malpot-bribe-p${page}`,
        source_app: "jawafdehi",
        title: { ne: "मालपोत कार्यालय भक्तपुरमा घुस", en: "Bhaktapur land revenue office bribe" },
        snippet: { ne: null, en: "" },
        url: `/case/bhaktapur-malpot-bribe-p${page}`,
        api_url: `/api/cases/bhaktapur-malpot-bribe-p${page}/`,
        matched_fields: [],
        score: 1,
        extra: {},
      },
    ],
  };
}

const { render } = await import("../../src/entry-server");
const { casesSearchQuery } = await import("@/queries/cases");

/**
 * /cases and /cases/page/N are the only crawlable path from the site to its case
 * pages. #440 changed the client's query key without the server's, so the SSR
 * prefetch filled a key nothing read and every listing page shipped as a
 * "loading…" skeleton with zero case links, while the build stayed green. These
 * pin the outcome a crawler sees — case links in the HTML — not just the key.
 */
describe("SSR of the /cases listing", () => {
  beforeEach(() => {
    searchArchiveMock.mockReset();
    searchArchiveMock.mockImplementation(async ({ page }: { page?: number }) => listing(page ?? 1));
  });

  it.each([
    ["/cases/", 1],
    ["/cases/page/2/", 2],
  ])("renders case links into the HTML of %s", async (url, page) => {
    const { html } = await render(url);

    expect(html).toContain(`href="/case/bhaktapur-malpot-bribe-p${page}`);
    expect(searchArchiveMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "case", sort: "newest", page }),
    );
  });

  it("retries a transient upstream failure instead of publishing a skeleton", async () => {
    // The build renders all ~238 listing pages at once; one ECONNRESET used to
    // fail the whole build (no retry on this branch, unlike the case pages).
    const reset = Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" });
    searchArchiveMock.mockRejectedValueOnce(reset);

    const { html, prefetch } = await render("/cases/page/2/");

    expect(prefetch.failed).toEqual([]);
    expect(html).toContain('href="/case/bhaktapur-malpot-bribe-p2');
    expect(searchArchiveMock).toHaveBeenCalledTimes(2);
  });

  it("dehydrates the listing under the key the page reads", async () => {
    const { dehydratedState } = await render("/cases/page/2/");

    const keys = (dehydratedState as { queries: { queryKey: unknown }[] }).queries.map(
      (q) => q.queryKey,
    );
    expect(keys).toContainEqual([...casesSearchQuery("", 2).queryKey]);
  });
});
