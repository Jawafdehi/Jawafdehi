import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import i18n from "@/i18n/config";
import en from "@/i18n/locales/en.json";
import ne from "@/i18n/locales/ne.json";
import { CourtCaseOrders } from "@/components/courtcase/CourtCaseOrders";
import { CourtCaseProfileView } from "@/components/courtcase/CourtCaseProfileView";
import type { CourtCase, CourtCaseOrder } from "@/types/jds";

// JAW-76: the court-case page lists the orders the case references, as kind +
// date + a link to the existing order page. Never a title (it names parties).

const ORDERS: CourtCaseOrder[] = [
  {
    iri: "https://jawafdehi.org/material/court_order/special.076-cr-0438",
    kind: "verdict",
    order_date_bs: "2080-09-05",
    order_date_ad: "2023-12-21",
    readable: true,
  },
  {
    iri: "https://jawafdehi.org/material/court_order/special.076-cr-0438.2",
    kind: "order",
    order_date_bs: "2079-04-12",
    order_date_ad: "2022-07-28",
    readable: true,
  },
  {
    iri: "https://jawafdehi.org/material/court_order/special.076-cr-0438.3",
    kind: "judgment",
    order_date_bs: "2078-11-30",
    order_date_ad: "2022-03-14",
    readable: false,
  },
];

const BASE_CASE: CourtCase = {
  case_number: "076-CR-0438",
  court_identifier: "special",
  registration_date_bs: null,
  registration_date_ad: null,
  case_type: "भ्रष्टाचार",
  division: null,
  category: null,
  section: null,
  plaintiff: "नेपाल सरकार",
  defendant: "राम बहादुर थापा",
  original_case_number: "076-CR-0438",
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

const renderOrders = (orders?: CourtCaseOrder[] | null) =>
  render(
    <MemoryRouter>
      <CourtCaseOrders orders={orders} />
    </MemoryRouter>,
  );

const renderView = (courtCase: CourtCase) =>
  render(
    <MemoryRouter>
      <CourtCaseProfileView
        courtCase={courtCase}
        caseNumber="076-CR-0438"
        courtIdentifier="special"
        isLoading={false}
      />
    </MemoryRouter>,
  );

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("ne");
});

describe("CourtCaseOrders", () => {
  it("lists each order as kind · date · read link, with a count in the heading", async () => {
    await i18n.changeLanguage("en");
    renderOrders(ORDERS);

    expect(screen.getByRole("heading", { name: "Court orders (3)" })).toBeTruthy();
    const items = within(screen.getByTestId("court-case-orders")).getAllByRole("listitem");
    expect(items).toHaveLength(3);

    expect(items[0].textContent).toContain(en.courtCaseProfile.orders.kind.judgment);
    // BS date, Nepal-first like the activity timeline.
    expect(items[0].textContent).toContain("२०८० पौष ५");
    expect(items[1].textContent).toContain(en.courtCaseProfile.orders.kind.order);
    // `judgment` is an alias of the API's `verdict`.
    expect(items[2].textContent).toContain(en.courtCaseProfile.orders.kind.judgment);

    const links = screen.getAllByRole("link", { name: en.courtCaseProfile.orders.read });
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/material/court_order/special.076-cr-0438",
      "/material/court_order/special.076-cr-0438.2",
    ]);
  });

  it("shows 'Text not available yet' instead of a link for an unreadable order", async () => {
    await i18n.changeLanguage("en");
    renderOrders(ORDERS);

    const items = within(screen.getByTestId("court-case-orders")).getAllByRole("listitem");
    expect(within(items[2]).queryByRole("link")).toBeNull();
    expect(items[2].textContent).toContain(en.courtCaseProfile.orders.notReadable);
  });

  it("renders an unrecognised kind as a generic court order and a missing date as unrecorded", async () => {
    await i18n.changeLanguage("en");
    renderOrders([
      {
        iri: "https://jawafdehi.org/material/court_order/x",
        kind: "something-new",
        order_date_bs: null,
        order_date_ad: null,
        readable: true,
      },
    ]);
    const item = within(screen.getByTestId("court-case-orders")).getByRole("listitem");
    expect(item.textContent).toContain(en.courtCaseProfile.orders.kind.unknown);
    expect(item.textContent).toContain(en.courtCaseProfile.orders.undated);
  });

  it("labels the API's `verdict` kind as a judgment, not a generic court order", async () => {
    await i18n.changeLanguage("en");
    renderOrders([ORDERS[0]]);
    const item = within(screen.getByTestId("court-case-orders")).getByRole("listitem");
    expect(item.textContent).toContain(en.courtCaseProfile.orders.kind.judgment);
    expect(item.textContent).not.toContain(en.courtCaseProfile.orders.kind.unknown);
  });

  it("does not link an IRI that is not a material IRI", async () => {
    await i18n.changeLanguage("en");
    renderOrders([{ ...ORDERS[0], iri: "https://example.org/whatever" }]);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("uses the Nepali copy on the Nepali site", async () => {
    await i18n.changeLanguage("ne");
    renderOrders(ORDERS);

    expect(screen.getByRole("heading", { name: "अदालतका आदेशहरू (3)" })).toBeTruthy();
    const items = within(screen.getByTestId("court-case-orders")).getAllByRole("listitem");
    expect(items[0].textContent).toContain("फैसला");
    expect(items[1].textContent).toContain("आदेश");
    expect(items[2].textContent).toContain("फैसला");
    expect(items[2].textContent).toContain(ne.courtCaseProfile.orders.notReadable);
    expect(screen.getAllByRole("link", { name: ne.courtCaseProfile.orders.read })).toHaveLength(2);
  });

  it.each([
    ["empty", []],
    ["missing", undefined],
    ["null", null],
  ])("renders nothing when the list is %s", async (_label, orders) => {
    await i18n.changeLanguage("en");
    const { container } = renderOrders(orders as CourtCaseOrder[] | null | undefined);
    expect(container.innerHTML).toBe("");
  });
});

describe("CourtCaseProfileView court orders section", () => {
  it("sits between case activity and source", async () => {
    await i18n.changeLanguage("en");
    renderView({ ...BASE_CASE, orders: ORDERS });

    const ids = Array.from(document.querySelectorAll("article > section")).map((s) => s.id);
    expect(ids.indexOf("orders")).toBe(ids.indexOf("activity") + 1);
    expect(ids.indexOf("source")).toBe(ids.indexOf("orders") + 1);
  });

  it("is hidden for an older API that sends no orders key", async () => {
    await i18n.changeLanguage("en");
    renderView(BASE_CASE);
    expect(document.getElementById("orders")).toBeNull();
    expect(document.getElementById("source")).not.toBeNull();
  });

  it("is hidden when the case has no orders", async () => {
    await i18n.changeLanguage("en");
    renderView({ ...BASE_CASE, orders: [] });
    expect(document.getElementById("orders")).toBeNull();
  });
});
