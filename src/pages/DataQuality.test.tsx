import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";

import DataQuality from "@/pages/DataQuality";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === "string" ? fallback : key),
    i18n: { language: "en" },
  }),
}));

vi.mock("@/services/jds-api", () => ({
  getStatistics: vi.fn(() => new Promise(() => {})),
}));

// Each section is stubbed to a marker so the test pins the page's section
// order, not the sections' own rendering (covered by their own tests).
const { stub } = vi.hoisted(() => ({
  stub: (name: string) => () => <section data-testid="dq-section">{name}</section>,
}));
vi.mock("@/components/data-quality/AccountabilityGap", () => ({ AccountabilityGap: stub("corruptionCases") }));
vi.mock("@/components/data-quality/EntityBreakdown", () => ({ EntityBreakdown: stub("entities") }));
vi.mock("@/components/data-quality/EvidenceBackbone", () => ({ EvidenceBackbone: stub("courtCases") }));
vi.mock("@/components/data-quality/MaterialsBySource", () => ({ MaterialsBySource: stub("materialsBySource") }));
vi.mock("@/components/data-quality/DataHonesty", () => ({ DataHonesty: stub("honesty") }));
vi.mock("@/components/data-quality/DataPipeline", () => ({ DataPipeline: stub("methodology") }));
vi.mock("@/components/data-quality/UseThisData", () => ({ UseThisData: stub("useData") }));

describe("DataQuality page", () => {
  it("orders sections: evidence sources, court cases, ..., who we hold to account last", () => {
    render(
      <HelmetProvider>
        <QueryClientProvider client={new QueryClient()}>
          <DataQuality />
        </QueryClientProvider>
      </HelmetProvider>,
    );

    expect(screen.getAllByTestId("dq-section").map((s) => s.textContent)).toEqual([
      "materialsBySource",
      "courtCases",
      "corruptionCases",
      "honesty",
      "methodology",
      "useData",
      "entities",
    ]);
  });
});
