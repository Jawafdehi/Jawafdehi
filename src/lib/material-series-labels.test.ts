import { describe, it, expect } from "vitest";

import {
  materialTypeForSchemaClass,
  materialTypeForSource,
} from "./material-series-labels";
import { materialTypeKeyFor } from "./material-type-labels";
import { MATERIAL_SERIES } from "@/data/material-series";

// Every source token the live corpus carries, from the /api/statistics/
// `materials.by_source_type` cross-tab. Pinned here so a new ingest source
// that this map has not learned yet shows up as a failing test rather than as
// a silently mislabelled card.
const LIVE_SOURCES = [
  "bolpatra",
  "ag",
  "court_order",
  "nkp",
  "ciaa_press_release",
  "dfmis",
  "kanun_patrika",
  "news",
  "ppmo",
  "cib",
  "document",
  "ciaa_annual_report",
  "charge_sheet",
  "press_release",
  "legal_corpus",
  "social_media",
  "court_filing",
  "province/koshi",
  "ppmo_blacklist",
  "official_report",
  "court_order_0133",
  "dmli",
  "news_setopati",
  "news_shilaptra",
  "nia",
  "nrb",
  "occrp",
  "ratopati",
  "sebon",
  "special_court_order",
] as const;

describe("materialTypeForSource", () => {
  it("names a series for every source in the live corpus", () => {
    // The curated registry covers its own sources with an editorial name, so a
    // source only needs to be in this map when the registry does not hold it.
    const registrySources = new Set(MATERIAL_SERIES.map((s) => s.source));
    const unnamed = LIVE_SOURCES.filter(
      (source) => !registrySources.has(source) && !materialTypeForSource(source),
    );
    expect(unnamed).toEqual([]);
  });

  it("never resolves a known source to the Other bucket", () => {
    // "Series: Other" tells a reader nothing; every mapped token must land on
    // a real label in dataQuality.materialsByType.type.*.
    const other = LIVE_SOURCES.map((source) => materialTypeForSource(source))
      .filter((type): type is string => Boolean(type))
      .filter((type) => materialTypeKeyFor(type) === "other");
    expect(other).toEqual([]);
  });

  it("maps the biggest feeds to their document type", () => {
    // ~206k procurement notices — 60% of the corpus, and the token that used
    // to fall through to "other" because procurement_notice was unmapped.
    expect(materialTypeForSource("bolpatra")).toBe("procurement_notice");
    expect(materialTypeKeyFor("procurement_notice")).toBe("procurementNotice");
    expect(materialTypeForSource("ag")).toBe("charge_sheet");
    expect(materialTypeForSource("court_order")).toBe("court_order");
    expect(materialTypeForSource("nkp")).toBe("precedent");
  });

  it("folds one-off and type-named tokens into the collection they belong to", () => {
    expect(materialTypeForSource("special_court_order")).toBe("court_order");
    expect(materialTypeForSource("court_order_0133")).toBe("court_order");
    expect(materialTypeForSource("charge_sheet")).toBe("charge_sheet");
    expect(materialTypeForSource("news_setopati")).toBe("news");
    expect(materialTypeForSource("cib")).toBe("press_release");
  });

  it("returns null for a token it does not know", () => {
    expect(materialTypeForSource("something_new")).toBeNull();
  });
});

describe("materialTypeForSchemaClass", () => {
  it("reads the index's schema.org class so an unknown source still has a type", () => {
    expect(materialTypeForSchemaClass("NewsArticle")).toBe("news");
    expect(materialTypeForSchemaClass("Report")).toBe("official_report");
    expect(materialTypeForSchemaClass("Legislation")).toBe("legal_corpus");
    expect(materialTypeForSchemaClass("SocialMediaPosting")).toBe("social_media");
  });

  it("matches a multi-class value on its first recognised class", () => {
    // 23k court orders are indexed as "Manuscript,DigitalDocument".
    expect(materialTypeForSchemaClass("Manuscript,DigitalDocument")).toBe(
      "manuscript",
    );
  });

  it("falls back to document rather than Other", () => {
    expect(materialTypeForSchemaClass(undefined)).toBe("document");
    expect(materialTypeForSchemaClass("")).toBe("document");
    expect(materialTypeForSchemaClass("SomeFutureClass")).toBe("document");
    expect(materialTypeKeyFor(materialTypeForSchemaClass(undefined))).not.toBe(
      "other",
    );
  });
});
