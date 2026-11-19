import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (_key: string, fallback?: string) => fallback ?? "",
  }),
}));

vi.mock("@/pages/MaterialsLanding", () => ({
  default: () => <div>LANDING</div>,
}));

// A leaf folder of the archive browser: its own page, with its own tests.
vi.mock("@/pages/MaterialSeriesBrowse", () => ({
  default: ({ slug, sourceKey }: { slug?: string; sourceKey?: string }) => (
    <div>{slug ? `SERIES ${slug}` : `SOURCE ${sourceKey}`}</div>
  ),
}));

import Materials from "@/pages/Materials";

function SearchStub() {
  const location = useLocation();
  return <div>SEARCH AT {`${location.pathname}${location.search}`}</div>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/materials/" element={<Materials />} />
        <Route path="/search" element={<SearchStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Materials view routing", () => {
  it("renders the landing with no params", async () => {
    renderAt("/materials/");
    expect(await screen.findByText("LANDING")).toBeTruthy();
  });

  it("opens a series as its own browse page (the archive browser's leaf folder)", async () => {
    renderAt("/materials/?series=ciaa-annual-reports");
    expect(await screen.findByText("SERIES ciaa-annual-reports")).toBeTruthy();
  });

  it("redirects a bare ?q= to /search, so existing deep links survive", async () => {
    renderAt("/materials/?q=corruption");
    expect(await screen.findByText("SEARCH AT /search/?type=material&q=corruption")).toBeTruthy();
  });

  it("carries every param across, the type and date filters included", async () => {
    renderAt("/materials/?q=ujuri&tags=a&tags=b&material_type=report&date_from=2080-01-01&date_to=2081-12-30&sort=oldest&page=3");
    expect(
      await screen.findByText(
        "SEARCH AT /search/?type=material&q=ujuri&tags=a&tags=b&material_type=report&date_from=2080-01-01&date_to=2081-12-30&sort=oldest&page=3",
      ),
    ).toBeTruthy();
  });

  it("treats a filter alone as a search, not the landing", async () => {
    renderAt("/materials/?material_type=report");
    expect(await screen.findByText("SEARCH AT /search/?type=material&material_type=report")).toBeTruthy();
  });

  it("keeps a series' own query, sort and date range on its browse page", async () => {
    // ?series= wins over the search params: the series page owns q/sort and
    // its date range, so a filtered series link stays on that series.
    renderAt("/materials/?series=charge-sheets&q=ujuri&sort=oldest&from=2080-01-01");
    expect(await screen.findByText("SERIES charge-sheets")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("LANDING")).toBeNull());
  });

  it("opens a whole source (?source=) as its own browse page", async () => {
    renderAt("/materials/?source=dri");
    expect(await screen.findByText("SOURCE dri")).toBeTruthy();
  });
});
