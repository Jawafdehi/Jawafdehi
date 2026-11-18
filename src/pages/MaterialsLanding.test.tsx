import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DocumentSourcesResponse } from "@/lib/document-sources";

const getStatistics = vi.hoisted(() => vi.fn());
const searchArchive = vi.hoisted(() => vi.fn());
const getDocumentSources = vi.hoisted(() => vi.fn());

// Mirrors the two call shapes this page uses: `t(key, "inline default")` and
// `t(key, { defaultValue, ...vars })`. The second has to interpolate, or an
// assertion on an interpolated sentence can only ever see the raw key.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (key: string, fallback?: unknown) => {
      if (typeof fallback === "string") return fallback;
      if (!fallback || typeof fallback !== "object") return key;
      const options = fallback as Record<string, unknown>;
      const template =
        typeof options.defaultValue === "string" ? options.defaultValue : key;
      return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
        name in options ? String(options[name]) : match,
      );
    },
  }),
}));

vi.mock("@/components/Seo", () => ({ default: () => null }));
// The browser has its own tests (ArchiveBrowser.test.tsx); here only its placement.
vi.mock("@/components/materials/ArchiveBrowser", () => ({
  ArchiveBrowser: () => <div data-testid="archive-browser" />,
}));
// jsdom implements no IntersectionObserver, which the reveal hook observes with.
vi.mock("@/hooks/useRevealOnScroll", () => ({ useRevealOnScroll: () => ({ current: null }) }));
vi.mock("@/services/jds-api", () => ({
  getStatistics: () => getStatistics(),
  getDocumentSources: () => getDocumentSources(),
}));
vi.mock("@/services/search-api", () => ({
  searchArchive: (...args: unknown[]) => searchArchive(...args),
}));
vi.mock("@/services/datalake-api", () => ({
  // Resolve null rather than undefined: the per-card description fetch is a
  // real query, and react-query warns on an undefined result.
  getMaterial: vi.fn().mockResolvedValue(null),
  materialTail: (id: string) => id,
}));

import MaterialsLanding from "@/pages/MaterialsLanding";

/**
 * The live numbers as of the Auditor General split: 228 `official_report`
 * documents, of which four kinds are shelved by name and the rest fall to the
 * complement, as /api/document-sources/ serves them. `total` pads the archive to
 * 579,249 with one more source, so the recents framing has a real number.
 */
function catalogue(
  { withBuckets = true }: { withBuckets?: boolean } = {},
): DocumentSourcesResponse {
  return {
    ready: true,
    sources: [
      {
        source: "ag",
        name: { en: "Charge sheets" },
        publisher: { en: "Office of the Attorney General" },
        labelled: true,
        count: 579_021,
        types: [{ type: "charge_sheet", count: 579_021 }],
      },
      {
        source: "official_report",
        name: { en: "Auditor General reports and publications" },
        publisher: { en: "Office of the Auditor General" },
        labelled: true,
        count: 228,
        types: [{ type: "official_report", count: 228 }],
        series: withBuckets
          ? [
              { bucket: "report_annual-report", count: 18 },
              { bucket: "report_province-report", count: 56 },
              { bucket: "publication_audit-journals", count: 21 },
              { bucket: "publication_audit-bulletin", count: 29 },
              // A kind no shelf claims by name: it must land in the complement.
              { bucket: "publication_other", count: 1 },
            ]
          : undefined,
      },
    ],
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MaterialsLanding />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getStatistics.mockReset();
  searchArchive.mockReset();
  searchArchive.mockResolvedValue({ results: [], count: 0 });
  getDocumentSources.mockReset();
  getDocumentSources.mockResolvedValue({ ready: true, sources: [] });
});

describe("MaterialsLanding archive section", () => {
  it("renders the archive browser in the #archive section, with the old anchors kept", async () => {
    renderPage();
    expect(await screen.findByTestId("archive-browser")).toBeTruthy();
    const section = document.getElementById("archive");
    expect(section?.contains(screen.getByTestId("archive-browser"))).toBe(true);
    expect(document.getElementById("series")).toBeTruthy();
    expect(document.getElementById("sources")).toBeTruthy();
  });
});

// A reviewer read the four "Recently added" cards as the archive's whole news
// holding and asked why we only had those three articles. The carousel is the
// newest slice of 579,249 documents; it has to say so.
describe("MaterialsLanding recently-added framing", () => {
  const recent = (id: string, date: string) => ({
    id,
    url: `/material/news/${id}`,
    title: { en: id, ne: id },
    snippet: { en: "", ne: "" },
    extra: { date },
  });

  it("says what slice the carousel is, and links to the rest", async () => {
    getDocumentSources.mockResolvedValue(catalogue());
    searchArchive.mockResolvedValue({
      results: [recent("a", "2026-10-02"), recent("b", "2026-09-30")],
      count: 2,
    });
    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText(/The 2 newest of 579,249 documents in the archive\./),
      ).toBeTruthy(),
    );

    const browseAll = screen.getByRole("link", { name: "Browse all documents" });
    expect(browseAll.getAttribute("href")).toBe("/materials/?sort=newest");
  });

  it("claims no total before the catalogue arrives", () => {
    getDocumentSources.mockReturnValue(new Promise(() => {}));
    searchArchive.mockResolvedValue({ results: [recent("a", "2026-10-02")], count: 1 });
    renderPage();

    // Better to say nothing than to size the archive at zero.
    expect(screen.queryByText(/newest of/)).toBeNull();
  });
});
