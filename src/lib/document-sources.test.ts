import { describe, expect, it } from "vitest";

import {
  documentSourceLabel,
  listedSources,
  seriesBrowseHref,
  seriesForSourceKey,
  seriesFromDocumentSource,
  sourceBrowseHref,
  type DocumentSourcesResponse,
} from "@/lib/document-sources";
import { seriesBySlug } from "@/data/material-series";

/** Rows as /api/document-sources/ served them in production (2026-11-16). */
const RESPONSE: DocumentSourcesResponse = {
  ready: true,
  sources: [
    {
      source: "ciaa_press_release",
      name: { en: "CIAA press releases", ne: "अख्तियारका प्रेस विज्ञप्ति" },
      publisher: { en: "CIAA", ne: "अख्तियार दुरुपयोग अनुसन्धान आयोग" },
      labelled: true,
      count: 3556,
    },
    {
      source: "official_report",
      name: { en: "Auditor General reports and publications", ne: "महालेखापरीक्षकको प्रतिवेदन तथा प्रकाशन" },
      publisher: { en: "Office of the Auditor General", ne: "महालेखा परीक्षकको कार्यालय" },
      labelled: true,
      count: 235,
    },
    {
      source: "dri",
      name: { en: "Revenue Investigation releases and reports" },
      publisher: { en: "Department of Revenue Investigation", ne: "राजस्व अनुसन्धान विभाग" },
      description: "Press releases on cases filed, and reports (dri.gov.np).",
      labelled: true,
      count: 160,
    },
    { source: "sebon", name: { en: "SEBON enforcement orders" }, publisher: null, labelled: true, count: 13 },
    // Not yet named by staff: not listed.
    { source: "mystery", name: null, publisher: null, labelled: false, count: 4 },
    // Named, but every document is hidden from the public: not listed.
    { source: "empty", name: { en: "Empty shelf" }, publisher: null, labelled: true, count: 0 },
  ],
};

describe("listedSources", () => {
  it("lists every named source with public documents, in the API's order", () => {
    expect(listedSources(RESPONSE).map((row) => row.source)).toEqual([
      "ciaa_press_release",
      "official_report",
      "dri",
      "sebon",
    ]);
  });

  it("is empty before the response arrives", () => {
    expect(listedSources(undefined)).toEqual([]);
  });
});

describe("sourceBrowseHref", () => {
  it("sends a source a curated shelf covers whole to that shelf", () => {
    expect(sourceBrowseHref("ciaa_press_release")).toBe("/materials/?series=ciaa-press-releases");
  });

  it("browses a source split across several shelves as one whole source", () => {
    expect(sourceBrowseHref("official_report")).toBe("/materials/?source=official_report");
  });

  it("browses a source no shelf knows about, so new sources are reachable", () => {
    expect(sourceBrowseHref("dri")).toBe("/materials/?source=dri");
    expect(sourceBrowseHref("province/koshi")).toBe("/materials/?source=province%2Fkoshi");
  });
});

describe("seriesFromDocumentSource", () => {
  it("builds a browsable series from the API row", () => {
    const series = seriesFromDocumentSource(RESPONSE.sources[2]);
    expect(series).toMatchObject({
      slug: "source:dri",
      source: "dri",
      name: { en: "Revenue Investigation releases and reports", ne: "" },
      description: {
        en: "Press releases on cases filed, and reports (dri.gov.np).",
        ne: "राजस्व अनुसन्धान विभाग",
      },
    });
    expect(series.tint).toBeGreaterThanOrEqual(1);
    expect(series.tint).toBeLessThanOrEqual(8);
    expect(seriesBrowseHref(series)).toBe("/materials/?source=dri");
  });

  it("keeps curated series on their ?series= address", () => {
    expect(seriesBrowseHref(seriesBySlug("charge-sheets")!)).toBe("/materials/?series=charge-sheets");
  });

  it("finds a listed source by key, and nothing for an unlisted one", () => {
    expect(seriesForSourceKey(RESPONSE, "sebon")?.name.en).toBe("SEBON enforcement orders");
    expect(seriesForSourceKey(RESPONSE, "mystery")).toBeUndefined();
    expect(seriesForSourceKey(RESPONSE, "nope")).toBeUndefined();
  });
});

describe("documentSourceLabel", () => {
  it("reads Nepali first in Nepali, falling back to English", () => {
    expect(documentSourceLabel(RESPONSE, "dri", "ne")).toEqual({
      name: "Revenue Investigation releases and reports",
      publisher: "राजस्व अनुसन्धान विभाग",
    });
    expect(documentSourceLabel(RESPONSE, "dri", "en")?.publisher).toBe(
      "Department of Revenue Investigation",
    );
  });

  it("returns null for an unknown or unlabelled source", () => {
    expect(documentSourceLabel(RESPONSE, "mystery", "en")).toBeNull();
    expect(documentSourceLabel(undefined, "dri", "en")).toBeNull();
  });
});
