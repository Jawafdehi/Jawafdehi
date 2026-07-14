import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AccountabilityGap } from "@/components/data-quality/AccountabilityGap";
import { MOCK_STATISTICS } from "@/lib/data-quality-mock";

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

const renderGap = (stats: typeof MOCK_STATISTICS) =>
  render(
    <MemoryRouter>
      <AccountabilityGap stats={stats} isLoading={false} isError={false} />
    </MemoryRouter>,
  );

describe("AccountabilityGap in-review split", () => {
  it("shows an In review stage split out of under-investigation when provided", () => {
    renderGap(MOCK_STATISTICS);
    expect(screen.getByText("In review (being prepared)")).toBeTruthy();
    // Under investigation is now draft-only = under_investigation - in_review.
    const draftOnly =
      MOCK_STATISTICS.cases_under_investigation - (MOCK_STATISTICS.cases_in_review ?? 0);
    expect(screen.getByText(draftOnly.toLocaleString("en-US"))).toBeTruthy();
  });

  it("omits the In review stage when cases_in_review is absent (pre-deploy)", () => {
    const { cases_in_review: _omit, ...withoutInReview } = MOCK_STATISTICS;
    renderGap(withoutInReview as typeof MOCK_STATISTICS);
    expect(screen.queryByText("In review (being prepared)")).toBeNull();
    // Under investigation falls back to the full bundled count.
    expect(
      screen.getByText(MOCK_STATISTICS.cases_under_investigation.toLocaleString("en-US")),
    ).toBeTruthy();
  });
});
