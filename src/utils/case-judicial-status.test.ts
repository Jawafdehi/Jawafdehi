import { describe, expect, it } from "vitest";

import {
  judicialStatusLabel,
  judicialStatusOf,
} from "@/utils/case-judicial-status";

const SPECIAL = "https://jawafdehi.org/courtcase/special/080-cr-0048";
const SUPREME_APPEAL = "https://jawafdehi.org/courtcase/supreme/081-cr-2319";
const SUPREME_WRIT = "https://jawafdehi.org/courtcase/supreme/075-wo-0696";
const SUPREME_HABEAS = "https://jawafdehi.org/courtcase/supreme/081-wh-0320";

describe("judicialStatusOf", () => {
  it("reports a Supreme Court appeal when a criminal appeal is linked", () => {
    expect(
      judicialStatusOf({
        court_cases: [SPECIAL, SUPREME_APPEAL],
        case_end_date: "2024-05-07",
      }),
    ).toBe("supreme_appeal");
  });

  it("lets the appeal outrank the Special Court verdict beneath it", () => {
    // The real National Payment Gateway shape: decided below, appealed above.
    // The appeal is the current state, so it must win.
    expect(
      judicialStatusOf(
        { court_cases: [SPECIAL, SUPREME_APPEAL], case_end_date: "2024-05-07" },
        "convicted",
      ),
    ).toBe("supreme_appeal");
  });

  it("does NOT call a Supreme Court writ an appeal", () => {
    // Giribandhu / Ncell reached the Supreme Court by writ, not by appealing a
    // Special Court verdict.
    expect(
      judicialStatusOf({ court_cases: [SUPREME_WRIT], case_end_date: null }),
    ).toBe("special_pending");
  });

  it("does NOT call a habeas corpus or revision an appeal", () => {
    expect(
      judicialStatusOf({ court_cases: [SUPREME_HABEAS], case_end_date: null }),
    ).toBe("special_pending");
  });

  it("reports a decided case when the case has an end date", () => {
    expect(
      judicialStatusOf({ court_cases: [SPECIAL], case_end_date: "2024-05-07" }),
    ).toBe("special_decided");
  });

  it("treats a recorded verdict as decided even without an end date", () => {
    expect(
      judicialStatusOf({ court_cases: [SPECIAL], case_end_date: null }, "acquitted"),
    ).toBe("special_decided");
    expect(
      judicialStatusOf({ court_cases: [SPECIAL], case_end_date: null }, "abated"),
    ).toBe("special_decided");
  });

  it("reports an ongoing hearing when only charged and undecided", () => {
    expect(
      judicialStatusOf({ court_cases: [SPECIAL], case_end_date: null }, "charged"),
    ).toBe("special_pending");
  });

  it("reports an ongoing hearing when there is no court linkage at all", () => {
    // Three of Sunil Poudel's cases are in exactly this state.
    expect(judicialStatusOf({ court_cases: [], case_end_date: null })).toBe(
      "special_pending",
    );
    expect(judicialStatusOf({ court_cases: null, case_end_date: null })).toBe(
      "special_pending",
    );
  });
});

describe("judicialStatusLabel", () => {
  it("uses the approved Nepali wording", () => {
    expect(judicialStatusLabel("supreme_appeal", "ne")).toBe(
      "सर्वोच्च अदालतमा पुनरावेदन दर्ता",
    );
    expect(judicialStatusLabel("special_decided", "ne")).toBe(
      "विशेष अदालतबाट फैसला भइसकेको",
    );
    expect(judicialStatusLabel("special_pending", "ne")).toBe(
      "विशेष अदालतमा सुनुवाइ भइरहेको",
    );
  });

  it("falls back to English for any non-Nepali language", () => {
    expect(judicialStatusLabel("supreme_appeal", "en")).toBe(
      "Appeal registered at the Supreme Court",
    );
    expect(judicialStatusLabel("special_decided", "fr")).toBe(
      "Decided by the Special Court",
    );
  });
});
