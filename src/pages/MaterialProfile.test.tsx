import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Material } from "@/services/datalake-api";

const getMaterial = vi.fn();
const listMaterialPages = vi.fn();
const getMaterialPage = vi.fn();
const listMaterialTables = vi.fn();
const getMaterialTable = vi.fn();
const listMaterialFigures = vi.fn();
vi.mock("@/services/datalake-api", () => ({
  getMaterial: (...args: unknown[]) => getMaterial(...args),
  listMaterialPages: (...args: unknown[]) => listMaterialPages(...args),
  getMaterialPage: (...args: unknown[]) => getMaterialPage(...args),
  listMaterialTables: (...args: unknown[]) => listMaterialTables(...args),
  getMaterialTable: (...args: unknown[]) => getMaterialTable(...args),
  listMaterialFigures: (...args: unknown[]) => listMaterialFigures(...args),
}));

// recharts' ResponsiveContainer measures its container and jsdom has no
// ResizeObserver; same inert stub as StreamField.test.tsx. The charts render at
// zero size here, which is fine — these tests assert on the table and the
// markers, and the chart itself carries an aria-label rather than content.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

// Isolate MaterialProfile's own rendering from the shared dialog/button widgets.
vi.mock("@/components/ViewJsonButton", () => ({ ViewJsonButton: () => null }));
vi.mock("@/components/DocumentPreviewDialog", () => ({ DocumentPreviewDialog: () => null }));

import MaterialProfile from "@/pages/MaterialProfile";

// A real AG source URL: one long, unbroken, percent-encoded string — the shape
// that overflows its grid cell and overlaps the neighbouring field.
const LONG_URL =
  "https://ag.gov.np/storage/abhiyogPatra/" +
  "%E0%A5%A6%E0%A5%AE%E0%A5%A8-FT-%E0%A5%A6%E0%A5%AA%E0%A5%AB%E0%A5%AF_1782114350.pdf";

const material = (extra: Record<string, unknown>): Material =>
  ({
    "@id": "https://jawafdehi.org/material/ag/116707",
    "@type": "CreativeWork",
    name: { en: "Abhiyog patra", ne: "" },
    ...extra,
  }) as Material;

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/material/ag/116707"]}>
          <Routes>
            <Route path="/material/*" element={<MaterialProfile />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

beforeEach(() => {
  getMaterial.mockReset();
  // The overwhelmingly common case: a material with nothing extracted from it.
  listMaterialPages.mockReset().mockResolvedValue(PAGES);
  getMaterialPage.mockReset();
  listMaterialTables.mockReset().mockResolvedValue(TABLES);
  getMaterialTable.mockReset();
  listMaterialFigures.mockReset().mockResolvedValue(FIGURES);
});

describe("MaterialProfile — overflow-safe rendering", () => {
  it("renders a long source URL as a compact host link, not raw percent-encoded text", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:sourceUrl": LONG_URL }));
    renderPage();

    const link = await screen.findByRole("link", { name: /ag\.gov\.np/i });
    expect(link.getAttribute("href")).toBe(LONG_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel") || "").toContain("noopener");
    expect(screen.queryByText(/%E0%A5/)).toBeNull();
  });

  it("wraps the document-text transcript so long unbroken runs stay inside the card on mobile", async () => {
    // Nepali transcripts carry dotted leaders (……………फरार) and long unbroken runs
    // that whitespace-pre-wrap alone will not break, overflowing the card on a
    // narrow (mobile) viewport. The paragraph must allow breaking inside a run.
    const longRun = "…".repeat(150) + "फरार";
    getMaterial.mockResolvedValue(material({ text: { ne: `TRANSCRIPT_MARKER ${longRun}` } }));
    renderPage();

    // Radix activates a tab on mousedown/focus, not on a synthetic click.
    fireEvent.mouseDown(await screen.findByRole("tab", { name: "Document text" }));
    const para = await screen.findByText(/TRANSCRIPT_MARKER/);
    expect(para.className).toMatch(/\bwhitespace-pre-wrap\b/); // keep formatting
    expect(para.className).toMatch(/\bbreak-words\b/); // but break over-long runs
  });

  it("keeps the schema.org isAccessibleForFree flag out of the Summary details", async () => {
    // The API stamps isAccessibleForFree: true on every material, so surfacing it
    // in the details grid just prints a constant "Is Accessible For Free — true".
    getMaterial.mockResolvedValue(
      material({ isAccessibleForFree: true, "jawafdehi:recordId": "116707" }),
    );
    renderPage();

    await screen.findByText("116707"); // details grid has rendered
    expect(screen.queryByText(/Is Accessible For Free/i)).toBeNull();
  });

  it("leaves a non-URL detail field as plain text", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:recordId": "116707" }));
    renderPage();
    expect(await screen.findByText("116707")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /116707/ })).toBeNull();
  });
});

const SUMMARY = {
  pages: 3,
  pages_read: 2,
  tables: 1,
  figures: 1,
  points: 2,
  provenance: {
    doc_id: "ciaa-2074-75",
    dataset: "damo-da/ciaa-annual-reports",
    dataset_revision: "abc1234def",
    text_source: "likhit",
    transcript_verdict: "clean",
    figures_verdict: "trustworthy",
    ingested_at: "2026-10-07T00:00:00Z",
  },
};

const PAGES = [
  {
    page_no: 18,
    uid: "ciaa-2074-75#p0018",
    coverage_state: "anchored",
    anchor_fidelity: "tight",
    ocr_source: "likhit",
    landscape: false,
    n_table_blocks: 1,
    chars: 1530,
  },
  // Held but unreadable. Its text comes back empty, and the UI must not let
  // that pass for a blank page.
  {
    page_no: 19,
    uid: "ciaa-2074-75#p0019",
    coverage_state: "ocr_unread",
    anchor_fidelity: "",
    ocr_source: "",
    landscape: false,
    n_table_blocks: 0,
    chars: 0,
  },
  {
    page_no: 20,
    uid: "ciaa-2074-75#p0020",
    coverage_state: "blank",
    anchor_fidelity: "",
    ocr_source: "",
    landscape: false,
    n_table_blocks: 0,
    chars: 0,
  },
];

const TABLES = [
  {
    ordinal: 1,
    key: "p0018-t1",
    uid: "ciaa-2074-75#p0018#t1",
    page_no: 18,
    index_on_page: 1,
    caption: "तालिका २.१ आयोगमा दर्ता भएका उजुरीको संख्या",
    header: ["आ.व.", "संख्या"],
    n_rows: 9,
    n_cols: 4,
    fidelity: "tight",
  },
];

const FIGURES = [
  {
    ordinal: 1,
    key: "p0018-f1",
    uid: "ciaa-2074-75#p0018#f1",
    page_no: 18,
    index_on_page: 1,
    title: "उजुरीको संख्या",
    chart_type: "bar",
    unit: "संख्या",
    x_axis: "",
    y_axis: "",
    notes: "Reconciled against अनुसूची-४ on p89.",
    verify_note: "",
    verified: true,
    points: [
      { point_index: 1, label: "२०७३/७४", series: "", value: 19580, estimated: false },
      { point_index: 2, label: "२०७४/७५", series: "", value: 19488, estimated: true },
    ],
  },
];

describe("MaterialProfile — the Contents tab", () => {
  it("is absent when the material has nothing extracted", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:recordId": "116707" }));
    renderPage();
    await screen.findByText("116707");
    // Most materials are a single scraped page. The tab must not appear at all
    // rather than open onto an empty state.
    expect(screen.queryByRole("tab", { name: /Contents/i })).toBeNull();
  });

  it("appears and renders the chart's numbers when there is an extraction", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    renderPage();

    const tab = await screen.findByRole("tab", { name: /Contents/i });
    fireEvent.mouseDown(tab);
    fireEvent.click(await screen.findByRole("button", { name: /^Charts/ }));

    expect(await screen.findByText("उजुरीको संख्या")).toBeTruthy();
    expect(screen.getByText("19,580")).toBeTruthy();
    expect(screen.getByText("19,488")).toBeTruthy();
  });

  it("marks a chart-read value and says what the marker means", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Charts/ }));

    // A value read off the image is a weaker claim than a printed one; rendering
    // them identically would launder a guess into a fact.
    await screen.findByText("19,488");
    expect(screen.getByText(/read from the chart image/i)).toBeTruthy();
    const estimated = screen.getByTitle(/not a printed figure/i);
    expect(estimated).toBeTruthy();
  });

  it("fetches a table's markdown only once the reader opens it", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    getMaterialTable.mockResolvedValue({
      ...TABLES[0],
      markdown: "| आ.व. | संख्या |\n| --- | --- |\n| २०७४/७५ | १९४८८ |",
    });
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Tables/ }));

    const toggle = await screen.findByRole("button", {
      name: /तालिका २\.१/,
    });
    // One report's tables run to hundreds of KiB, so nothing is fetched up front.
    expect(getMaterialTable).not.toHaveBeenCalled();

    fireEvent.click(toggle);
    expect(await screen.findByText("१९४८८")).toBeTruthy();
    expect(getMaterialTable).toHaveBeenCalledWith("ag/116707", "p0018-t1");
  });

  it("credits the dataset the data came from", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));

    const link = await screen.findByRole("link", {
      name: /damo-da\/ciaa-annual-reports/,
    });
    expect(link.getAttribute("href")).toContain("huggingface.co/datasets");
  });
});

describe("MaterialProfile — a very large table", () => {
  it("caps the rows it renders and offers the rest behind a control", async () => {
    // The widest table in the CIAA corpus is 2,979 rows by 65 columns. Rendering
    // that grid outright is ~190k DOM cells and locks the tab up.
    const rows = Array.from({ length: 300 }, (_, i) => `| row${i} | ${i} |`).join("\n");
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    getMaterialTable.mockResolvedValue({
      ...TABLES[0],
      markdown: `| a | b |\n| --- | --- |\n${rows}`,
    });
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Tables/ }));
    fireEvent.click(await screen.findByRole("button", { name: /तालिका २\.१/ }));

    expect(await screen.findByText("row0")).toBeTruthy();
    expect(screen.getByText("row49")).toBeTruthy();
    expect(screen.queryByText("row50")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Show all 300 rows/i }));
    expect(await screen.findByText("row299")).toBeTruthy();
  });
});

describe("MaterialProfile — a report with no charts at all", () => {
  it("renders the tables alone without an empty Charts heading", async () => {
    // Ten of the thirty-five CIAA annual reports contain no chart, and none
    // before BS 2055/56 does — a tables-only extraction is the normal shape for
    // the older half of the corpus, not an edge case.
    getMaterial.mockResolvedValue(
      material({
        "jawafdehi:content": { ...SUMMARY, figures: 0, points: 0 },
      }),
    );
    listMaterialFigures.mockResolvedValue([]);
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));

    // The section headings carry their counts, so match on the leading word.
    expect(await screen.findByRole("heading", { name: /^Tables/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /^Charts/ })).toBeNull();
    // The count sentence must not advertise chart data points it does not have.
    expect(screen.getByText(/0 charts were read out of this document\./)).toBeTruthy();
  });
});

describe("MaterialProfile — a figure whose axis fields are inverted", () => {
  it("leads the table with the fiscal year, not the repeated measure name", async () => {
    // ciaa-2081-82 p291 puts the MEASURE in `label` and the 35 fiscal years in
    // `series`, the opposite of every other chart of its kind in the corpus.
    // Trusting the field names printed "उजुरी सङ्ख्या" down 35 rows and demoted
    // the years to a muted secondary column.
    const years = ["२०४७/४८", "२०४८/४९", "२०४९/५०", "२०५०/५१"];
    const points = years.flatMap((year, i) => [
      {
        point_index: i * 2 + 1,
        label: "उजुरी सङ्ख्या",
        series: year,
        value: 100 * (i + 1),
        estimated: false,
      },
      {
        point_index: i * 2 + 2,
        label: "फछ्यौट सङ्ख्या",
        series: year,
        value: 50 * (i + 1),
        estimated: false,
      },
    ]);
    getMaterial.mockResolvedValue(
      material({
        "jawafdehi:content": { ...SUMMARY, tables: 0, points: points.length },
      }),
    );
    listMaterialTables.mockResolvedValue([]);
    listMaterialFigures.mockResolvedValue([
      {
        ...FIGURES[0],
        chart_type: "line",
        title: "आयोग स्थापनादेखि हालसम्मको उजुरी र फछ्यौटको प्रवृत्ति",
        points,
      },
    ]);
    renderPage();

    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Charts/ }));
    fireEvent.click(await screen.findByText("Show the numbers"));

    const firstCells = screen
      .getAllByRole("row")
      .map((row) => row.querySelector("td")?.textContent ?? "")
      .filter(Boolean);
    expect(firstCells[0]).toBe("२०४७/४८");
    expect(firstCells).not.toContain("उजुरी सङ्ख्या");
  });
});

describe("MaterialProfile — the Contents tab is a table of contents", () => {
  it("fetches nothing until a section is opened", async () => {
    // Three listings is three requests, and a 446-page report's pages ARE its
    // transcript. A reader who came for one table must not pay for all of it.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    await screen.findByRole("heading", { name: /^Pages/ });

    expect(listMaterialPages).not.toHaveBeenCalled();
    expect(listMaterialTables).not.toHaveBeenCalled();
    expect(listMaterialFigures).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^Pages/ }));
    await screen.findByRole("button", { name: /Page 18/ });
    expect(listMaterialPages).toHaveBeenCalledWith("ag/116707");
    // Opening one section must not pull the others in with it.
    expect(listMaterialTables).not.toHaveBeenCalled();
    expect(listMaterialFigures).not.toHaveBeenCalled();
  });

  it("labels each section from the counts before fetching anything", async () => {
    // The counts ride on the material payload, so the tab can describe itself
    // honestly without a request.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));

    const pages = await screen.findByRole("heading", { name: /^Pages/ });
    expect(pages.textContent).toContain("3");
    expect(screen.getByRole("heading", { name: /^Tables/ }).textContent).toContain("1");
    expect(listMaterialPages).not.toHaveBeenCalled();
  });

  it("fetches a page's text only when that page is opened", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    getMaterialPage.mockResolvedValue({
      ...PAGES[0],
      text: "समेत गरी जम्मा ३७,०२६ वटा उजुरीहरूको दर्ता कायम भएको छ।",
    });
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Pages/ }));

    const row = await screen.findByRole("button", { name: /Page 18/ });
    expect(getMaterialPage).not.toHaveBeenCalled();

    fireEvent.click(row);
    expect(await screen.findByText(/३७,०२६/)).toBeTruthy();
    expect(getMaterialPage).toHaveBeenCalledWith("ag/116707", 18);
  });

  it("says a page was unreadable rather than letting it pass for blank", async () => {
    // The distinction the whole panel turns on: an empty transcript is a
    // statement about our OCR, not about the page. Rendering both as nothing
    // reports a failure to read as an absence of content.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    getMaterialPage.mockResolvedValue({ ...PAGES[1], text: "" });
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Pages/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Page 19/ }));

    expect(await screen.findByText(/could not read it/i)).toBeTruthy();
  });

  it("distinguishes a genuinely blank page from an unread one", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    getMaterialPage.mockResolvedValue({ ...PAGES[2], text: "" });
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Pages/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Page 20/ }));

    expect(await screen.findByText(/blank in the source document/i)).toBeTruthy();
  });

  it("warns up front how many pages could not be read", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Pages/ }));

    // 3 pages, 2 read.
    expect(await screen.findByText(/1 of these pages could not be read/i)).toBeTruthy();
  });
});
