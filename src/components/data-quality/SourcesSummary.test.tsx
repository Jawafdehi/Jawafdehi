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
import { splitColumns } from "@/lib/coverage-rows";
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
    expect(summary.textContent).toContain('"folders":"7"');

    // Every top-level folder of the /materials archive, in its fixed order, with its
    // live count, each linking into that folder in place.
    const rows = screen.getAllByRole("listitem");
    const folders = rows
      .filter((item) => item.getAttribute("data-depth") === "0")
      .map((item) => item.textContent);
    expect(folders).toEqual([
      "Judiciary53,842",
      "Government bodies3,09,323",
      "Parliament0",
      "Laws0",
      "News0",
      "International0",
      "Others0",
    ]);
    expect(screen.getByRole("link", { name: /Government bodies/ }).getAttribute("href")).toBe(
      "/materials/?path=government#archive",
    );
    expect(screen.getByRole("link", { name: /seeAll/ }).getAttribute("href")).toBe("/materials/#archive");

    // Fully expanded: every office and series sits under its folder, indented,
    // with its own count, so the whole coverage table shows without a click.
    const text = rows.map((item) => item.textContent);
    const at = (label: string) => text.indexOf(label);
    expect(at("Office of the Attorney General99,673")).toBeGreaterThan(at("Government bodies3,09,323"));
    expect(at("Charge sheets99,673")).toBeGreaterThan(at("Office of the Attorney General99,673"));
    expect(at("Court orders43,288")).toBeGreaterThan(at("Judiciary53,842"));
    expect(at("Court orders43,288")).toBeLessThan(at("Government bodies3,09,323"));
    const office = rows[at("Office of the Attorney General99,673")];
    const series = rows[at("Charge sheets99,673")];
    expect(office.getAttribute("data-depth")).toBe("1");
    expect(series.getAttribute("data-depth")).toBe("2");
    expect(office.querySelector("a")?.getAttribute("href")).toMatch(/^\/materials\/\?path=government\/[^#]+#archive$/);
    expect(series.querySelector("a")?.getAttribute("href")).toMatch(/^\/search\?/);
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

  describe("splitColumns", () => {
    // depth list → rows; only depth matters to the split.
    const rows = (...depths: number[]) =>
      depths.map((depth, index) => ({ node: { slug: `n${index}` } as never, path: [`n${index}`], depth }));

    it("balances the columns and breaks only between offices", () => {
      // Folder A: 2 offices of 3 rows; folder B: 1 office of 3 rows.
      const split = splitColumns(rows(0, 1, 2, 2, 1, 2, 2, 0, 1, 2, 2));
      // 11 rows: 4 | 7 and 7 | 4 are equally balanced; the earlier break wins.
      expect(split.at).toBe(4);
      expect(split.continues?.path).toEqual(["n0"]);
    });

    it("never parts a folder heading from its first office", () => {
      const split = splitColumns(rows(0, 1, 2, 2, 2, 0, 1, 2, 2, 2));
      expect(split.at).toBe(5);
      expect(split.continues).toBeNull();
    });

    it("keeps one column when there is nowhere to break", () => {
      expect(splitColumns(rows(0, 1, 2, 2))).toEqual({ at: 4, continues: null });
    });
  });
});
