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
