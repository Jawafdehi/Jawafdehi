import type { SourceDocBlock, SourceDocStats } from "@/lib/source-documents";

/**
 * A `/api/statistics/source-documents/` payload in the exact contract shape,
 * with figures shaped like the 2026-11-27 production snapshot (rounded).
 */
export function block(overrides: Partial<SourceDocBlock> = {}): SourceDocBlock {
  return {
    total: 5570,
    cases: 2790,
    pdf: { redacted: 95, withheld: 145, not_yet_redacted: 3003, publisher_hosted: 2324, no_file: 3 },
    redacted_by: { automatic: 19, converted: 66, staff_hand_redacted: 5, reviewed_no_redaction_needed: 5 },
    withheld_reasons: { awaiting_redaction: 140, needs_hand_redaction: 3, unreadable: 2, oversized: 0 },
    transcript: { redacted: 5036, withheld: 306, none: 228 },
    text: {
      with_text: 5177,
      without_text: 393,
      by_kind: {
        word: 3014,
        image: 17,
        web_page: 55,
        pdf_ocr: 12,
        pdf_text_layer: 2057,
        pdf_unrecorded: 22,
        other: 0,
      },
    },
    by_group: [
      { group: "court_order", total: 2960, with_text: 2942, redacted_pdf: 33, withheld: 58 },
      { group: "charge_sheet", total: 41, with_text: 11, redacted_pdf: 4, withheld: 28 },
      { group: "ciaa_press_release", total: 2102, with_text: 2100, redacted_pdf: 6, withheld: 0 },
      { group: "police_press_release", total: 4, with_text: 4, redacted_pdf: 0, withheld: 4 },
    ],
    ...overrides,
  };
}

export function stats(): SourceDocStats {
  return {
    as_of: "2026-11-27T12:48:20+00:00",
    scopes: {
      published_cases: block(),
      archive: block({
        total: 377662,
        cases: null,
        pdf: { redacted: 95, withheld: 100471, not_yet_redacted: 54517, publisher_hosted: 4075, no_file: 218504 },
        withheld_reasons: { awaiting_redaction: 100466, needs_hand_redaction: 3, unreadable: 2, oversized: 0 },
        text: {
          with_text: 92669,
          without_text: 284993,
          by_kind: {
            word: 43590,
            image: 140,
            web_page: 10636,
            pdf_ocr: 11126,
            pdf_text_layer: 15077,
            pdf_unrecorded: 12100,
            other: 0,
          },
        },
        by_group: [
          { group: "court_order", total: 43337, with_text: 43193, redacted_pdf: 33, withheld: 105 },
          { group: "charge_sheet", total: 99708, with_text: 23478, redacted_pdf: 4, withheld: 98213 },
          { group: "ciaa_press_release", total: 3582, with_text: 3577, redacted_pdf: 6, withheld: 2 },
          { group: "police_press_release", total: 610, with_text: 610, redacted_pdf: 0, withheld: 8 },
        ],
      }),
    },
  };
}
