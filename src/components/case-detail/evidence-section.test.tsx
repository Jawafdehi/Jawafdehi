import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { EvidenceSection } from "@/components/case-detail/evidence-section";
import type { EvidenceEntry, SourceLink } from "@/types/jds";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts && "n" in opts ? `${key}:${opts.n}` : key),
    i18n: { language: "en" },
  }),
}));

const OUR = "https://s3.jawafdehi.org/case_uploads/";

const entry = (
  n: number,
  materialType: string,
  extra: Partial<NonNullable<EvidenceEntry["material"]>> = {},
): EvidenceEntry => ({
  material_iri: `https://jawafdehi.org/material/${materialType}/${n}`,
  additional_details: ".",
  material: { display_name: `Source ${n} (2080 Magh ${n})`, material_type: materialType, urls: [], ...extra },
});

const link = (name: string) => screen.queryByRole("link", { name });

const renderSection = (evidence: EvidenceEntry[]) =>
  render(
    <MemoryRouter>
      <EvidenceSection evidence={evidence} title="Evidence" />
    </MemoryRouter>,
  );

describe("EvidenceSection", () => {
  it("groups sources by type and collapses long groups", () => {
    const evidence = [
      ...Array.from({ length: 8 }, (_, i) => entry(i + 1, "document")),
      entry(20, "court_order"),
      entry(21, "news"),
    ];
    renderSection(evidence);

    const headings = screen.getAllByRole("heading", { level: 3 }).filter((h) => h.textContent?.startsWith("caseSources.group"));
    expect(headings.map((h) => h.textContent)).toEqual([
      "caseSources.group.court1",
      "caseSources.group.document8",
      "caseSources.group.news1",
    ]);
    // 8 documents: 5 shown, then "show the rest".
    expect(link("Source 6")).toBeNull();
    fireEvent.click(screen.getByText("caseSources.showRest:3"));
    expect(link("Source 8")).not.toBeNull();
  });

  it("filters by group and switches to one list ordered by date", () => {
    renderSection([entry(3, "document"), entry(1, "news"), entry(2, "court_order")]);

    fireEvent.click(screen.getByRole("button", { name: /caseSources.group.news/ }));
    expect(link("Source 3")).toBeNull();
    expect(link("Source 1")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /caseSources.all/ }));
    fireEvent.click(screen.getByRole("button", { name: "caseSources.view.date" }));
    const titles = screen.getAllByRole("link").map((a) => a.textContent).filter((t) => t?.startsWith("Source"));
    expect(titles).toEqual(["Source 1", "Source 2", "Source 3"]);
  });

  it("shows a pending state instead of an empty row when the original is withheld", () => {
    renderSection([
      entry(1, "document", { withheld: { pdf: true, transcript: false } }),
      entry(2, "document", {
        urls: [{ link: `${OUR}a.md`, role: "REDACTED_MARKDOWN" }] as unknown as SourceLink[],
        withheld: { pdf: true, transcript: false },
      }),
    ]);
    expect(screen.getByText("caseSources.pending")).toBeTruthy();
    expect(screen.getByText("caseSources.pdfPending")).toBeTruthy();
    expect(screen.getByText("caseSources.pendingCount:1")).toBeTruthy();
  });

  it("never renders staff-only originals, and links publisher files directly", () => {
    const { container } = renderSection([
      entry(1, "ag", {
        urls: [
          { link: `${OUR}orig.pdf`, role: "RAW" },
          { link: `${OUR}red.pdf`, role: "REDACTED_PDF" },
          { link: `${OUR}orig.md`, role: "MARKDOWN" },
          { link: `${OUR}red.md`, role: "REDACTED_MARKDOWN" },
          { link: "https://ag.gov.np/storage/x.pdf", role: "PRIMARY" },
        ] as unknown as SourceLink[],
      }),
      entry(2, "ag", { urls: [{ link: "https://ag.gov.np/storage/y.pdf", role: "RAW" }] as unknown as SourceLink[] }),
    ]);
    const html = container.innerHTML;
    expect(html).not.toContain(`${OUR}orig.pdf`);
    expect(html).not.toContain(`${OUR}orig.md`);
    // Our redacted copies open in the viewer (buttons), the publisher's PDF is a plain link.
    expect(container.querySelector('a[href="https://ag.gov.np/storage/y.pdf"]')).not.toBeNull();
    expect(screen.getAllByRole("button", { name: /documentPreview.previewAria/ }).length).toBe(2);
  });

  it("shows the outlet chip linked to the original publication", () => {
    renderSection([
      entry(1, "news", { description: "Source: https://ekantipur.com/news/2025/01/09/a.html" }),
      entry(2, "court_order", { court: "patanhc" }),
    ]);
    const chip = screen.getByRole("link", { name: /caseSources.originalAt/ });
    expect(chip.getAttribute("href")).toBe("https://ekantipur.com/news/2025/01/09/a.html");
    expect(chip.getAttribute("rel")).toContain("noopener");
    expect(within(chip).getByText("Kantipur")).toBeTruthy();
    expect(screen.getByText("High Court Patan")).toBeTruthy();
  });

  it("renders nothing without evidence", () => {
    const { container } = renderSection([]);
    expect(container.innerHTML).toBe("");
  });
});
