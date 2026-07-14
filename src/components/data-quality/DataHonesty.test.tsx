import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { DataHonesty } from "@/components/data-quality/DataHonesty";
import { MOCK_STATISTICS } from "@/lib/data-quality-mock";

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>, opts?: Record<string, unknown>) => {
      const tmpl = typeof fallback === "string" ? fallback : key;
      const vars = (typeof fallback === "string" ? opts : fallback) as
        | Record<string, unknown>
        | undefined;
      return vars
        ? tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""))
        : tmpl;
    },
    i18n: { language: "en" },
  }),
}));

describe("DataHonesty", () => {
  const { nes, ngm, materials } = MOCK_STATISTICS;

  it("renders the three domain groups with their totals", () => {
    render(<DataHonesty nes={nes} ngm={ngm} materials={materials} />);
    expect(screen.getByText("Court records")).toBeTruthy();
    expect(screen.getByText("People & offices tracked")).toBeTruthy();
    expect(screen.getByText("Source materials")).toBeTruthy();
    // Group denominator context is shown (the "· of N" heading span, distinct
    // from the per-row "N of M" counts).
    expect(
      screen.getByText(`· of ${ngm!.court_cases_total.toLocaleString()}`),
    ).toBeTruthy();
  });

  it("tags only the 0% (not-yet-started) metric and orders best-first", () => {
    render(<DataHonesty nes={nes} ngm={ngm} materials={materials} />);

    // nes_resolved is 0 in the fixture -> exactly one 'not started yet' tag.
    expect(screen.getAllByText(/not started yet/).length).toBe(1);

    // Within the Court records group, the strongest metric (registration date,
    // ~100%) must render before the 0% linked metric.
    const list = screen.getByText("Have an official registration date").closest("ul")!;
    const labels = within(list)
      .getAllByText(/^Have|^Linked/)
      .map((el) => el.textContent);
    expect(labels[0]).toBe("Have an official registration date");
    expect(labels[labels.length - 1]).toBe("Linked to the people and offices named");
  });
});
