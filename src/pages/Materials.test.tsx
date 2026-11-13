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

  it("opens a series as a filter on the archive search", async () => {
    renderAt("/materials/?series=ciaa-annual-reports");
    expect(
      await screen.findByText("SEARCH AT /search/?type=material&series=ciaa-annual-reports"),
    ).toBeTruthy();
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

  it("keeps a series' own query, sort and date range on the way", async () => {
    // The retired series page searched inside its shelf with q/sort and kept its
    // dates as from/to; search reads the same query and sort, and its own
    // date_from/date_to.
    renderAt("/materials/?series=charge-sheets&q=ujuri&sort=oldest&from=2080-01-01");
    expect(
      await screen.findByText(
        "SEARCH AT /search/?type=material&series=charge-sheets&q=ujuri&sort=oldest&date_from=2080-01-01",
      ),
    ).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("LANDING")).toBeNull());
  });
});
