/**
 * The materials `by_source` values from /api/statistics/ are internal source
 * tokens ("ciaa_press_release", "dfmis", "province/koshi"). This maps each to a
 * stable i18n key so the "where the evidence comes from" chart names sources the
 * way a reader would recognise them.
 */

/** i18n key suffix under dataQuality.materialsBySource.source.* */
export function sourceKeyFor(source: string): string {
  const map: Record<string, string> = {
    court_order: "courtOrders",
    court: "courtRecords",
    ciaa_press_release: "ciaaPress",
    dfmis: "dfmis",
    jawafdehi: "jawafdehi",
    kanun_patrika: "kanunPatrika",
    ciaa_annual_report: "ciaaAnnual",
    "province/koshi": "koshi",
    ppmo_blacklist: "ppmo",
  };
  return map[source] ?? "other";
}
