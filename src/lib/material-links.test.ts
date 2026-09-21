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
