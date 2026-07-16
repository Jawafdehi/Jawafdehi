import { describe, it, expect } from "vitest";
import { materialTypeKeyFor } from "./material-type-labels";

describe("materialTypeKeyFor", () => {
  it("maps the live material types to i18n key suffixes", () => {
    expect(materialTypeKeyFor("charge_sheet")).toBe("chargeSheet");
    expect(materialTypeKeyFor("precedent")).toBe("precedent");
    expect(materialTypeKeyFor("court_order")).toBe("courtOrder");
    expect(materialTypeKeyFor("document")).toBe("document");
    expect(materialTypeKeyFor("legal_corpus")).toBe("legalCorpus");
    expect(materialTypeKeyFor("official_report")).toBe("officialReport");
    expect(materialTypeKeyFor("news")).toBe("news");
    expect(materialTypeKeyFor("social_media")).toBe("socialMedia");
  });

  it("falls back to other for unknown types", () => {
    expect(materialTypeKeyFor("something_new")).toBe("other");
  });
});
