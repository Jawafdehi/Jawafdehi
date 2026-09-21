/**
 * Every material belongs to a series — the collection it was ingested as.
 *
 * The curated MATERIAL_SERIES registry names only the archive's flagship
 * publications (they get folder cards on /materials and a browsable
 * `?series=` page), so it covers 5 of the 30 live source tokens. That is the
 * right scope for the landing page but the wrong answer for a result card,
 * where a reader wants to know what KIND of record they are looking at for
 * every hit, not just the flagship ones.
 *
 * So this resolves the rest, in two steps, without a network call:
 *
 *  1. `materialTypeForSource` — the source token's dominant document type,
 *     mirroring the /api/statistics/ `materials.by_source_type` cross-tab.
 *     Source → type is effectively 1:1 there: only `ciaa_press_release`,
 *     `news` and `court_order` carry a second type at all, and each of those
 *     is a handful of records against thousands, so the dominant type names
 *     the collection accurately.
 *  2. `materialTypeForSchemaClass` — a fallback from `extra.type`, the
 *     schema.org class the search index always carries. It keeps a brand-new
 *     source token (ingested after this map was written) reading as a real
 *     document type rather than "Other".
 *
 * Both return a `material_type` token for `materialTypeKeyFor`, so the labels
 * themselves stay in one place: dataQuality.materialsByType.type.*.
 */

/**
 * The dominant `material_type` for a data-lake source token, or null when the
 * token is not one this map knows.
 */
export function materialTypeForSource(source: string): string | null {
  const map: Record<string, string> = {
    // Public procurement — bolpatra.gov.np, the largest feed by far.
    bolpatra: "procurement_notice",
    // Office of the Attorney General charge sheets, and the type-named token
    // minted when case uploads were re-homed off the `jawafdehi` bucket.
    ag: "charge_sheet",
    charge_sheet: "charge_sheet",
    // Court orders and verdicts. The numbered/prefixed tokens are one-off
    // ingests of the same kind of record.
    court_order: "court_order",
    court_order_0133: "court_order",
    special_court_order: "court_order",
    // Nepal Kanun Patrika precedents (`kanun_patrika` is the journal itself
    // and is in the curated registry, so it never reaches this map).
    nkp: "precedent",
    // Press releases — CIAA's own feed, the re-homed type-named token, and the
    // investigation bureaux that publish the same form of record.
    ciaa_press_release: "press_release",
    press_release: "press_release",
    cib: "press_release",
    dmli: "press_release",
    // Official reports from the offices that publish them.
    ppmo: "official_report",
    ciaa_annual_report: "official_report",
    official_report: "official_report",
    nia: "official_report",
    nrb: "official_report",
    sebon: "official_report",
    // Press reporting, including the outlet-named one-off ingests.
    news: "news",
    news_setopati: "news",
    news_shilaptra: "news",
    occrp: "news",
    ratopati: "news",
    social_media: "social_media",
    legal_corpus: "legal_corpus",
    // Mixed-provenance record sets with no single document form.
    dfmis: "document",
    document: "document",
    court_filing: "document",
    ppmo_blacklist: "document",
    "province/koshi": "document",
  };
  return map[source] ?? null;
}

/**
 * A `material_type` inferred from the search index's schema.org class
 * (`extra.type`), which every material hit carries. Used only when the source
 * token is unknown; multi-class values ("Manuscript,DigitalDocument") match on
 * their first recognised class.
 */
export function materialTypeForSchemaClass(schemaClass: string | undefined): string {
  const map: Record<string, string> = {
    NewsArticle: "news",
    Report: "official_report",
    Legislation: "legal_corpus",
    SocialMediaPosting: "social_media",
    Manuscript: "manuscript",
    DigitalDocument: "document",
    CreativeWork: "document",
  };
  for (const part of (schemaClass || "").split(",")) {
    const matched = map[part.trim()];
    if (matched) return matched;
  }
  return "document";
}
