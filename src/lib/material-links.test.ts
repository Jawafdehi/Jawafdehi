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
