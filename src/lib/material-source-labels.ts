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
 *
 * Type-named sources minted when case uploads were re-homed off the `jawafdehi`
 * bucket fold into their issuing office too (`charge_sheet` → Attorney General,
 * `press_release` → CIAA, `court_filing` → Nepal Courts). Laws, Auditor-General
 * reports, news and social posts each get their own source. Generic, mixed-
 * provenance uploads keep the `document` source and fall through to "other".
 */

/** i18n key suffix under dataQuality.materialsBySource.source.* */
export function sourceKeyFor(source: string): string {
  const map: Record<string, string> = {
    // Office of the Attorney General — charge sheets (~100k), the biggest feed.
    ag: "ag",
    oag: "ag",
    charge_sheet: "ag",
    // Nepal Kanun Patrika — published precedents (~10k). kanun_patrika is the
    // legacy token for the same publication; both fold into one row.
    nkp: "nkp",
    kanun_patrika: "nkp",
    // Nepal Courts — court orders / verdicts / filings.
    court_order: "courts",
    court: "courts",
    court_filing: "courts",
    // CIAA — publishes press releases AND annual reports; collapse to one office.
    ciaa_press_release: "ciaa",
    ciaa_annual_report: "ciaa",
    ciaa: "ciaa",
    press_release: "ciaa",
    // Office of the Auditor General — annual audit reports.
    official_report: "auditorGeneral",
    // The corpus of Nepali statutes, regulations and bills.
    legal_corpus: "lawsOfNepal",
    // Reporting drawn from the press and social platforms.
    news: "news",
    social_media: "socialMedia",
    dfmis: "dfmis",
    jawafdehi: "jawafdehi",
    "province/koshi": "koshi",
    ppmo_blacklist: "ppmo",
    // `document` = mixed-provenance case uploads with no single issuing office;
    // it deliberately falls through to "other".
  };
  return map[source] ?? "other";
}
