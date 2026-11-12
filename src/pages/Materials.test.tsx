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
vi.mock("@/pages/MaterialSeriesBrowse", () => ({
  default: ({ slug }: { slug: string }) => <div>SERIES BROWSE: {slug}</div>,
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

  it("renders the series browse for ?series=", async () => {
    renderAt("/materials/?series=ciaa-annual-reports");
    expect(
      await screen.findByText("SERIES BROWSE: ciaa-annual-reports"),
    ).toBeTruthy();
  });

  it("redirects a bare ?q= to /search, so existing deep links survive", async () => {
    renderAt("/materials/?q=corruption");
    expect(await screen.findByText("SEARCH AT /search?type=material&q=corruption")).toBeTruthy();
  });

  it("carries every search param across, and nothing else", async () => {
    renderAt("/materials/?q=ujuri&tags=a&tags=b&sort=oldest&page=3&utm_source=x");
    expect(
      await screen.findByText("SEARCH AT /search?type=material&q=ujuri&tags=a&tags=b&sort=oldest&page=3"),
    ).toBeTruthy();
  });

  it("gives ?series= precedence over ?q=, which is the reverse of the old rule", async () => {
    // Before: the search API could not scope to a source, so a query meant the
    // whole archive and the series was carried along inert — a link reading
    // "search the CIAA annual reports" silently searched all 346k documents.
    renderAt("/materials/?series=ciaa-annual-reports&q=ujuri");

    expect(
      await screen.findByText("SERIES BROWSE: ciaa-annual-reports"),
    ).toBeTruthy();
    await waitFor(() => expect(screen.queryByText(/SEARCH AT/)).toBeNull());
  });

  it("also wins over the other search params a series view owns", async () => {
    renderAt("/materials/?series=charge-sheets&sort=oldest&page=2");
    expect(await screen.findByText("SERIES BROWSE: charge-sheets")).toBeTruthy();
  });
});
