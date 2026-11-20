import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const getDocumentSources = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (key: string, values?: Record<string, unknown>) =>
      values && typeof values === "object" ? `${key} ${JSON.stringify(values)}` : key,
  }),
}));
vi.mock("@/services/jds-api", () => ({ getDocumentSources: () => getDocumentSources() }));

import { SourcesSummary } from "@/components/data-quality/SourcesSummary";
import { filedRow } from "@/data/archive-folders.fixtures";

const row = (source: string, publisher: string | null, count: number) =>
  filedRow({
    source,
    name: { en: `${source} name` },
    publisher: publisher ? { en: publisher } : null,
    labelled: true,
    count,
  });

// /data-quality no longer keeps its own table of sources: it summarises the
// archive folders on /materials, from the same catalogue, and links into them.
describe("SourcesSummary", () => {
  it("states the totals and lists every archive folder with its count and link", async () => {
    getDocumentSources.mockResolvedValue({
      ready: true,
      sources: [
        row("bolpatra", "PPMO", 205_826),
        row("ppmo", "PPMO", 108),
        row("ag", "Office of the Attorney General", 99_673),
        row("court_order", null, 43_288),
        row("nkp", "Supreme Court", 10_554),
        row("ciaa_press_release", "CIAA", 3_556),
        row("dri", "Department of Revenue Investigation", 160),
        { ...row("mystery", null, 4), labelled: false, name: null },
      ],
    });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <SourcesSummary />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const summary = await screen.findByText(/dataQuality.materialsBySource.summary/);
    expect(summary.textContent).toContain('"total":"3,63,169"');
    expect(summary.textContent).toContain('"sources":"7"');
    expect(summary.textContent).toContain('"folders":"6"');

    // Every top-level folder of the /materials archive, in its fixed order, with its
    // live count, each linking into that folder in place.
    const folders = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(folders).toEqual([
      "Judiciary53,842",
      "Government bodies3,09,323",
      "Laws0",
      "News0",
      "International0",
      "Others0",
    ]);
    expect(screen.getByRole("link", { name: /Government bodies/ }).getAttribute("href")).toBe(
      "/materials/?path=government#archive",
    );
    expect(screen.getByRole("link", { name: /seeAll/ }).getAttribute("href")).toBe("/materials/#archive");
  });

  it("renders nothing until the catalogue arrives", () => {
    getDocumentSources.mockReturnValue(new Promise(() => {}));
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <SourcesSummary />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(container.textContent).toBe("");
  });
});
