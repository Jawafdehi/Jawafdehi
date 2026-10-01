import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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
vi.mock("@/pages/ArchiveSearch", () => ({
  default: () => <div>ARCHIVE SEARCH</div>,
}));
vi.mock("@/pages/MaterialSeriesBrowse", () => ({
  default: ({ slug }: { slug: string }) => <div>SERIES BROWSE: {slug}</div>,
}));

import Materials from "@/pages/Materials";

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/materials/" element={<Materials />} />
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

  it("keeps a bare ?q= on the archive search, so existing deep links survive", async () => {
    renderAt("/materials/?q=corruption");
    expect(await screen.findByText("ARCHIVE SEARCH")).toBeTruthy();
  });

  it("gives ?series= precedence over ?q=, which is the reverse of the old rule", async () => {
    // Before: the search API could not scope to a source, so a query meant the
    // whole archive and the series was carried along inert — a link reading
    // "search the CIAA annual reports" silently searched all 346k documents.
    renderAt("/materials/?series=ciaa-annual-reports&q=ujuri");

    expect(
      await screen.findByText("SERIES BROWSE: ciaa-annual-reports"),
    ).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("ARCHIVE SEARCH")).toBeNull());
  });

  it("also wins over the other search params a series view owns", async () => {
    renderAt("/materials/?series=charge-sheets&sort=oldest&page=2");
    expect(await screen.findByText("SERIES BROWSE: charge-sheets")).toBeTruthy();
  });
});
