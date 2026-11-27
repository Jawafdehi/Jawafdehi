import { describe, expect, it } from "vitest";

import {
  PDF_STATES,
  TEXT_KINDS,
  formatAsOf,
  groupRows,
  parseSourceDocStats,
  segments,
  sharePct,
} from "@/lib/source-documents";
import { block, stats } from "@/lib/source-documents.fixtures";

describe("parseSourceDocStats", () => {
  it("accepts the contract payload as is", () => {
    const payload = stats();
    expect(parseSourceDocStats(payload)).toBe(payload);
  });

  it.each([
    ["null", null],
    ["a 404 body", { detail: "Not found." }],
    ["no as_of", { ...stats(), as_of: undefined }],
    ["a missing scope", { as_of: "2026-11-27T00:00:00Z", scopes: { archive: block() } }],
    ["a negative count", { ...stats(), scopes: { ...stats().scopes, archive: block({ total: -1 }) } }],
    [
      "a missing pdf state",
      {
        ...stats(),
        scopes: {
          ...stats().scopes,
          archive: { ...block(), pdf: { redacted: 1 } },
        },
      },
    ],
    [
      "an incomplete group row",
      { ...stats(), scopes: { ...stats().scopes, archive: block({ by_group: [{ group: "court_order" }] as never }) } },
    ],
    ["a bad cases count", { ...stats(), scopes: { ...stats().scopes, archive: block({ cases: -2 }) } }],
  ])("rejects %s, so the section hides instead of drawing zeros", (_label, value) => {
    expect(parseSourceDocStats(value)).toBeNull();
  });
});

describe("sharePct", () => {
  it("rounds down to one decimal so a gap never rounds away", () => {
    expect(sharePct(95, 5570)).toBe(1.7); // 1.705…
    expect(sharePct(99_999, 100_000)).toBe(99.9);
    expect(sharePct(1, 3)).toBe(33.3);
  });

  it("is 0 for an empty whole", () => {
    expect(sharePct(5, 0)).toBe(0);
  });
});

describe("segments", () => {
  it("keeps the display order and every state, zeros included", () => {
    const rows = segments(block().pdf, PDF_STATES, 5570);
    expect(rows.map((r) => r.key)).toEqual([...PDF_STATES]);
    expect(rows.reduce((sum, r) => sum + r.count, 0)).toBe(5570);
    expect(rows.find((r) => r.key === "not_yet_redacted")?.pct).toBe(53.9);
  });

  it("drops zero rows only when asked, and reads a missing key as 0", () => {
    const kinds = segments({ word: 3, pdf_ocr: 1 }, TEXT_KINDS, 4, true);
    expect(kinds.map((k) => k.key)).toEqual(["pdf_ocr", "word"]);
    expect(segments({}, ["word"] as const, 4)).toEqual([{ key: "word", count: 0, pct: 0 }]);
  });
});

describe("groupRows", () => {
  it("returns the four named groups in fixed order, filling a missing one with zeros", () => {
    const rows = groupRows(block({ by_group: [block().by_group[2], block().by_group[0]] }));
    expect(rows.map((r) => r.group)).toEqual([
      "court_order",
      "charge_sheet",
      "ciaa_press_release",
      "police_press_release",
    ]);
    expect(rows[1]).toEqual({ group: "charge_sheet", total: 0, with_text: 0, redacted_pdf: 0, withheld: 0 });
  });
});

describe("formatAsOf", () => {
  it("writes the Nepal-time day in Bikram Sambat for Nepali readers", () => {
    // 20:30 UTC on 27 Nov is already 28 Nov (02:15) in Kathmandu = 2083 Mangsir 12.
    expect(formatAsOf("2026-11-27T20:30:00Z", "ne")).toBe("२०८३ मंसिर १२");
  });

  it("writes a plain date for English readers", () => {
    expect(formatAsOf("2026-11-27T12:48:20+00:00", "en")).toBe("27 November 2026");
  });

  it("is null for an unreadable timestamp", () => {
    expect(formatAsOf("not a date", "en")).toBeNull();
  });
});
