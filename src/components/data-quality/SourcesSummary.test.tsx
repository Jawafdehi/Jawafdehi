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

const row = (source: string, publisher: string | null, count: number) => ({
  source,
  name: { en: `${source} name` },
  publisher: publisher ? { en: publisher } : null,
  labelled: true,
  count,
});

// /data-quality no longer keeps its own table of sources: it summarises the one
// list on /materials#sources, from the same catalogue, and links to it.
describe("SourcesSummary", () => {
  it("states the totals, names the five largest offices and links to the full list", async () => {
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
    expect(summary.textContent).toContain('"publishers":"6"');

    const offices = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(offices).toEqual([
      "PPMO2,05,934",
      "Office of the Attorney General99,673",
      "court_order name43,288",
      "Supreme Court10,554",
      "CIAA3,556",
    ]);
    expect(
      screen.getByRole("link", { name: /seeAll/ }).getAttribute("href"),
    ).toBe("/materials/#sources");
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
