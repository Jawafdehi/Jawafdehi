/**
 * The materials `by_source` values from /api/statistics/ are internal source
 * tokens ("ciaa_press_release", "dfmis", "province/koshi"). This maps each to a
 * stable i18n key naming the INSTITUTION that publishes the material — so the
 * "where the evidence comes from" table reads by publishing office (Nepal Courts,
 * CIAA, Office of the Attorney General...), not by the kind of document.
 *
 * Several raw tokens collapse to one institution: CIAA publishes both press
 * releases and annual reports (`ciaa_press_release`, `ciaa_annual_report`, `ciaa`
 * → `ciaa`); `kanun_patrika` is the legacy token for `nkp`; `oag` is the same
 * office as `ag`. Sources that share a key are summed into one row, and the
 * document types they contribute are listed from the by_source_type cross-tab.
 */

/** i18n key suffix under dataQuality.materialsBySource.source.* */
export function sourceKeyFor(source: string): string {
  const map: Record<string, string> = {
    // Office of the Attorney General — charge sheets (~100k), the biggest feed.
    ag: "ag",
    oag: "ag",
    // Nepal Kanun Patrika — published precedents (~10k). kanun_patrika is the
    // legacy token for the same publication; both fold into one row.
    nkp: "nkp",
    kanun_patrika: "nkp",
    // Nepal Courts — court orders / verdicts.
    court_order: "courts",
    court: "courts",
    // CIAA — publishes press releases AND annual reports; collapse to one office.
    ciaa_press_release: "ciaa",
    ciaa_annual_report: "ciaa",
    ciaa: "ciaa",
    dfmis: "dfmis",
    jawafdehi: "jawafdehi",
    "province/koshi": "koshi",
    ppmo_blacklist: "ppmo",
  };
  return map[source] ?? "other";
}
