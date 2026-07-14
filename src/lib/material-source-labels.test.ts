import { describe, it, expect } from "vitest";
import { sourceKeyFor } from "./material-source-labels";

describe("sourceKeyFor", () => {
  it("maps the big feeds that were falling into Other", () => {
    // Attorney General charge sheets (~100k) and Nepal Kanun Patrika (~10k)
    // were the bulk of the mystery "Other" bucket before these mappings.
    expect(sourceKeyFor("ag")).toBe("ag");
    expect(sourceKeyFor("nkp")).toBe("nkp");
  });

  it("merges the legacy kanun_patrika token into the nkp row", () => {
    // kanun_patrika is the legacy token for the same publication as nkp; both
    // resolve to the same key so aggregate() sums them into one row.
    expect(sourceKeyFor("kanun_patrika")).toBe("nkp");
  });

  it("still maps the known feeds", () => {
    expect(sourceKeyFor("ciaa_press_release")).toBe("ciaaPress");
    expect(sourceKeyFor("dfmis")).toBe("dfmis");
    expect(sourceKeyFor("jawafdehi")).toBe("jawafdehi");
  });

  it("falls back to other for unknown tokens", () => {
    expect(sourceKeyFor("something_new")).toBe("other");
  });
});
