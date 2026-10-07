import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Material } from "@/services/datalake-api";

const getMaterial = vi.fn();
const getMaterialExtraction = vi.fn();
const getMaterialExtractionTable = vi.fn();
vi.mock("@/services/datalake-api", () => ({
  getMaterial: (...args: unknown[]) => getMaterial(...args),
  getMaterialExtraction: (...args: unknown[]) => getMaterialExtraction(...args),
  getMaterialExtractionTable: (...args: unknown[]) =>
    getMaterialExtractionTable(...args),
}));

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
  getMaterialExtraction.mockReset().mockResolvedValue(null);
  getMaterialExtractionTable.mockReset();
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

  it("leaves a non-URL detail field as plain text", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:recordId": "116707" }));
    renderPage();
    expect(await screen.findByText("116707")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /116707/ })).toBeNull();
  });
});

const EXTRACTION = {
  material: "https://jawafdehi.org/material/ag/116707",
  provenance: {
    dataset: "damo-da/ciaa-annual-reports",
    dataset_revision: "abc1234def",
    doc_id: "ciaa-2074-75",
    page_count: 255,
    text_source: "likhit",
    transcript_verdict: "clean",
    figures_verdict: "trustworthy",
    ingested_at: "2026-10-07T00:00:00Z",
  },
  counts: { tables: 1, figures: 1, points: 2 },
  tables: [
    {
      ordinal: 1,
      key: "p0018-t1",
      uid: "ciaa-2074-75#p0018#t1",
      page_no: 18,
      caption: "तालिका २.१ आयोगमा दर्ता भएका उजुरीको संख्या",
      header: ["आ.व.", "संख्या"],
      n_rows: 9,
      n_cols: 4,
      fidelity: "tight",
    },
  ],
  figures: [
    {
      ordinal: 1,
      key: "p0018-f1",
      uid: "ciaa-2074-75#p0018#f1",
      page_no: 18,
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
  ],
};

describe("MaterialProfile — the Tables & charts tab", () => {
  it("is absent when the material has nothing extracted", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:recordId": "116707" }));
    renderPage();
    await screen.findByText("116707");
    // Most materials are a single scraped page. The tab must not appear at all
    // rather than open onto an empty state.
    expect(screen.queryByRole("tab", { name: /Tables & charts/i })).toBeNull();
  });

  it("appears and renders the chart's numbers when there is an extraction", async () => {
    getMaterial.mockResolvedValue(material({}));
    getMaterialExtraction.mockResolvedValue(EXTRACTION);
    renderPage();

    const tab = await screen.findByRole("tab", { name: /Tables & charts/i });
    fireEvent.mouseDown(tab);

    expect(await screen.findByText("उजुरीको संख्या")).toBeTruthy();
    expect(screen.getByText("19,580")).toBeTruthy();
    expect(screen.getByText("19,488")).toBeTruthy();
  });

  it("marks a chart-read value and says what the marker means", async () => {
    getMaterial.mockResolvedValue(material({}));
    getMaterialExtraction.mockResolvedValue(EXTRACTION);
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Tables & charts/i }));

    // A value read off the image is a weaker claim than a printed one; rendering
    // them identically would launder a guess into a fact.
    await screen.findByText("19,488");
    expect(screen.getByText(/read from the chart image/i)).toBeTruthy();
    const estimated = screen.getByTitle(/not a printed figure/i);
    expect(estimated).toBeTruthy();
  });

  it("fetches a table's markdown only once the reader opens it", async () => {
    getMaterial.mockResolvedValue(material({}));
    getMaterialExtraction.mockResolvedValue(EXTRACTION);
    getMaterialExtractionTable.mockResolvedValue({
      ...EXTRACTION.tables[0],
      markdown: "| आ.व. | संख्या |\n| --- | --- |\n| २०७४/७५ | १९४८८ |",
    });
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Tables & charts/i }));

    const toggle = await screen.findByRole("button", {
      name: /तालिका २\.१/,
    });
    // One report's tables run to hundreds of KiB, so nothing is fetched up front.
    expect(getMaterialExtractionTable).not.toHaveBeenCalled();

    fireEvent.click(toggle);
    expect(await screen.findByText("१९४८८")).toBeTruthy();
    expect(getMaterialExtractionTable).toHaveBeenCalledWith("ag/116707", "p0018-t1");
  });

  it("credits the dataset the data came from", async () => {
    getMaterial.mockResolvedValue(material({}));
    getMaterialExtraction.mockResolvedValue(EXTRACTION);
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Tables & charts/i }));

    const link = await screen.findByRole("link", {
      name: /damo-da\/ciaa-annual-reports/,
    });
    expect(link.getAttribute("href")).toContain("huggingface.co/datasets");
  });
});

describe("MaterialProfile — a very large extracted table", () => {
  it("caps the rows it renders and offers the rest behind a control", async () => {
    // The widest table in the CIAA corpus is 2,979 rows by 65 columns. Rendering
    // that grid outright is ~190k DOM cells and locks the tab up.
    const rows = Array.from({ length: 300 }, (_, i) => `| row${i} | ${i} |`).join("\n");
    getMaterial.mockResolvedValue(material({}));
    getMaterialExtraction.mockResolvedValue(EXTRACTION);
    getMaterialExtractionTable.mockResolvedValue({
      ...EXTRACTION.tables[0],
      markdown: `| a | b |\n| --- | --- |\n${rows}`,
    });
    renderPage();
    fireEvent.mouseDown(await screen.findByRole("tab", { name: /Tables & charts/i }));
    fireEvent.click(await screen.findByRole("button", { name: /तालिका २\.१/ }));

    expect(await screen.findByText("row0")).toBeTruthy();
    expect(screen.getByText("row49")).toBeTruthy();
    expect(screen.queryByText("row50")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Show all 300 rows/i }));
    expect(await screen.findByText("row299")).toBeTruthy();
  });
});
