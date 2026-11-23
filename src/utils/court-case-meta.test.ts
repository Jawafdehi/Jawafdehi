// SPDX-License-Identifier: Hippocratic-3.0
import { describe, expect, it } from "vitest";

import { courtCaseMeta } from "./court-case-meta";

// Shaped after a real /api/courtcases/<court>/<number>/ payload, but FICTIONAL,
// per this repo's fixture rule: a fixture asserting an outcome or naming a
// defendant must not attach either to a real register entry. 099-* numbers
// cannot collide with one, and the defendant is a placeholder — the point of one
// test below is that it never reaches the snippet.
const BASE = {
  case_number: "099-CR-9002",
  case_type: "रकम हिनामिना",
  case_status: null as string | null,
  registration_date_bs: "2071-10-22",
  verdict_date_bs: null as string | null,
  verdict_type: null as string | null,
  hearings: [],
  plaintiff: "नेपाल सरकार",
  defendant: "नमुना प्रतिवादी समेत २",
};

describe("courtCaseMeta", () => {
  it("builds the title from the record: number, charge, court", () => {
    const { title } = courtCaseMeta(BASE, "special");
    expect(title).toContain("099-CR-9002");
    expect(title).toContain("रकम हिनामिना");
    expect(title).toContain("विशेष अदालत");
    expect(title.endsWith("| Jawafdehi")).toBe(true);
  });

  it("puts the outcome in the description when the court recorded one", () => {
    // The register writes the outcome after `>>`. A result that names the charge
    // without the outcome accuses an acquitted person on our behalf.
    const { description } = courtCaseMeta(
      { ...BASE, case_status: "फैसला >> सफाई" },
      "special",
    );
    expect(description).toContain("सफाई");
  });

  it("falls back to our label for the structured verdict", () => {
    const { description } = courtCaseMeta(
      { ...BASE, case_status: null, verdict_type: "ACQUITTED", verdict_date_bs: "2074-05-16" },
      "special",
    );
    expect(description).toContain("सफाई");
  });

  it("falls back to the register's raw status, and never invents an outcome", () => {
    const withStatus = courtCaseMeta({ ...BASE, case_status: "चलिरहेको" }, "special");
    expect(withStatus.description).toContain("चलिरहेको");

    const withNothing = courtCaseMeta(BASE, "special");
    expect(withNothing.description).not.toMatch(/सफाई|अभियोग दाबी पुग्ने|चलिरहेको/);
  });

  it("never names a party", () => {
    // Names are on the page when the API allows; putting them into every search
    // snippet is a separate editorial step this function must not take alone.
    const { title, description } = courtCaseMeta({ ...BASE, case_status: "फैसला >> सफाई" }, "special");
    for (const text of [title, description]) {
      expect(text).not.toContain("नमुना प्रतिवादी");
      expect(text).not.toContain("नेपाल सरकार");
    }
  });

  it("gives different records different descriptions", () => {
    // The old one was a single sentence shared by 19,217 pages.
    const a = courtCaseMeta(BASE, "special").description;
    const b = courtCaseMeta(
      { ...BASE, case_number: "081-CR-0079", case_type: "भ्रष्टाचार" },
      "kathmandudc",
    ).description;
    expect(a).not.toBe(b);
    // formatCourtName's own form for a district court, as the court cards show it.
    expect(b).toContain("Kathmandu जिल्ला अदालत");
  });

  it("stays inside the snippet budget", () => {
    const long = courtCaseMeta({ ...BASE, case_type: "क".repeat(300) }, "special");
    expect(long.description.length).toBeLessThanOrEqual(160);
  });
});
