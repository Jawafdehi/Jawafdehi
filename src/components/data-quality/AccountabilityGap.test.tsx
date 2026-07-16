import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AccountabilityGap } from "@/components/data-quality/AccountabilityGap";
import type { CaseStatistics } from "@/types/jds";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>, opts?: Record<string, unknown>) => {
      const tmpl = typeof fallback === "string" ? fallback : key;
      const vars = (typeof fallback === "string" ? opts : fallback) as
        | Record<string, unknown>
        | undefined;
      return vars ? tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? "")) : tmpl;
    },
    i18n: { language: "en" },
  }),
}));

// StatusDonut renders recharts (ResponsiveContainer needs ResizeObserver, absent
// in jsdom). This test is about the funnel, not the donut, so stub it out.
vi.mock("@/components/data-quality/StatusDonut", () => ({
  StatusDonut: () => null,
}));

// react-countup animates 0 -> end; render the final value immediately.
vi.mock("react-countup", () => ({
  default: ({ end, separator = "," }: { end: number; separator?: string }) => (
    <>{end.toLocaleString("en-US").replace(/,/g, separator)}</>
  ),
}));

// Just the case-funnel scalars the component reads (the donut is stubbed above).
const STATS: CaseStatistics = {
  published_cases: 34,
  cases_under_investigation: 2891,
  cases_in_review: 512,
  cases_closed: 1,
  entities_tracked: 422,
  last_updated: "2026-07-13T14:21:38Z",
};

const renderGap = (stats: CaseStatistics) =>
  render(
    <MemoryRouter>
      <AccountabilityGap stats={stats} isLoading={false} isError={false} />
    </MemoryRouter>,
  );

describe("AccountabilityGap in-review split", () => {
  it("shows an In review stage split out of under-investigation when provided", () => {
    renderGap(STATS);
    expect(screen.getByText("In review (being prepared)")).toBeTruthy();
    // Under investigation is now draft-only = under_investigation - in_review.
    const draftOnly = STATS.cases_under_investigation - (STATS.cases_in_review ?? 0);
    expect(screen.getByText(draftOnly.toLocaleString("en-US"))).toBeTruthy();
  });

  it("omits the In review stage when cases_in_review is absent (pre-deploy)", () => {
    const { cases_in_review: _omit, ...withoutInReview } = STATS;
    renderGap(withoutInReview as CaseStatistics);
    expect(screen.queryByText("In review (being prepared)")).toBeNull();
    // Under investigation falls back to the full bundled count.
    expect(
      screen.getByText(STATS.cases_under_investigation.toLocaleString("en-US")),
    ).toBeTruthy();
  });
});
