import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigationType } from "react-router-dom";
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
import { filedRow } from "@/data/archive-folders.fixtures";

let location = "";
let entries: string[] = [];
function Probe() {
  const here = useLocation();
  const type = useNavigationType();
  location = `${here.search}${here.hash}`;
  // Rebuild the stack the way the history does: PUSH adds, REPLACE swaps the top.
  if (type === "PUSH") entries = [...entries, location];
  else if (type === "REPLACE") entries = [...entries.slice(0, -1), location];
  else if (!entries.length) entries = [location];
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
  entries = [];
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
      // Shelves are drawn only for sources the catalogue lists (JAW-87).
      { source: "legal_corpus", name: { en: "Laws and bills" }, publisher: null, labelled: true, count: 758 },
      { source: "dri", name: { en: "Revenue Investigation" }, publisher: null, labelled: true, count: 160 },
    ].map(filedRow),
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

  it("keeps View all reachable on a phone in the List view", async () => {
    renderAt("/materials/?view=list&path=judiciary/supreme-court", { phone: true });
    const links = await screen.findAllByRole("link", { name: /View all/ });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link.className).not.toMatch(/\bhidden\b/);
  });

  it("goes back from a series preview to its office's list on a phone", async () => {
    renderAt("/materials/?view=columns&path=judiciary/supreme-court/supreme-court-precedents", { phone: true });
    const view = () => document.querySelector("[data-archive-view]") as HTMLElement;
    await waitFor(() => expect(within(view()).getByRole("button", { name: /Supreme Court/ })).toBeTruthy());
    fireEvent.click(within(view()).getByRole("button", { name: /Supreme Court/ }));
    await waitFor(() => expect(location).toBe("?view=columns&path=judiciary/supreme-court#archive"));
    // …and from there up one folder.
    fireEvent.click(await within(view()).findByRole("button", { name: /Judiciary/ }));
    await waitFor(() => expect(location).toBe("?view=columns&path=judiciary#archive"));
  });

  it("keeps keyboard focus inside the phone Columns view while moving and drilling down", async () => {
    renderAt("/materials/?view=columns", { phone: true });
    const first = await screen.findByRole("option", { name: /Government bodies/ });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    // Arrows only move focus on a phone: nothing drilled, focus on the next row.
    expect(location).toBe("?view=columns");
    expect((document.activeElement as HTMLElement).getAttribute("data-node")).toBe("laws");
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Enter" });
    await waitFor(() => expect(location).toContain("path=laws"));
    // Focus lands on the first row of the column now shown, not on the body.
    await waitFor(() => expect(document.activeElement?.getAttribute("role")).toBe("option"));
  });

  it("moves focus into a series preview on a phone, and Left goes back", async () => {
    renderAt("/materials/?view=columns&path=judiciary/supreme-court", { phone: true });
    const row = await screen.findByRole("option", { name: /Precedents/ });
    row.focus();
    fireEvent.keyDown(row, { key: "Enter" });
    await waitFor(() => expect(document.activeElement?.textContent).toMatch(/View all/));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "ArrowLeft" });
    await waitFor(() => expect(location).toBe("?view=columns&path=judiciary/supreme-court#archive"));
  });

  it("keeps focus in the Icons grid when a folder opens and when going up", async () => {
    renderAt("/materials/?view=icons");
    const judiciary = await screen.findByRole("button", { name: /Judiciary/ });
    judiciary.focus();
    fireEvent.click(judiciary);
    await waitFor(() => expect(location).toContain("path=judiciary"));
    await waitFor(() => expect(document.activeElement?.hasAttribute("data-item")).toBe(true));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Backspace" });
    await waitFor(() => expect(location).not.toContain("path="));
    await waitFor(() => expect(document.activeElement?.hasAttribute("data-item")).toBe(true));
  });

  it("adds a history entry per level when drilling into folders by keyboard on desktop", async () => {
    renderAt("/materials/?view=columns&path=judiciary");
    // Shelves are placed by the catalogue's folders, so wait until it is in.
    await screen.findByRole("option", { name: /Supreme Court/ });
    const row = await screen.findByRole("option", { name: /Judiciary/ });
    row.focus();
    fireEvent.keyDown(row, { key: "ArrowRight" });
    await waitFor(() => expect(location).toContain("path=judiciary/"));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "ArrowDown" });
    await waitFor(() => expect(entries.length).toBe(2));
    // ArrowRight pushed one entry; ArrowDown within the column replaced it.
    expect(entries[0]).toContain("path=judiciary");
  });
});
