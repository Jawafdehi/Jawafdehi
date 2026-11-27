import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

import "../../../tests/support/resize-observer";
import deepak from "../../../tests/fixtures/series/deepak-bhatta-affair.json";
import ncell from "../../../tests/fixtures/series/ncell-tax-dispute.json";
import { OVERLAP_REASONS, withBigoTotal } from "../../../tests/support/series-bigo";
import i18n from "@/i18n/config";
import { CaseSeriesBanner } from "@/components/series/CaseSeriesBanner";
import { SeriesPartOfChips } from "@/components/series/SeriesPartOfChips";
import { SeriesResultCard } from "@/components/series/SeriesResultCard";
import { SeriesTimelineChart } from "@/components/series/SeriesTimelineChart";
import SeriesDetailPage from "@/pages/SeriesDetail";
import { getSeries } from "@/services/series-api";
import type { ArchiveSearchResult } from "@/types/search";
import type { SeriesDetail } from "@/types/series";

vi.mock("@/services/series-api", () => ({ getSeries: vi.fn() }));

const DEEPAK = deepak as unknown as SeriesDetail;
const NCELL = ncell as unknown as SeriesDetail;
const TODAY = Date.UTC(2026, 10, 26);

beforeAll(async () => {
  await i18n.changeLanguage("ne");
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.mocked(getSeries).mockReset();
});

function wrap(ui: ReactNode, path = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

function renderPage(slug = "deepak-bhatta-affair") {
  return wrap(
    <Routes>
      <Route element={<SeriesDetailPage />} path="/series/:slug" />
    </Routes>,
    `/series/${slug}/`,
  );
}

const chartRows = () => within(screen.getByRole("group", { name: /अदालती मुद्दाहरूको समयरेखा चार्ट/ })).getAllByRole("button");

describe("series page", () => {
  it("renders the title, kicker and every member as a link to its case", async () => {
    vi.mocked(getSeries).mockResolvedValue(DEEPAK);
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "दीपक भट्ट प्रकरण" })).toBeTruthy();
    expect(screen.getByText("मुद्दा शृङ्खला")).toBeTruthy();
    for (const member of DEEPAK.members) {
      const link = screen.getByRole("link", { name: new RegExp(member.case.title.slice(0, 30).replace(/[()]/g, ".")) });
      expect(link.getAttribute("href")).toBe(`/case/${member.case.slug}/`);
    }
    // The largest बिगो, never a sum, with the note saying so.
    expect(screen.getByText("रु. २६.६३ अर्ब")).toBeTruthy();
    expect(screen.getByText("सबैभन्दा ठूलो बिगो दाबी (मुद्दा १)")).toBeTruthy();
    expect(screen.getByText(/बिगो जोडिएको छैन/)).toBeTruthy();
  });

  it("shows the total of distinct claims, the overlap chips and their reasons", async () => {
    vi.mocked(getSeries).mockResolvedValue(withBigoTotal(DEEPAK));
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "दीपक भट्ट प्रकरण" });
    const stats = screen.getByRole("region", { name: "मुख्य तथ्याङ्क" });
    expect(within(stats).getByText("रु. २६.८४ अर्ब")).toBeTruthy();
    expect(within(stats).getByText("जम्मा बिगो (छुट्टाछुट्टै दाबी)")).toBeTruthy();
    expect(within(stats).getByText("२ मुद्दाको; ३ मुद्दाको दाबी मुद्दा १ भित्र पर्छ")).toBeTruthy();
    expect(within(stats).queryByText(/सबैभन्दा ठूलो बिगो/)).toBeNull();
    expect(screen.getByText(/दोहोरो नगनियोस्/)).toBeTruthy();
    expect(screen.queryByText(/बिगो जोडिएको छैन/)).toBeNull();

    const chips = screen.getAllByRole("button", { name: "मुद्दा १ को दाबीभित्र" });
    expect(chips).toHaveLength(3);
    // Each overlapping member keeps its own बिगो.
    expect(screen.getByText("बिगो रु. ४२.१५ करोड")).toBeTruthy();
    // The reason is the chip's description (hover/focus), and a tap toggles it.
    const banking = chips[0];
    const tip = document.getElementById(banking.getAttribute("aria-describedby")!)!;
    expect(tip.getAttribute("role")).toBe("tooltip");
    expect(tip.textContent).toContain(OVERLAP_REASONS["deepak-bhatta-banking-offence-patan-hc-082-cb-0048"]);
    expect(tip.className).toContain("print:block");
    const shown = () => !tip.className.split(" ").includes("hidden");
    expect(shown()).toBe(false);
    // Hover shows it; leaving hides it.
    fireEvent.mouseEnter(banking.parentElement!);
    expect(shown()).toBe(true);
    fireEvent.mouseLeave(banking.parentElement!);
    expect(shown()).toBe(false);
    // Keyboard focus shows it; Escape hides it although focus stays.
    fireEvent.focus(banking);
    expect(shown()).toBe(true);
    fireEvent.keyDown(banking, { key: "Escape" });
    expect(shown()).toBe(false);
    expect(banking.getAttribute("aria-expanded")).toBe("false");
    fireEvent.blur(banking);
    // A tap (focus + click) shows it; a second tap hides it while focus stays.
    fireEvent.focus(banking);
    fireEvent.click(banking);
    expect(shown()).toBe(true);
    expect(banking.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(banking);
    expect(shown()).toBe(false);
  });

  it("links each accused to the entity page with the number of cases naming them", async () => {
    vi.mocked(getSeries).mockResolvedValue(DEEPAK);
    renderPage();
    const link = await screen.findByRole("link", { name: /दीपक भट्ट ४ मुद्दामा/ });
    expect(link.getAttribute("href")).toBe("/entity/person/deepak-bhatta/");
  });

  it("collapses the sources after six but keeps the rest mounted for print", async () => {
    vi.mocked(getSeries).mockResolvedValue(DEEPAK);
    renderPage();
    const toggle = await screen.findByRole("button", { name: `सबै २० स्रोत देखाउनुहोस्` });
    const section = document.getElementById("sources")!;
    const rows = section.querySelectorAll("li");
    expect(rows).toHaveLength(DEEPAK.sources.length);
    expect([...rows].filter((li) => li.className.includes("print:flex"))).toHaveLength(DEEPAK.sources.length - 6);
    fireEvent.click(toggle);
    expect(section.querySelectorAll("li.hidden")).toHaveLength(0);
  });

  it("shows the latest eight timeline events and filters by member", async () => {
    vi.mocked(getSeries).mockResolvedValue(DEEPAK);
    renderPage();
    const showAll = await screen.findByRole("button", { name: /सबै २१ घटना देखाउनुहोस्/ });
    const filters = screen.getByRole("group", { name: "मुद्दाअनुसार घटना छान्नुहोस्" });
    expect(within(filters).getByRole("button", { name: "सबै (२१)" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(filters).getByRole("button", { name: "मुद्दा ४" }));
    expect(within(filters).getByRole("button", { name: "मुद्दा ४" }).getAttribute("aria-pressed")).toBe("true");
    expect(showAll).toBeTruthy();
  });

  it("shows a not-found state for a series the API does not publish", async () => {
    vi.mocked(getSeries).mockResolvedValue(null);
    renderPage("nope");
    expect(await screen.findByRole("heading", { level: 1, name: "यो मुद्दा शृङ्खला भेटिएन" })).toBeTruthy();
  });

  it("shows a could-not-load state when the request fails", async () => {
    vi.mocked(getSeries).mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "मुद्दा शृङ्खला लोड गर्न सकिएन" })).toBeTruthy();
  });
});

describe("SeriesTimelineChart", () => {
  it("draws one row per court case", () => {
    wrap(<SeriesTimelineChart courtCases={DEEPAK.court_cases} members={DEEPAK.members} today={TODAY} />);
    expect(chartRows()).toHaveLength(DEEPAK.court_cases.length);
  });

  it("opens an in-page popup naming the member the row belongs to, and closes it", () => {
    wrap(<SeriesTimelineChart courtCases={DEEPAK.court_cases} members={DEEPAK.members} today={TODAY} />);
    fireEvent.click(screen.getByRole("button", { name: "082-CR-0154, विशेष अदालत" }));
    const popup = screen.getByRole("dialog", { name: "082-CR-0154 · विशेष अदालत" });
    expect(within(popup).getByText(/शृङ्खलामा:/)).toBeTruthy();
    expect(within(popup).getByText("मुद्दा १")).toBeTruthy();
    expect(within(popup).getByRole("link", { name: /अदालती मुद्दा हेर्नुहोस्/ }).getAttribute("href")).toBe(
      "/courtcase/special/082-cr-0154",
    );
    fireEvent.click(within(popup).getByRole("button", { name: "बन्द गर्नुहोस्" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the popup on a press outside it", () => {
    wrap(<SeriesTimelineChart courtCases={DEEPAK.court_cases} members={DEEPAK.members} today={TODAY} />);
    fireEvent.click(chartRows()[0]);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("moves focus into a popup opened from the keyboard and back to its row on Escape", () => {
    wrap(<SeriesTimelineChart courtCases={DEEPAK.court_cases} members={DEEPAK.members} today={TODAY} />);
    const row = chartRows()[1];
    row.focus();
    fireEvent.keyDown(row, { key: "Enter" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "बन्द गर्नुहोस्" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(row);
  });

  it("draws no arrow for a case decided on an unrecorded date", () => {
    const decided = [{ ...DEEPAK.court_cases[0], verdict_type: "CLAIM_DENIED", verdict_date_ad: null }];
    wrap(<SeriesTimelineChart courtCases={decided} members={DEEPAK.members} today={TODAY} />);
    const [row] = chartRows();
    expect(row.querySelector("path")).toBeNull();
    fireEvent.click(row);
    expect(within(screen.getByRole("dialog")).getByText(/दाबी नपुगेको/)).toBeTruthy();
  });

  it("regroups the rows by member case on the toggle", () => {
    const { container } = wrap(
      <SeriesTimelineChart courtCases={DEEPAK.court_cases} members={DEEPAK.members} today={TODAY} />,
    );
    const groups = () => [...container.querySelectorAll("[data-chart-group]")].map((g) => g.getAttribute("data-chart-group"));
    expect(groups()).toEqual(["court:special", "court:kathmandudc", "court:patanhc"].filter((k) => groups().includes(k)));
    expect(groups().every((k) => k?.startsWith("court:"))).toBe(true);
    const byMember = screen.getByRole("button", { name: "मुद्दाअनुसार" });
    fireEvent.click(byMember);
    expect(byMember.getAttribute("aria-pressed")).toBe("true");
    expect(groups()).toEqual(DEEPAK.members.map((m) => `member:${m.case.slug}`));
    expect(chartRows()).toHaveLength(DEEPAK.court_cases.length);
    expect(screen.getByTitle(/^मुद्दा १: /)).toBeTruthy();
  });

  it("labels a member's out-of-court proceedings as such", () => {
    wrap(<SeriesTimelineChart courtCases={NCELL.court_cases} members={NCELL.members} today={TODAY} />);
    expect(screen.getByTitle("अदालत बाहिरको प्रक्रिया")).toBeTruthy();
    const row = screen.getByRole("button", { name: "ICSID, अदालत बाहिरको प्रक्रिया" });
    fireEvent.click(row);
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: /मुद्दा हेर्नुहोस्/ })).toBeTruthy();
  });
});

describe("SeriesResultCard", () => {
  const hit = (card: unknown): ArchiveSearchResult =>
    ({
      type: "series",
      id: "https://jawafdehi.org/series/deepak-bhatta-affair",
      source_app: "jawafdehi",
      title: { ne: "दीपक भट्ट प्रकरण", en: "Deepak Bhatta Affair" },
      snippet: { ne: null, en: null },
      score: 3,
      url: "/series/deepak-bhatta-affair/",
      api_url: "/api/series/deepak-bhatta-affair/",
      matched_fields: [],
      extra: {},
      card,
    }) as ArchiveSearchResult;

  it("shows the kicker, the title link, the totals and each member's court-case numbers", () => {
    wrap(
      <SeriesResultCard
        result={hit({
          slug: DEEPAK.slug,
          title: DEEPAK.title,
          summary: DEEPAK.summary,
          totals: DEEPAK.totals,
          members: DEEPAK.members.map((m) => ({
            ordinal: m.ordinal,
            slug: m.case.slug,
            court_case_numbers: m.case.court_cases.map((iri) => iri.split("/").pop()!.toUpperCase()),
          })),
        })}
      />,
    );
    expect(screen.getByText("मुद्दा शृङ्खला")).toBeTruthy();
    expect(screen.getByRole("link", { name: "दीपक भट्ट प्रकरण" }).getAttribute("href")).toBe("/series/deepak-bhatta-affair/");
    expect(screen.getByText("५ मुद्दा · ५ अदालती मुद्दा")).toBeTruthy();
    expect(screen.getByText("८ आरोपित")).toBeTruthy();
    const members = within(screen.getByRole("list", { name: "सदस्य मुद्दाहरूका अदालती मुद्दा" })).getAllByRole("listitem");
    expect(members).toHaveLength(5);
    expect(members[0].textContent).toBe("१. 082-CR-0154");
  });

  it("shows the total of distinct claims when the card's totals carry one", () => {
    const series = withBigoTotal(DEEPAK);
    wrap(
      <SeriesResultCard
        result={hit({ slug: series.slug, title: series.title, summary: series.summary, totals: series.totals, members: [] })}
      />,
    );
    expect(screen.getByText("जम्मा बिगो (छुट्टाछुट्टै दाबी) रु. २६.८४ अर्ब")).toBeTruthy();
    expect(screen.queryByText(/सबैभन्दा ठूलो बिगो/)).toBeNull();
  });

  it("falls back to the hit's own title when the index has no card yet", () => {
    wrap(<SeriesResultCard result={hit(undefined)} />);
    expect(screen.getByRole("link", { name: "दीपक भट्ट प्रकरण" }).getAttribute("href")).toBe("/series/deepak-bhatta-affair/");
  });
});

describe("SeriesPartOfChips", () => {
  it("links a case card to its series as 'part of · n/N'", () => {
    wrap(<SeriesPartOfChips series={[{ slug: "deepak-bhatta-affair", title: DEEPAK.title, ordinal: 3, member_count: 5 }]} />);
    const chip = screen.getByRole("link", { name: "दीपक भट्ट प्रकरणको भाग · ३/५" });
    expect(chip.getAttribute("href")).toBe("/series/deepak-bhatta-affair/");
  });

  it("renders nothing without series", () => {
    const { container } = wrap(<SeriesPartOfChips series={undefined} />);
    expect(container.querySelector("a")).toBeNull();
  });
});

describe("CaseSeriesBanner", () => {
  const ref = [{ slug: "deepak-bhatta-affair", title: DEEPAK.title, ordinal: 3, member_count: 5 }];

  it("links the series and, once its members load, the previous and next cases", async () => {
    vi.mocked(getSeries).mockResolvedValue(DEEPAK);
    wrap(<CaseSeriesBanner caseSlug="cib-463" series={ref} />);
    const nav = screen.getByRole("navigation", { name: "मुद्दा शृङ्खला" });
    expect(within(nav).getByRole("link", { name: "दीपक भट्ट प्रकरण" }).getAttribute("href")).toBe("/series/deepak-bhatta-affair/");
    expect(nav.textContent).toContain("५ मुद्दामध्ये ३औँ हो");
    const prev = await within(nav).findByRole("link", { name: /^अघिल्लो मुद्दा २:/ });
    expect(prev.getAttribute("href")).toBe(`/case/${DEEPAK.members[1].case.slug}/`);
    expect(within(nav).getByRole("link", { name: /^अर्को मुद्दा ४:/ }).getAttribute("href")).toBe(
      `/case/${DEEPAK.members[3].case.slug}/`,
    );
    expect(within(nav).getByRole("link", { name: "सबै मुद्दा र समयरेखा" })).toBeTruthy();
  });

  it("keeps the series link when the series cannot be fetched", async () => {
    vi.mocked(getSeries).mockRejectedValue(new Error("not deployed"));
    wrap(<CaseSeriesBanner caseSlug="cib-463" series={ref} />);
    await waitFor(() => expect(getSeries).toHaveBeenCalled());
    const nav = screen.getByRole("navigation", { name: "मुद्दा शृङ्खला" });
    expect(within(nav).getByRole("link", { name: "सबै मुद्दा र समयरेखा" })).toBeTruthy();
    expect(within(nav).queryByRole("link", { name: /अघिल्लो/ })).toBeNull();
  });

  it("renders nothing when the case payload has no series key", () => {
    const { container } = wrap(<CaseSeriesBanner caseSlug="cib-463" series={undefined} />);
    expect(container.querySelector("nav")).toBeNull();
    expect(getSeries).not.toHaveBeenCalled();
  });
});
