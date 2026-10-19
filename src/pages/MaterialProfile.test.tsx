import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Material } from "@/services/datalake-api";

const getMaterial = vi.fn();
const listMaterialPages = vi.fn();
const getMaterialPage = vi.fn();
const getMaterialPageRange = vi.fn();
const listMaterialTables = vi.fn();
const getMaterialTable = vi.fn();
const listMaterialFigures = vi.fn();
vi.mock("@/services/datalake-api", () => ({
  getMaterial: (...args: unknown[]) => getMaterial(...args),
  listMaterialPages: (...args: unknown[]) => listMaterialPages(...args),
  getMaterialPage: (...args: unknown[]) => getMaterialPage(...args),
  getMaterialPageRange: (...args: unknown[]) => getMaterialPageRange(...args),
  MAX_PAGE_SPAN: 50,
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

    // The listing names the chart; its numbers arrive only once the row opens.
    const row = await screen.findByRole("button", { name: /उजुरीको संख्या/ });
    expect(screen.queryByText("19,580")).toBeNull();

    fireEvent.click(row);
    expect(await screen.findByText("19,580")).toBeTruthy();
    expect(screen.getByText("19,488")).toBeTruthy();
  });

  it("marks a chart-read value and says what the marker means", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Charts/ }));
    fireEvent.click(await screen.findByRole("button", { name: /उजुरीको संख्या/ }));

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

  it("does not list the document's pages — those are the transcript", async () => {
    // 446 page stubs beside 145 tables buried the two things this tab exists to
    // expose, and a transcript is read continuously rather than unfolded a row
    // at a time. The pages have their own reader.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    await screen.findByRole("heading", { name: /^Tables/ });

    expect(screen.queryByRole("heading", { name: /^Pages/ })).toBeNull();
    expect(listMaterialPages).not.toHaveBeenCalled();
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
    fireEvent.click(
      await screen.findByRole("button", { name: /आयोग स्थापनादेखि/ }),
    );
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
    // Two listings is two requests. A reader who came for one table must not
    // pay for every chart in the report to get it.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    await screen.findByRole("heading", { name: /^Tables/ });

    expect(listMaterialTables).not.toHaveBeenCalled();
    expect(listMaterialFigures).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^Tables/ }));
    await screen.findByRole("button", { name: /तालिका २\.१/ });
    expect(listMaterialTables).toHaveBeenCalledWith("ag/116707");
    // Opening one section must not pull the other in with it.
    expect(listMaterialFigures).not.toHaveBeenCalled();
  });

  it("titles each section without a count competing with it", async () => {
    // The counts still ride on the material payload — they size the loading
    // placeholder and decide whether a section exists — but a number beside the
    // title competed with the titles themselves for the reader's eye.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));

    const tables = await screen.findByRole("heading", { name: /^Tables/ });
    expect(tables.textContent?.trim()).toBe("Tables");
    expect(
      screen.getByRole("heading", { name: /^Charts/ }).textContent?.trim(),
    ).toBe("Charts");
    expect(listMaterialTables).not.toHaveBeenCalled();
  });

  it("opens a table in place, and offers its own page beside the page number", async () => {
    // Both halves matter. A row that navigated would charge a reader a page
    // load for a glance at one of 145 tables; a table with no address would
    // leave a finding in a government report uncitable. So: disclosure to
    // read, explicit link to cite.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    listMaterialTables.mockResolvedValue(TABLES);
    getMaterialTable.mockResolvedValue({ ...TABLES[0], markdown: "| a |\n| 1 |" });
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Tables/ }));

    const row = await screen.findByRole("button", { name: /तालिका २\.१/ });
    // The row itself expands in place — a reader after one glance at one of
    // 145 tables pays no page load.
    expect(row.tagName).toBe("BUTTON");

    // ...and the icon beside the page number opens it on its own page. A
    // sibling of the disclosure, never nested inside it: an anchor inside a
    // button is invalid and browsers make one of the two unclickable.
    const openLink = screen.getByRole("link", { name: /Open .* at full size/i });
    expect(row.contains(openLink)).toBe(false);
    // Addressed by KEY, never ordinal: ordinals are recomputed on every ingest.
    expect(openLink.getAttribute("href")).toContain("table=p0018-t1");
  });

  it("puts each row's page number on the right, table-of-contents style", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    listMaterialTables.mockResolvedValue(TABLES);
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Tables/ }));

    const button = await screen.findByRole("button", { name: /तालिका २\.१/ });
    const row = button.closest("li")!;
    // Title, then the page number in its own right-hand column, then the
    // affordance that opens it full size — rather than a "page 18 · 9×4" line
    // under the title.
    const kids = [...row.children];
    const pageCell = kids.find((el) => el.textContent?.trim() === "page 18")!;
    expect(pageCell).toBeTruthy();
    // Carried for a screen reader, which gets no help from the column.
    expect(pageCell.querySelector(".sr-only")?.textContent).toBe("page ");
    // The open affordance sits AFTER the number, not before it.
    const openEl = kids.find((el) => el.tagName === "A")!;
    expect(kids.indexOf(openEl)).toBeGreaterThan(kids.indexOf(pageCell));
    // The table's shape is not advertised before anyone has opened it.
    expect(row.textContent).not.toMatch(/9×4/);
  });

  it("offers a chart its own page too, the same as a table", async () => {
    // A chart in a government report is a claim about public money. The
    // argument for an address is the same one tables got: an uncitable claim
    // is one nobody can check.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    listMaterialFigures.mockResolvedValue(FIGURES);
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^Charts/ }));

    const open = await screen.findByRole("link", {
      name: /Open .* at full size/i,
    });
    // Keyed on `key`, never `ordinal`.
    expect(open.getAttribute("href")).toContain("figure=p0018-f1");
  });

  it("gives the Charts section an icon, like every other section", async () => {
    // A section without one read as a different kind of thing from its
    // neighbours. The icon is inside the heading's button.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Contents/i }));

    const charts = await screen.findByRole("button", { name: /^Charts/ });
    const tables = screen.getByRole("button", { name: /^Tables/ });
    // Each section button holds a chevron plus its own icon.
    expect(charts.querySelectorAll("svg").length).toBe(
      tables.querySelectorAll("svg").length,
    );
  });
});

describe("MaterialProfile — the transcript reader", () => {
  const openReader = async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Read the transcript/i }));
  };

  it("reads a window of pages in ONE request, not one request per page", async () => {
    // The API serves an inclusive from/to range capped at 50. A 446-page report
    // read a page at a time would be 446 round trips.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    listMaterialPages.mockResolvedValue(PAGES);
    getMaterialPageRange.mockResolvedValue([
      { ...PAGES[0], text: "समेत गरी जम्मा ३७,०२६ वटा उजुरीहरूको दर्ता कायम भएको छ।" },
      { ...PAGES[1], text: "" },
      { ...PAGES[2], text: "" },
    ]);
    await openReader();

    expect(await screen.findByText(/३७,०२६/)).toBeTruthy();
    expect(getMaterialPageRange).toHaveBeenCalledTimes(1);
    expect(getMaterialPage).not.toHaveBeenCalled();
    // The window is anchored to the document's first folio, not to 1.
    expect(getMaterialPageRange).toHaveBeenCalledWith("ag/116707", 18, 20);
  });

  it("says a page was unreadable rather than letting it pass for blank", async () => {
    // The distinction the whole feature turns on: an empty transcript is a
    // statement about our OCR, not about the page. Rendering both as nothing
    // reports a failure to read as an absence of content.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    // Only the unreadable page, so the assertion cannot be satisfied by some
    // other page that merely failed to load.
    listMaterialPages.mockResolvedValue([PAGES[1]]);
    getMaterialPageRange.mockResolvedValue([{ ...PAGES[1], text: "" }]);
    await openReader();

    expect(await screen.findByText(/could not read it/i)).toBeTruthy();
  });

  it("distinguishes a genuinely blank page from an unread one", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    listMaterialPages.mockResolvedValue([PAGES[2]]);
    getMaterialPageRange.mockResolvedValue([{ ...PAGES[2], text: "" }]);
    await openReader();

    expect(await screen.findByText(/blank in the source document/i)).toBeTruthy();
  });

  it("never calls a page blank over text it is showing", async () => {
    // Upstream marks some pages `blank` that nonetheless carry text — 2 of the
    // 446 in the 35th CIAA report, one of them 253 characters. coverage_state
    // may only explain an ABSENCE; printed above visible text it contradicts
    // the evidence on screen and discredits the label everywhere else.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    listMaterialPages.mockResolvedValue([PAGES[2]]);
    getMaterialPageRange.mockResolvedValue([
      { ...PAGES[2], text: "हाम्रो चाहना : स्वच्छ, पारदर्शी राज्य संयन्त्रको स्थापना" },
    ]);
    await openReader();

    expect(await screen.findByText(/हाम्रो चाहना/)).toBeTruthy();
    expect(screen.queryByText(/blank in the source/i)).toBeNull();
  });

  it("carries the dataset credit the licence requires", async () => {
    // CC BY-NC 4.0 requires attribution that NAMES the work, so the dataset is
    // spelled out rather than linked by host.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    listMaterialPages.mockResolvedValue(PAGES);
    getMaterialPageRange.mockResolvedValue([{ ...PAGES[0], text: "text" }]);
    await openReader();

    const link = await screen.findByRole("link", {
      name: /damo-da\/ciaa-annual-reports/,
    });
    expect(link.getAttribute("href")).toContain("huggingface.co/datasets");
  });

  it("quotes the API's own pages_read rather than recounting the stubs", async () => {
    // pages_read is not pages, and it is denormalised from the upstream row.
    // Recounting readable stubs here would answer 1 where the rest of the site
    // says 2 — a second source of truth, free to drift from the first.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    listMaterialPages.mockResolvedValue(PAGES);
    getMaterialPageRange.mockResolvedValue([{ ...PAGES[0], text: "text" }]);
    await openReader();

    await screen.findByLabelText(/Go to page/i);
    // Broken across text nodes, so match on the containing element.
    expect(
      screen
        .getAllByText(/pages readable/i)
        .some((el) => el.textContent?.includes("2 of 3 pages readable")),
    ).toBe(true);
  });
});

describe("MaterialProfile — reaching the transcript", () => {
  it("offers a way into the transcript from the downloads aside", async () => {
    // The aside is where a reader is already looking for the PDF, and the
    // transcript is the same kind of action: open this document and read it.
    getMaterial.mockResolvedValue(material({ "jawafdehi:content": SUMMARY }));
    listMaterialPages.mockResolvedValue(PAGES);
    getMaterialPageRange.mockResolvedValue([{ ...PAGES[0], text: "text" }]);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Read the transcript/i }));

    expect(await screen.findByLabelText(/Go to page/i)).toBeTruthy();
  });

  it("gives every download action the same width", async () => {
    // "Read the transcript" used to be the one w-full button beside an
    // inline-grid of content-width ones, so it alone ran wider.
    getMaterial.mockResolvedValue(
      material({ "jawafdehi:content": SUMMARY, url: "https://ciaa.gov.np/x" }),
    );
    renderPage();

    const transcript = await screen.findByRole("button", {
      name: /Read the transcript/i,
    });
    const original = screen.getByRole("link", { name: /Original source/i });
    expect(transcript.className).toBe(original.className);
    // ...and they are siblings in one grid, which is what makes that true.
    expect(transcript.parentElement).toBe(original.parentElement);
  });

  it("does not offer it when nothing has been transcribed", async () => {
    // Holding a document is not having read it; the button would promise text
    // that does not exist.
    getMaterial.mockResolvedValue(
      material({ "jawafdehi:content": { ...SUMMARY, pages_read: 0 } }),
    );
    renderPage();
    await screen.findByRole("tab", { name: /Contents/i });

    expect(screen.queryByRole("button", { name: /Read the transcript/i })).toBeNull();
  });
});
