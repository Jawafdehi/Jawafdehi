/**
 * The materials `by_source` values from /api/statistics/ are internal source
 * tokens ("ciaa_press_release", "dfmis", "province/koshi"). This maps each to a
 * stable i18n key so the "where the evidence comes from" chart names sources the
 * way a reader would recognise them.
 */

/** i18n key suffix under dataQuality.materialsBySource.source.* */
export function sourceKeyFor(source: string): string {
  const map: Record<string, string> = {
    // ag (Attorney General, ~100k charge sheets) and nkp (Nepal Kanun Patrika,
    // ~10k precedents) are the two big feeds that were falling into "Other"
    // because they had no mapping. kanun_patrika is the legacy token for nkp.
    ag: "ag",
    nkp: "nkp",
    court_order: "courtOrders",
    court: "courtRecords",
    ciaa_press_release: "ciaaPress",
    dfmis: "dfmis",
    jawafdehi: "jawafdehi",
    // Legacy token for the same publication as `nkp` — map to the SAME key so
    // aggregate() sums the two into one "Nepal Kanun Patrika" row instead of
    // rendering two rows with an identical label.
    kanun_patrika: "nkp",
    ciaa_annual_report: "ciaaAnnual",
    "province/koshi": "koshi",
    ppmo_blacklist: "ppmo",
    ciaa: "ciaa",
    oag: "oag",
  };
  return map[source] ?? "other";
}
