/**
 * The materials `by_type` values from /api/statistics/ are internal material-type
 * tokens ("charge_sheet", "court_order", "precedent"). This maps each to a stable
 * i18n key so the "what materials are hosted" chart names document types the way
 * a reader would recognise them.
 *
 * Tokens mirror materials/jsonld.py MaterialType, plus "precedent" (Nepal Kanun
 * Patrika court-order precedents) which appears in the live data but is not in
 * that enum.
 */

/** i18n key suffix under dataQuality.materialsByType.type.* */
export function materialTypeKeyFor(type: string): string {
  const map: Record<string, string> = {
    charge_sheet: "chargeSheet",
    precedent: "precedent",
    court_order: "courtOrder",
    court_case: "courtCase",
    press_release: "pressRelease",
    document: "document",
    legal_corpus: "legalCorpus",
    official_report: "officialReport",
    news: "news",
    social_media: "socialMedia",
    manuscript: "manuscript",
  };
  return map[type] ?? "other";
}
