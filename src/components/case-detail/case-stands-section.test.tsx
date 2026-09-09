import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { CourtCase, TimelineEntry } from "@/types/jds";
import { CaseStandsSection } from "@/components/case-detail/case-stands-section";
import { deriveCaseProgress, type CaseProgress } from "@/lib/case-progress";

// Passthrough translations so assertions don't depend on i18n resources
// (mirrors case-detail-banner.test.tsx). t() returns its fallback or the key.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === "string" ? fallback : key),
    i18n: { language: "en" },
  }),
}));

const TIMELINE_TITLE = "Case Timeline";
const EVENT_TITLE = "CIAA files charges against six officials";

function docket(overrides: Partial<CourtCase> = {}): CourtCase {
  return {
    court_identifier: "special",
    case_number: "081-CR-0091",
    registration_date_bs: "२०८१ माघ १६",
    registration_date_ad: "2024-01-30",
    verdict_type: "ACQUITTED",
    verdict_date_bs: "२०८१ आषाढ ९",
    verdict_date_ad: "2024-06-23",
    hearings: [],
    ...overrides,
  } as CourtCase;
}

function timelineEntry(): TimelineEntry {
  return {
    title: EVENT_TITLE,
    description: "The charge sheet named six officials at the district office.",
    date: "2024-01-30",
    date_bs: "२०८१ माघ १६",
    end_date: null,
    end_date_bs: null,
  } as TimelineEntry;
}

function progressFor(dockets: CourtCase[]): CaseProgress {
  // Fixed `now` so the appeal-window arithmetic cannot drift with the clock.
  const progress = deriveCaseProgress(dockets, new Date("2026-08-10T00:00:00Z"));
  if (!progress) throw new Error("fixture produced no progress");
  return progress;
}

const renderSection = (timeline: TimelineEntry[]) =>
  render(
    <CaseStandsSection
      language="en"
      progress={progressFor([docket()])}
      timeline={timeline}
      timelineTitle={TIMELINE_TITLE}
    />,
  );

describe("CaseStandsSection", () => {
  it("leads with the docket-derived rail, not the editorial timeline", () => {
    renderSection([timelineEntry()]);

    expect(screen.getByText("caseDetail.progress.stage.charge_filed")).toBeTruthy();
    // The narrative event is behind the dialog, so it is absent until asked for.
    expect(screen.queryByText(EVENT_TITLE)).toBeNull();
  });

  it("takes over the #timeline anchor so existing deep links still resolve", () => {
    const { container } = renderSection([timelineEntry()]);
    expect(container.querySelector("section#timeline")).toBeTruthy();
  });

  it("opens the full timeline in a dialog on request", () => {
    renderSection([timelineEntry()]);

    fireEvent.click(screen.getByRole("button", { name: /openTimeline/ }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(EVENT_TITLE)).toBeTruthy();
  });

  it("offers no way in when the case has no timeline entries", () => {
    renderSection([]);

    // The rail still stands on its own; only the dialog affordance goes.
    expect(screen.getByText("caseDetail.progress.stage.charge_filed")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /openTimeline/ })).toBeNull();
  });
});
