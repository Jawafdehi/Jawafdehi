import { describe, it, expect } from "vitest";
import { buildSubmitPayload, looksLikeReviewIri } from "./casework-api";

describe("buildSubmitPayload", () => {
  it("sends a Jawafdehi case IRI as `iri`", () => {
    expect(buildSubmitPayload("https://jawafdehi.org/case/alpha-case")).toEqual({
      iri: "https://jawafdehi.org/case/alpha-case",
    });
  });

  it("sends a court-case IRI as `iri`", () => {
    expect(
      buildSubmitPayload("https://jawafdehi.org/courtcase/special/080-cr-0111")
    ).toEqual({ iri: "https://jawafdehi.org/courtcase/special/080-cr-0111" });
  });

  it("trims surrounding whitespace", () => {
    expect(buildSubmitPayload("  https://jawafdehi.org/case/alpha-case  ")).toEqual({
      iri: "https://jawafdehi.org/case/alpha-case",
    });
  });

  it("forwards non-IRI input verbatim (the backend rejects it with a clear 400)", () => {
    expect(buildSubmitPayload("080-CR-0111")).toEqual({ iri: "080-CR-0111" });
  });
});

describe("looksLikeReviewIri", () => {
  it("accepts case and court-case IRIs", () => {
    expect(looksLikeReviewIri("https://jawafdehi.org/case/alpha-case")).toBe(true);
    expect(
      looksLikeReviewIri("https://jawafdehi.org/courtcase/special/080-cr-0111")
    ).toBe(true);
    expect(looksLikeReviewIri("  https://jawafdehi.org/case/alpha-case  ")).toBe(true);
  });

  it("rejects case numbers, names, and legacy court refs", () => {
    expect(looksLikeReviewIri("080-CR-0111")).toBe(false);
    expect(looksLikeReviewIri("Giribandhu")).toBe(false);
    expect(looksLikeReviewIri("special:081-CR-0136")).toBe(false);
    expect(looksLikeReviewIri("case-081-cr-0136-oxygen-plant")).toBe(false);
  });

  it("mirrors the backend: court-case numbers are lowercase-only (uppercase is not canonical)", () => {
    // Court-case IRIs are strictly lowercase everywhere on the platform, so an
    // uppercase number is not a valid court-case IRI — keep this in sync with
    // the backend so the hint never says "ok" for something it will 400.
    expect(
      looksLikeReviewIri("https://jawafdehi.org/courtcase/special/080-CR-0111")
    ).toBe(false);
    // A case slug, by contrast, may contain uppercase.
    expect(looksLikeReviewIri("https://jawafdehi.org/case/Case-Alpha")).toBe(true);
  });
});
