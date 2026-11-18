import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import i18n from "@/i18n/config";
import en from "@/i18n/locales/en.json";
import ne from "@/i18n/locales/ne.json";
import { CourtCaseChain } from "@/components/courtcase/CourtCaseChain";
import { linkKind, parseCourtCaseIri, percent } from "@/utils/court-chain";
import { CourtCaseProfileView } from "@/components/courtcase/CourtCaseProfileView";
import type { CourtCase, CourtChainStep } from "@/types/jds";

// JAW-1: the court-case page shows the case's appeal history from the API's
// `court_chain`. Firm links read plainly; a sibling-trial set reads "possibly
// one of these", never as a certain link. No party is ever named.

const IRI = "https://jawafdehi.org/courtcase";

const trial = (n: string, extra: Partial<CourtChainStep> = {}): CourtChainStep => ({
  stage: "initial",
  courtcase_iri: `${IRI}/special/${n.toLowerCase()}`,
  court: "special",
  case_number: n,
  case_type: "भ्रष्टाचार",
  start: "2018-09-05",
  start_bs: "2075-05-20",
  end: "2020-02-03",
  end_bs: "2076-10-20",
  verdict_type: "ACQUITTED",
  this_case: false,
  ...extra,
});

const appeal = (
  n: string,
  from: Array<[string, number]>,
  probability: number,
  extra: Partial<CourtChainStep> = {},
): CourtChainStep => ({
  stage: "appeal",
  courtcase_iri: `${IRI}/supreme/${n.toLowerCase()}`,
  court: "supreme",
  case_number: n,
  case_type: "भ्रष्टाचार",
  start: "2020-07-20",
  start_bs: "2077-04-05",
  end: null,
  end_bs: null,
  verdict_type: null,
  this_case: false,
  probability,
  appealed_from: from.map(([t, p]) => ({
    courtcase_iri: `${IRI}/special/${t.toLowerCase()}`,
    probability: p,
  })),
  linked_on: "2026-11-18",
  ...extra,
});

// supreme/077-CR-0026 on production: a firm link.
const FIRM: CourtChainStep[] = [
  trial("075-CR-0048"),
  appeal("077-CR-0026", [["075-CR-0048", 0.982]], 0.982, {
    this_case: true,
    verdict_type: "AFFIRMED",
    end: "2023-03-07",
    end_bs: "2079-11-23",
  }),
];

// supreme/082-CR-1281 on production: a sibling-trial set.
const SET: CourtChainStep[] = [
  trial("079-CR-0154"),
  trial("080-CR-0191"),
  appeal(
    "082-CR-1281",
    [
      ["079-CR-0154", 0.459],
      ["080-CR-0191", 0.459],
    ],
    0.918,
    { this_case: true },
  ),
];

const renderChain = (chain?: CourtChainStep[] | null) =>
  render(
    <MemoryRouter>
      <CourtCaseChain chain={chain} />
    </MemoryRouter>,
  );

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("ne");
});

describe("chain helpers", () => {
  it("reads court and case number from a court case IRI", () => {
    expect(parseCourtCaseIri(`${IRI}/special/075-cr-0048`)).toEqual({
      court: "special",
      caseNumber: "075-cr-0048",
    });
    expect(parseCourtCaseIri("https://example.org/x")).toBeNull();
  });

  it("never rounds a probability to a certain 100% or to 0%", () => {
    expect(percent(0.982)).toBe("98%");
    expect(percent(0.459)).toBe("46%");
    expect(percent(0.999)).toBe("99%");
    expect(percent(0.001)).toBe("1%");
  });

  it("tells a sibling set from an appeal of each of several cases", () => {
    expect(linkKind(FIRM[1])).toBe("single");
    expect(linkKind(SET[2])).toBe("oneOf");
    const eachOf = appeal(
      "080-CR-0001",
      [
        ["078-CR-0001", 0.982],
        ["078-CR-0002", 0.964],
      ],
      0.964,
    );
    expect(linkKind(eachOf)).toBe("eachOf");
  });

  it("keeps a highly skewed sibling set a set", () => {
    const skewed = (from: Array<[string, number]>, whole: number) =>
      linkKind(appeal("082-CR-0001", from, whole));
    expect(skewed([["081-CR-0001", 0.999], ["081-CR-0002", 0.001]], 1)).toBe("oneOf");
    // A candidate at 1.0 still leaves the capped sum above the lowest candidate.
    expect(skewed([["081-CR-0001", 1], ["081-CR-0002", 0.2]], 1)).toBe("oneOf");
    expect(skewed([["081-CR-0001", 0.5], ["081-CR-0002", 0.4], ["081-CR-0003", 0.1]], 1)).toBe(
      "oneOf",
    );
  });
});

describe("CourtCaseChain", () => {
  it("shows a firm link plainly, with its probability, first court first", async () => {
    await i18n.changeLanguage("en");
    renderChain(FIRM);

    expect(screen.getByRole("heading", { name: en.courtCaseProfile.chain.heading })).toBeTruthy();
    const items = within(screen.getByTestId("court-case-chain")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain(en.courtCaseProfile.chain.stage.initial);
    expect(items[0].textContent).toContain("Special Court 075-CR-0048");
    expect(items[0].textContent).toContain("Acquitted");

    expect(items[1].getAttribute("aria-current")).toBe("page");
    expect(items[1].textContent).toContain(en.courtCaseProfile.chain.thisCase);
    expect(items[1].textContent).toContain("Upheld");
    const line = items[1].querySelector("[data-link-kind='single']");
    expect(line?.textContent).toContain(`${en.courtCaseProfile.chain.appealOf} Special Court 075-CR-0048`);
    expect(line?.textContent).toContain("98% likely");
    expect(line?.textContent).not.toContain("Probably");

    // The other case links to its page; the case asked about does not link to itself.
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(new Set(links)).toEqual(new Set(["/courtcase/special/075-cr-0048"]));
  });

  it("says 'probably' for a single link below the plain threshold", async () => {
    await i18n.changeLanguage("en");
    renderChain([trial("075-CR-0048"), appeal("077-CR-0026", [["075-CR-0048", 0.625]], 0.625)]);
    const line = document.querySelector("[data-link-kind='single']");
    expect(line?.textContent).toContain(en.courtCaseProfile.chain.probablyAppealOf);
    expect(line?.textContent).toContain("63% likely");
  });

  it("shows a sibling-trial set as 'possibly one of these', each with its own probability", async () => {
    await i18n.changeLanguage("en");
    renderChain(SET);

    const block = document.querySelector("[data-link-kind='oneOf']") as HTMLElement;
    expect(block.textContent).toContain(en.courtCaseProfile.chain.oneOf);
    const candidates = within(block).getAllByRole("listitem");
    expect(candidates.map((c) => c.textContent)).toEqual([
      "Special Court 079-CR-0154 · 46% likely",
      "Special Court 080-CR-0191 · 46% likely",
    ]);
    // No false certainty: neither the plain wording nor the step's summed 92%.
    expect(block.textContent).not.toContain(`${en.courtCaseProfile.chain.appealOf} `);
    expect(document.body.textContent).not.toContain("92%");
  });

  it("uses the Nepali copy on the Nepali site", async () => {
    await i18n.changeLanguage("ne");
    renderChain(SET);
    expect(screen.getByRole("heading", { name: ne.courtCaseProfile.chain.heading })).toBeTruthy();
    expect(document.body.textContent).toContain(ne.courtCaseProfile.chain.oneOf);
    expect(document.body.textContent).toContain("विशेष अदालत 079-CR-0154");
    expect(document.body.textContent).toContain("46% सम्भावना");
    expect(document.body.textContent).toContain(ne.courtCaseProfile.chain.stage.initial);
  });

  it.each([
    ["empty", []],
    ["missing", undefined],
    ["null", null],
  ])("renders nothing when the chain is %s", async (_label, chain) => {
    await i18n.changeLanguage("en");
    const { container } = renderChain(chain as CourtChainStep[] | null | undefined);
    expect(container.innerHTML).toBe("");
  });
});

const BASE_CASE: CourtCase = {
  case_number: "077-CR-0026",
  court_identifier: "supreme",
  registration_date_bs: null,
  registration_date_ad: null,
  case_type: "भ्रष्टाचार",
  division: null,
  category: null,
  section: null,
  plaintiff: "नेपाल सरकार",
  defendant: "राम बहादुर थापा",
  original_case_number: "077-CR-0026",
  case_id: null,
  priority: null,
  registration_number: "",
  case_status: null,
  verdict_date_bs: null,
  verdict_date_ad: null,
  verdict_judge: null,
  status: "",
  hearings: [],
  entities: [],
};

const renderView = (courtCase: CourtCase) =>
  render(
    <MemoryRouter>
      <CourtCaseProfileView
        courtCase={courtCase}
        caseNumber="077-CR-0026"
        courtIdentifier="supreme"
        isLoading={false}
      />
    </MemoryRouter>,
  );

describe("CourtCaseProfileView appeal history section", () => {
  it("sits between parties and case activity", async () => {
    await i18n.changeLanguage("en");
    renderView({ ...BASE_CASE, court_chain: FIRM });
    const ids = Array.from(document.querySelectorAll("article > section")).map((s) => s.id);
    expect(ids.indexOf("appeals")).toBe(ids.indexOf("parties") + 1);
    expect(ids.indexOf("activity")).toBe(ids.indexOf("appeals") + 1);
  });

  it("is hidden for an older API that sends no court_chain", async () => {
    await i18n.changeLanguage("en");
    renderView(BASE_CASE);
    expect(document.getElementById("appeals")).toBeNull();
  });

  it("never shows a party name inside the chain", async () => {
    await i18n.changeLanguage("en");
    renderView({ ...BASE_CASE, court_chain: SET });
    const chain = document.getElementById("appeals") as HTMLElement;
    expect(chain.textContent).not.toContain("राम बहादुर थापा");
  });
});
