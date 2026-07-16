import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { DataHonesty } from "@/components/data-quality/DataHonesty";
import type { DataLakeMetrics, EntityMetrics, MaterialsMetrics } from "@/types/jds";

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

// Totals + counts/completeness are all this component reads; the breakdown
// arrays (by_type, by_source, ...) belong to other components' tests.
const nes: EntityMetrics = {
  total: 184466,
  by_prefix: [],
  by_type: [],
  counts: { with_identifier: 181600, with_provenance: 122094, with_bilingual_name: 172112 },
  completeness: { with_identifier: 98.4, with_provenance: 66.2, with_bilingual_name: 93.3 },
};
const ngm: DataLakeMetrics = {
  court_cases_total: 1610771,
  courts_total: 97,
  by_court_type: [],
  // nes_resolved is 0 — the one honest "not started yet" metric.
  counts: { nes_resolved: 0, with_registration_date: 1610701, with_document_sources: 23208 },
  completeness: { nes_resolved: 0.0, with_registration_date: 100.0, with_document_sources: 1.4 },
};
const materials: MaterialsMetrics = {
  total: 140020,
  by_type: [],
  by_source: [],
  by_source_type: [],
  counts: { with_description: 10229, with_url: 16288, with_date: 2117 },
  completeness: { with_description: 7.3, with_url: 11.6, with_date: 1.5 },
};

describe("DataHonesty", () => {

  it("renders the three domain groups with their totals", () => {
    render(<DataHonesty nes={nes} ngm={ngm} materials={materials} />);
    expect(screen.getByText("Court records")).toBeTruthy();
    expect(screen.getByText("People & offices tracked")).toBeTruthy();
    expect(screen.getByText("Source materials")).toBeTruthy();
    // Group denominator context is shown (the "· of N" heading span, distinct
    // from the per-row "N of M" counts).
    expect(
      screen.getByText(`· of ${ngm.court_cases_total.toLocaleString()}`),
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
