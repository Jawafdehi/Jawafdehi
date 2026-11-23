import { describe, expect, it } from "vitest";

import { getMaterialSourceLinks } from "./material-links";

import type { Material } from "@/services/datalake-api";

describe("getMaterialSourceLinks", () => {
  it("distinguishes an HTML source page from downloadable document files", () => {
    const material = {
      "@id": "https://jawafdehi.org/material/ciaa_press_release/2402",
      associatedMedia: [
        {
          contentUrl: "https://ciaa.gov.np/pressrelease/2402",
          encodingFormat: "text/html",
          "jawafdehi:linkRole": "SOURCE_PAGE",
        },
        {
          contentUrl: "https://files.example.org/charge-sheet.doc",
          "jawafdehi:linkRole": "RAW",
        },
      ],
    } as Material;

    expect(getMaterialSourceLinks(material)).toEqual([
      expect.objectContaining({
        extension: null,
        isExternal: true,
        label: "Original source page",
      }),
      expect.objectContaining({
        extension: "doc",
        isExternal: false,
        label: ".DOC",
      }),
    ]);
  });
});

describe("getMaterialSourceLinks only previews files the viewer can load", () => {
  // ppmo/13253 (PPMO annual report 2082): its only PDF is on the publisher's
  // CDN, which the /document-preview proxy refuses, so the viewer could only
  // fail. It must be a direct link to the original instead.
  const PUBLISHER_PDF =
    "https://giwmscdnone.gov.np/media/pdf_upload/%E0%A4%B5%E0%A4%BE%E0%A4%B0%E0%A5%8D%E0%A4%B7%E0%A4%BF%E0%A4%95_aokavxp.pdf";

  it("links a publisher-hosted PDF directly, still labelled PDF", () => {
    const material = {
      "@id": "https://jawafdehi.org/material/ppmo/13253",
      associatedMedia: [{ contentUrl: PUBLISHER_PDF, encodingFormat: "application/pdf" }],
    } as Material;

    expect(getMaterialSourceLinks(material)).toEqual([
      expect.objectContaining({ href: PUBLISHER_PDF, label: "PDF", previewType: undefined }),
    ]);
  });

  it("still previews a PDF on our own bucket", () => {
    const ours = "https://s3.jawafdehi.org/case_uploads/ppmo-report.pdf";
    const material = {
      "@id": "https://jawafdehi.org/material/ppmo/1",
      associatedMedia: [{ contentUrl: ours, encodingFormat: "application/pdf" }],
    } as Material;

    expect(getMaterialSourceLinks(material)).toEqual([
      expect.objectContaining({ href: ours, label: "PDF", previewType: "pdf" }),
    ]);
  });
});

describe("getMaterialSourceLinks withholds staff-only originals", () => {
  const ours = (key: string) => `https://s3.jawafdehi.org/case_uploads/${key}`;
  const material = (media: Record<string, string>[]) =>
    ({ "@id": "https://jawafdehi.org/material/ag/1", associatedMedia: media }) as Material;

  it("never links our unredacted transcript or PDF when redacted copies exist", () => {
    const hrefs = getMaterialSourceLinks(
      material([
        { contentUrl: ours("orig.pdf"), "jawafdehi:linkRole": "RAW" },
        { contentUrl: ours("red.pdf"), "jawafdehi:linkRole": "REDACTED_PDF" },
        { contentUrl: ours("orig.md"), "jawafdehi:linkRole": "MARKDOWN" },
        { contentUrl: ours("red.md"), "jawafdehi:linkRole": "REDACTED_MARKDOWN" },
        { contentUrl: "https://ag.gov.np/x.pdf", "jawafdehi:linkRole": "PRIMARY" },
      ]),
    ).map((l) => l.href);

    expect(hrefs).not.toContain(ours("orig.md"));
    expect(hrefs).not.toContain(ours("orig.pdf"));
    expect(hrefs).toEqual(
      expect.arrayContaining([ours("red.md"), ours("red.pdf"), "https://ag.gov.np/x.pdf"]),
    );
  });

  it("leaves a document with no redacted copy alone", () => {
    const hrefs = getMaterialSourceLinks(
      material([{ contentUrl: ours("orig.md"), "jawafdehi:linkRole": "MARKDOWN" }]),
    ).map((l) => l.href);
    expect(hrefs).toEqual([ours("orig.md")]);
  });
});

describe("getMaterialSourceLinks never renders a private-bucket link", () => {
  it("drops a link into the staff-only originals bucket, even with no redacted sibling", () => {
    const material = {
      "@id": "https://jawafdehi.org/material/ag/1",
      associatedMedia: [
        {
          contentUrl: `https://private-originals.jawafdehi.org/case_uploads/${"b".repeat(64)}.md`,
          "jawafdehi:linkRole": "MARKDOWN",
        },
        {
          contentUrl: "https://ciaa.gov.np/charge-sheet.pdf",
          "jawafdehi:linkRole": "RAW",
        },
      ],
    } as Material;
    const hrefs = getMaterialSourceLinks(material).map((l) => l.href);
    expect(hrefs).toEqual(["https://ciaa.gov.np/charge-sheet.pdf"]);
  });
});
