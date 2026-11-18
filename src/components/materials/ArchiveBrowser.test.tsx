import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getDocumentSources = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (key: string, fallback?: string) => (typeof fallback === "string" ? fallback : key),
  }),
}));
vi.mock("@/services/jds-api", () => ({ getDocumentSources: () => getDocumentSources() }));
vi.mock("@/services/search-api", () => ({
  searchArchive: vi.fn().mockResolvedValue({ results: [], count: 0 }),
}));

import { ArchiveBrowser } from "@/components/materials/ArchiveBrowser";

let location = "";
function Probe() {
  const here = useLocation();
  location = `${here.search}${here.hash}`;
  return null;
}

function renderAt(url: string, { phone = false } = {}) {
  window.innerWidth = phone ? 390 : 1280;
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Probe />
        <ArchiveBrowser />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
  Element.prototype.scrollIntoView = vi.fn();
  getDocumentSources.mockResolvedValue({
    ready: true,
    sources: [
      { source: "nkp", name: { en: "Precedents" }, publisher: null, labelled: true, count: 10_554 },
      { source: "court_order", name: { en: "Court orders" }, publisher: null, labelled: true, count: 43_332 },
    ],
  });
});

describe("ArchiveBrowser", () => {
  it("opens in Columns on desktop and List on a phone", async () => {
    const desktop = renderAt("/materials/");
    await waitFor(() =>
      expect(document.querySelector("[data-archive-view]")?.getAttribute("data-archive-view")).toBe("columns"),
    );
    desktop.unmount();
    renderAt("/materials/", { phone: true });
    await waitFor(() =>
      expect(document.querySelector("[data-archive-view]")?.getAttribute("data-archive-view")).toBe("list"),
    );
  });

  it("restores the view and selection from the URL, and moves in place", async () => {
    renderAt("/materials/?view=columns&path=judiciary");
    // Root column plus Judiciary's contents.
    await waitFor(() => expect(screen.getAllByRole("listbox")).toHaveLength(2));
    expect(screen.getByRole("option", { name: /Supreme Court/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("option", { name: /Supreme Court/ }));
    await waitFor(() => expect(location).toBe("?view=columns&path=judiciary/supreme-court#archive"));
    expect(screen.getAllByRole("listbox")).toHaveLength(3);
  });

  it("shows a series' preview with a View all link that leaves for its listing", async () => {
    renderAt("/materials/?view=columns&path=judiciary/supreme-court/supreme-court-precedents");
    const link = await screen.findByRole("link", { name: /View all/ });
    expect(link.getAttribute("href")).toBe("/materials/?series=supreme-court-precedents");
    await waitFor(() => expect(document.querySelector("[data-preview]")?.textContent).toContain("10,554"));
  });

  it("switches views, marks the pressed one and remembers it", async () => {
    renderAt("/materials/?view=columns");
    const icons = await screen.findByRole("button", { name: /^icons$/i });
    fireEvent.click(icons);
    await waitFor(() => expect(location).toContain("view=icons"));
    expect(icons.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /^columns$/i }).getAttribute("aria-pressed")).toBe("false");
    expect(window.localStorage.getItem("jawafdehi.archiveView")).toBe("icons");
    // Opening a folder in Icons stays on the page and updates the path.
    fireEvent.click(await screen.findByRole("button", { name: /Judiciary/ }));
    await waitFor(() => expect(location).toContain("path=judiciary"));
  });

  it("expands a folder in the List view's tree in place", async () => {
    renderAt("/materials/?view=list");
    const judiciary = await screen.findByRole("treeitem", { name: /Judiciary/ });
    expect(judiciary.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(judiciary);
    await waitFor(() => expect(judiciary.getAttribute("aria-expanded")).toBe("true"));
    expect(screen.getByRole("treeitem", { name: /Supreme Court/ })).toBeTruthy();
  });
});
