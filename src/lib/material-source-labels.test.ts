import { describe, it, expect } from "vitest";
import { sourceKeyFor } from "./material-source-labels";

describe("sourceKeyFor", () => {
  it("maps the big feeds to their publishing institution", () => {
    // Office of the Attorney General charge sheets (~100k) and Nepal Kanun
    // Patrika precedents (~10k) are the two largest feeds.
    expect(sourceKeyFor("ag")).toBe("ag");
    expect(sourceKeyFor("oag")).toBe("ag");
    expect(sourceKeyFor("nkp")).toBe("nkp");
  });

  it("merges the legacy kanun_patrika token into the nkp row", () => {
    // kanun_patrika is the legacy token for the same publication as nkp; both
    // resolve to the same key so aggregate() sums them into one row.
    expect(sourceKeyFor("kanun_patrika")).toBe("nkp");
  });

  it("names court orders after the courts that issue them", () => {
    // The source is the institution, not the document type — court orders trace
    // back to Nepal Courts.
    expect(sourceKeyFor("court_order")).toBe("courts");
    expect(sourceKeyFor("court")).toBe("courts");
  });

  it("collapses CIAA press releases and annual reports into one CIAA office", () => {
    // CIAA publishes both; they are the same institution, so one row.
    expect(sourceKeyFor("ciaa_press_release")).toBe("ciaa");
    expect(sourceKeyFor("ciaa_annual_report")).toBe("ciaa");
    expect(sourceKeyFor("ciaa")).toBe("ciaa");
  });

  it("folds re-homed type-named sources into their issuing office", () => {
    // Uploads once mis-filed under `jawafdehi` were re-homed to type-named
    // sources; each traces to the office that issues that document.
    expect(sourceKeyFor("charge_sheet")).toBe("ag");
    expect(sourceKeyFor("press_release")).toBe("ciaa");
    expect(sourceKeyFor("court_filing")).toBe("courts");
    expect(sourceKeyFor("official_report")).toBe("auditorGeneral");
    expect(sourceKeyFor("legal_corpus")).toBe("lawsOfNepal");
    expect(sourceKeyFor("news")).toBe("news");
    expect(sourceKeyFor("social_media")).toBe("socialMedia");
  });

  it("folds outlet-named news tokens into the news row", () => {
    expect(sourceKeyFor("news_setopati")).toBe("news");
    expect(sourceKeyFor("news_shilaptra")).toBe("news");
  });

  it("leaves generic mixed-provenance uploads under other", () => {
    // `document` has no single issuing office, so it falls through to "other".
    expect(sourceKeyFor("document")).toBe("other");
  });

  it("names procurement feeds after the PPMO", () => {
    // bolpatra.gov.np is operated by the PPMO — the records themselves carry
    // publisher "Public Procurement Monitoring Office". At ~206k notices it is
    // the single largest source and must not fall through to "other".
    expect(sourceKeyFor("bolpatra")).toBe("ppmo");
    expect(sourceKeyFor("ppmo")).toBe("ppmo");
  });

  it("still maps the smaller known feeds", () => {
    expect(sourceKeyFor("dfmis")).toBe("dfmis");
    expect(sourceKeyFor("province/koshi")).toBe("koshi");
    expect(sourceKeyFor("ppmo_blacklist")).toBe("ppmo");
    expect(sourceKeyFor("jawafdehi")).toBe("jawafdehi");
  });

  it("falls back to other for unknown tokens", () => {
    expect(sourceKeyFor("something_new")).toBe("other");
  });
});
