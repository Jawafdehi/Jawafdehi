import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { ArchiveSearchResult } from "@/types/search";

const getDocumentSources = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (key: string, fallback?: unknown) => (typeof fallback === "string" ? fallback : key),
  }),
}));
vi.mock("@/services/jds-api", () => ({
  getDocumentSources: () => getDocumentSources(),
}));

import { SearchResultCard } from "@/components/search/SearchResultCard";

const driHit: ArchiveSearchResult = {
  type: "material",
  id: "https://jawafdehi.org/material/dri/dri-100",
  source_app: "ngm",
  title: { ne: "प्रेस विज्ञप्ति", en: null },
  snippet: {},
  score: 1,
  url: "/material/dri/dri-100",
  api_url: null,
  matched_fields: [],
  extra: { date: "2021-06-14", type: "CreativeWork" },
} as unknown as ArchiveSearchResult;

// A search hit from a source this release has no label for used to read as
// "Other" with a generic document type. The API's source registry names it.
describe("SearchResultCard for a material from a source the frontend does not list", () => {
  it("labels the series and the office from /api/document-sources/", async () => {
    getDocumentSources.mockResolvedValue({
      ready: true,
      sources: [
        {
          source: "dri",
          name: { en: "Revenue Investigation releases and reports" },
          publisher: { en: "Department of Revenue Investigation", ne: "राजस्व अनुसन्धान विभाग" },
          labelled: true,
          count: 160,
        },
      ],
    });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <SearchResultCard result={driHit} viewMode="list" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Revenue Investigation releases and reports/)).toBeTruthy();
    expect(screen.getByText(/Department of Revenue Investigation/)).toBeTruthy();
  });
});
