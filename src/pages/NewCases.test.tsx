import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import en from "@/i18n/locales/en.json";
import type { Case, PaginatedCaseList } from "@/types/jds";

// Resolve keys against the real English copy (with i18next's _one/_other
// plurals and {{}} interpolation), so assertions read what a visitor reads.
const lookup = (key: string): unknown =>
  key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en);
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      let value = lookup(key);
      if (value === undefined && typeof options?.count === "number") {
        value = lookup(`${key}_${options.count === 1 ? "one" : "other"}`);
      }
      if (typeof value !== "string") return key;
      return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name] ?? ""));
    },
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));

const getCases = vi.fn();
vi.mock("@/services/jds-api", () => ({
  getCases: (...args: unknown[]) => getCases(...args),
}));

import NewCases from "@/pages/NewCases";

const wrap = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NewCases />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

const makeCase = (id: number, date: string, extra: Partial<Case> = {}) =>
  ({
    id,
    slug: `case-${id}`,
    title: `नेपाली शीर्षक ${id}`,
    title_en: `English title ${id}`,
    short_description: `Summary ${id}`,
    offence_type: "CORRUPTION",
    case_type: "CORRUPTION",
    tags: [],
    court_cases: [],
    case_publish_date: date,
    ...extra,
  }) as unknown as Case;

const page = (results: Case[]): PaginatedCaseList => ({ count: results.length, next: null, previous: null, results });

beforeEach(() => {
  getCases.mockReset();
  // Thursday 26 Nov 2026, midday in Kathmandu. Only Date is faked, so
  // react-query's timers still run.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-26T06:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("/new-cases", () => {
  it("asks for the window by publish date and lists the cases by week", async () => {
    getCases.mockResolvedValue(
      page([
        makeCase(1, "2026-11-24", {
          tags: ["land-grab"],
          court_cases: ["https://jawafdehi.org/courtcase/special/083-cr-0063"],
        }),
        makeCase(2, "2026-11-12"),
        makeCase(3, "2026-08-01"), // outside the window, as an API that ignores the filter returns it
      ]),
    );
    wrap();

    const link = await screen.findByRole("link", { name: "English title 1" });
    expect(link.getAttribute("href")).toBe("/case/case-1/");
    expect(getCases).toHaveBeenCalledWith(
      expect.objectContaining({ ordering: "-case_publish_date", published_after: "2026-10-02", page: 1 }),
    );

    const thisWeek = screen.getByRole("region", { name: "20–26 Nov 2026" });
    expect(within(thisWeek).getByText("This week")).toBeTruthy();
    expect(within(thisWeek).getByText("1 case")).toBeTruthy();
    expect(within(thisWeek).getByText("Land Grab")).toBeTruthy();
    expect(
      within(thisWeek)
        .getByRole("link", { name: /083-CR-0063 · Special Court/ })
        .getAttribute("href"),
    ).toBe("/courtcase/special/083-cr-0063");

    const lastWeek = screen.getByRole("region", { name: "13–19 Nov 2026" });
    expect(within(lastWeek).getByText(/No new cases/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "English title 2" })).toBeTruthy();
    expect(screen.queryByText("English title 3")).toBeNull();
    // Eight weeks, the quiet ones included.
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(8);
  });

  it("drops a tag that only repeats the offence", async () => {
    getCases.mockResolvedValue(
      page([makeCase(1, "2026-11-24", { offence_type: "MONEY_LAUNDERING", tags: ["money-laundering", "land-grab"] })]),
    );
    wrap();
    const row = (await screen.findByRole("link", { name: "English title 1" })).closest("li") as HTMLElement;
    expect(within(row).getAllByText("Money Laundering")).toHaveLength(1);
    expect(within(row).getByText("Land Grab")).toBeTruthy();
  });

  it("collapses a long week and shows the rest on request", async () => {
    getCases.mockResolvedValue(page(Array.from({ length: 12 }, (_, i) => makeCase(i + 1, "2026-11-24"))));
    wrap();

    await screen.findByRole("link", { name: "English title 12" });
    const hidden = screen.getByRole("link", { name: "English title 1", hidden: true }).closest("li");
    expect(hidden?.className).toContain("hidden");
    expect(hidden?.className).toContain("print:grid");

    fireEvent.click(screen.getByRole("button", { name: "Show all 12 cases" }));
    expect(screen.getByRole("link", { name: "English title 1" }).closest("li")?.className).not.toContain("hidden");
  });

  it("loads older weeks with an earlier cutoff", async () => {
    getCases.mockResolvedValue(page([makeCase(1, "2026-11-24"), makeCase(2, "2026-01-01")]));
    wrap();

    fireEvent.click(await screen.findByRole("button", { name: "Show older weeks" }));
    await waitFor(() =>
      expect(getCases).toHaveBeenCalledWith(expect.objectContaining({ published_after: "2026-08-07" })),
    );
    await waitFor(() => expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(16));
  });

  it("hides 'show older' when there is nothing older", async () => {
    getCases.mockResolvedValue(page([makeCase(1, "2026-11-24")]));
    wrap();
    await screen.findByRole("link", { name: "English title 1" });
    expect(screen.queryByRole("button", { name: "Show older weeks" })).toBeNull();
  });

  it("links the feeds and the newsletter, and advertises the feeds in the head", async () => {
    getCases.mockResolvedValue(page([]));
    wrap();

    expect(screen.getByRole("link", { name: "RSS feed" }).getAttribute("href")).toBe(
      "https://api.jawafdehi.org/api/feeds/new-cases.rss?lang=en",
    );
    expect(screen.getByRole("link", { name: "Atom feed" }).getAttribute("href")).toBe(
      "https://api.jawafdehi.org/api/feeds/new-cases.atom?lang=en",
    );
    expect(screen.getByRole("link", { name: "Email newsletter" }).getAttribute("href")).toBe(
      "#footer-newsletter-title",
    );
    await waitFor(() => {
      expect(
        document.head.querySelector('link[rel="alternate"][type="application/rss+xml"]')?.getAttribute("href"),
      ).toBe("https://api.jawafdehi.org/api/feeds/new-cases.rss?lang=en");
      expect(document.head.querySelector('link[rel="alternate"][type="application/atom+xml"]')).not.toBeNull();
    });
  });

  it("says so when the cases don't load", async () => {
    getCases.mockRejectedValue(new Error("boom"));
    wrap();
    expect(await screen.findByText("New cases didn't load")).toBeTruthy();
  });
});
