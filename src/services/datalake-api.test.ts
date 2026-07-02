import { describe, it, expect } from "vitest";
import { materialTail, parseCourtCaseRef } from "./datalake-api";

describe("materialTail", () => {
  it("strips a full material IRI to its <source>/<ident> tail", () => {
    expect(materialTail("https://jawafdehi.org/material/ciaa/press-2081-042")).toBe(
      "ciaa/press-2081-042",
    );
  });

  it("preserves a multi-segment source (court-derived material)", () => {
    expect(materialTail("https://jawafdehi.org/material/court/supreme.081-cr-0081")).toBe(
      "court/supreme.081-cr-0081",
    );
  });

  it("returns a bare tail unchanged", () => {
    expect(materialTail("dfmis/2")).toBe("dfmis/2");
  });

  it("preserves the documented id shapes as-is (no reserved chars)", () => {
    // The common live shapes (slash separators, dots) carry through unchanged;
    // getMaterial encodes each segment, but the tail itself is unmodified here.
    expect(materialTail("https://jawafdehi.org/material/court/special.081-cr-0079")).toBe(
      "court/special.081-cr-0079",
    );
  });
});

describe("parseCourtCaseRef", () => {
  it("splits a <court>:<number> ref into its composite key", () => {
    expect(parseCourtCaseRef("special:081-CR-0060")).toEqual({
      court: "special",
      caseNumber: "081-CR-0060",
    });
  });

  it("treats a bare number (no court prefix) as an empty court", () => {
    expect(parseCourtCaseRef("081-CR-0060")).toEqual({
      court: "",
      caseNumber: "081-CR-0060",
    });
  });

  it("only splits on the first colon (case numbers are colon-free)", () => {
    expect(parseCourtCaseRef("supreme:081-CR-0081")).toEqual({
      court: "supreme",
      caseNumber: "081-CR-0081",
    });
  });
});
