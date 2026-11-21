/**
 * Test fixture: where the API files each source (`folder` / `subfolder` on
 * /api/document-sources/), as migration 0015 of JawafdehiAPI set it in
 * production on 18 Nov 2026 (JAW-87). Tests build catalogue rows with
 * `filedRow` so the archive tree places shelves the way production does.
 */

export const PRODUCTION_FOLDERS: Record<string, readonly [string, string?]> = {
  nkp: ["judiciary"],
  judiciary_report: ["judiciary"],
  kanun_patrika: ["judiciary"],
  special_court_order: ["judiciary"],
  court_order: ["judiciary"],
  court_filing: ["judiciary"],
  ciaa_press_release: ["government"],
  press_release: ["government"],
  ciaa_annual_report: ["government"],
  ag: ["government"],
  charge_sheet: ["government"],
  attorney_general_report: ["government"],
  official_report: ["government"],
  cabinet_decision: ["government"],
  bolpatra: ["government"],
  ppmo: ["government"],
  ppmo_blacklist: ["government"],
  dfmis: ["government"],
  dri: ["government"],
  dmli: ["government"],
  nepal_police: ["government"],
  "province/koshi": ["government"],
  nrb: ["government", "regulators"],
  sebon: ["government", "regulators"],
  nia: ["government", "regulators"],
  // Filed through the registry after migration 0015.
  moha: ["government"],
  nhrc: ["government"],
  psc: ["government"],
  trc: ["government"],
  election_commission: ["government"],
  nta: ["government", "regulators"],
  erc: ["government", "regulators"],
  legal_corpus: ["laws"],
  legal_template: ["laws"],
  rajpatra: ["laws"],
  news: ["news"],
  ratopati: ["news"],
  news_setopati: ["news"],
  news_shilaptra: ["news"],
  occrp: ["news"],
  social_media: ["news"],
  us_court: ["international"],
  us_sec: ["international"],
  us_doj: ["international"],
  document: ["others"],
};

/** A catalogue row with the folder production gives its source (others if unknown). */
export function filedRow<T extends { source: string }>(row: T): T & { folder: string; subfolder: string | null } {
  const [folder, subfolder] = PRODUCTION_FOLDERS[row.source] ?? ["others"];
  return { ...row, folder, subfolder: subfolder ?? null };
}
