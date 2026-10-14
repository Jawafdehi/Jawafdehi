import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MaterialsMetrics } from "@/types/jds";

const getStatistics = vi.hoisted(() => vi.fn());
const searchArchive = vi.hoisted(() => vi.fn());

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
// jsdom implements no IntersectionObserver, which the reveal hook observes with.
vi.mock("@/hooks/useRevealOnScroll", () => ({ useRevealOnScroll: () => ({ current: null }) }));
vi.mock("@/services/jds-api", () => ({ getStatistics: () => getStatistics() }));
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
 * complement. Verified against /api/statistics/ in production.
 */
function metrics(overrides: Partial<MaterialsMetrics> = {}): MaterialsMetrics {
  return {
    total: 579_249,
    by_type: [],
    by_source: [{ source: "official_report", count: 228 }],
    by_source_type: [],
    by_dataset_bucket: [
      { source: "official_report", dataset_bucket: "report_annual-report", count: 18 },
      { source: "official_report", dataset_bucket: "report_province-report", count: 56 },
      { source: "official_report", dataset_bucket: "publication_audit-journals", count: 21 },
      { source: "official_report", dataset_bucket: "publication_audit-bulletin", count: 29 },
      // A kind no shelf claims by name: it must land in the complement, not vanish.
      { source: "official_report", dataset_bucket: "publication_other", count: 1 },
    ],
    counts: {},
    ...overrides,
  } as MaterialsMetrics;
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

/** The count a named folder card shows, as rendered text. */
function countFor(name: string): string {
  const heading = screen.getByRole("heading", { name });
  const text = heading.parentElement?.querySelector("p")?.textContent ?? "";
  return text.replace("documents", "").trim();
}

beforeEach(() => {
  getStatistics.mockReset();
  searchArchive.mockReset();
  searchArchive.mockResolvedValue({ results: [], count: 0 });
});

describe("MaterialsLanding folder counts", () => {
  it("splits one source token's 228 documents across its five shelves", async () => {
    getStatistics.mockResolvedValue({ materials: metrics() });
    renderPage();

    await waitFor(() =>
      expect(countFor("Auditor General annual reports")).toBe("18"),
    );
    expect(countFor("Province audit reports")).toBe("56");
    expect(countFor("Audit journal")).toBe("21");
    expect(countFor("Audit bulletin")).toBe("29");
    // 228 − (18 + 56 + 21 + 29) = 104, by subtraction, so the one unclaimed
    // `publication_other` row is counted here rather than dropped.
    expect(countFor("Other Auditor General publications")).toBe("104");
  });

  it("shows a dash, not a zero, before the statistics arrive", () => {
    // A never-resolving request: the page must not claim the archive is empty.
    getStatistics.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(countFor("Auditor General annual reports")).toBe("—");
  });

  it("falls back to a dash-free zero when the API predates by_dataset_bucket", async () => {
    getStatistics.mockResolvedValue({
      materials: metrics({ by_dataset_bucket: undefined }),
    });
    renderPage();

    // An older API omits the cross-tab entirely. A kinded shelf then reports 0
    // — visibly wrong but honest — while the shelves that only need `by_source`
    // stay correct. It must never fall back to the source total of 228, which
    // would restate the bug this split fixed.
    await waitFor(() => expect(countFor("Audit journal")).toBe("0"));
    expect(countFor("Auditor General annual reports")).toBe("0");
    expect(countFor("Other Auditor General publications")).toBe("228");
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
    getStatistics.mockResolvedValue({ materials: metrics() });
    searchArchive.mockResolvedValue({
      results: [recent("a", "2026-10-02"), recent("b", "2026-09-30")],
      count: 2,
    });
    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText(/The 2 newest of 5,79,249 documents in the archive\./),
      ).toBeTruthy(),
    );

    const browseAll = screen.getByRole("link", { name: "Browse all documents" });
    expect(browseAll.getAttribute("href")).toBe("/materials/?sort=newest");
  });

  it("claims no total before the statistics arrive", () => {
    getStatistics.mockReturnValue(new Promise(() => {}));
    searchArchive.mockResolvedValue({ results: [recent("a", "2026-10-02")], count: 1 });
    renderPage();

    // Better to say nothing than to size the archive at zero.
    expect(screen.queryByText(/newest of/)).toBeNull();
  });
});
