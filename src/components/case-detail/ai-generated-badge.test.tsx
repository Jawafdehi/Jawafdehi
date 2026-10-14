import { describe, it, expect, beforeAll, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CaseSectionHeading } from "@/components/case-detail/case-section-heading";
import { CaseOverviewSection } from "@/components/case-detail/case-overview-section";
import { CaseTimelineSection } from "@/components/case-detail/case-timeline-section";
import { KeyAllegationsSection } from "@/components/case-detail/key-allegations-section";
import { isAiGenerated } from "@/utils/ai-generated";

// Passthrough translations: t() returns the key, so assertions name the keys.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

// Radix Popper and CollapsibleCaseContent both observe size; jsdom has no
// ResizeObserver.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const renderInRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
const badges = () => screen.queryAllByTestId("ai-generated-badge");

describe("isAiGenerated", () => {
  it("is true only for a section the list names", () => {
    expect(isAiGenerated(["description", "timeline"], "description")).toBe(true);
    expect(isAiGenerated(["description", "timeline"], "key_allegations")).toBe(false);
  });

  it("treats an absent or empty list as no AI-generated sections", () => {
    expect(isAiGenerated(undefined, "description")).toBe(false);
    expect(isAiGenerated(null, "timeline")).toBe(false);
    expect(isAiGenerated([], "key_allegations")).toBe(false);
  });
});

describe("CaseSectionHeading AI-generated label", () => {
  it("shows no label by default", () => {
    renderInRouter(<CaseSectionHeading>Overview</CaseSectionHeading>);
    expect(badges()).toHaveLength(0);
  });

  it("shows the label inside the heading when the section is AI-generated", () => {
    renderInRouter(<CaseSectionHeading aiGenerated>Overview</CaseSectionHeading>);
    const badge = screen.getByTestId("ai-generated-badge");
    expect(badge.closest("h2")).not.toBeNull();
    expect(badge.textContent).toContain("caseDetail.aiGenerated.label");
  });

  it("opens the explanation and the Our process link on click or tap", () => {
    renderInRouter(<CaseSectionHeading aiGenerated>Overview</CaseSectionHeading>);
    expect(screen.queryByText("caseDetail.aiGenerated.explanation")).toBeNull();

    fireEvent.click(screen.getByTestId("ai-generated-badge"));

    expect(screen.getByText("caseDetail.aiGenerated.explanation")).toBeTruthy();
    const link = screen.getByRole("link", { name: "nav.ourProcess" });
    expect(link.getAttribute("href")).toBe("/our-process");

    // A second tap closes it again.
    fireEvent.click(screen.getByTestId("ai-generated-badge"));
    expect(screen.queryByText("caseDetail.aiGenerated.explanation")).toBeNull();
  });

  it("opens on mouse hover and stays open when the hovered badge is clicked", () => {
    vi.useFakeTimers();
    try {
      renderInRouter(<CaseSectionHeading aiGenerated>Overview</CaseSectionHeading>);
      const badge = screen.getByTestId("ai-generated-badge");

      fireEvent.pointerEnter(badge, { pointerType: "mouse" });
      expect(screen.getByText("caseDetail.aiGenerated.explanation")).toBeTruthy();

      // Clicking a hover-opened badge pins it rather than toggling it shut.
      fireEvent.click(badge);
      fireEvent.pointerLeave(badge, { pointerType: "mouse" });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.getByText("caseDetail.aiGenerated.explanation")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes a hover-opened explanation when the mouse leaves", () => {
    vi.useFakeTimers();
    try {
      renderInRouter(<CaseSectionHeading aiGenerated>Overview</CaseSectionHeading>);
      const badge = screen.getByTestId("ai-generated-badge");

      fireEvent.pointerEnter(badge, { pointerType: "mouse" });
      fireEvent.pointerLeave(badge, { pointerType: "mouse" });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.queryByText("caseDetail.aiGenerated.explanation")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("case sections pass the label through to their heading", () => {
  const timeline = [{ date: "2024-03-12", title: "Charge sheet filed", description: "" }];

  it("labels each section only when told to", () => {
    const { unmount } = renderInRouter(
      <>
        <CaseOverviewSection aiGenerated description="Text" title="Overview" />
        <KeyAllegationsSection allegations={["One"]} emptyLabel="None" title="Allegations" />
        <CaseTimelineSection aiGenerated language="en" timeline={timeline} title="Timeline" />
      </>,
    );
    const labelled = badges().map((b) => b.closest("section")?.id);
    expect(labelled).toEqual(["overview", "timeline"]);
    unmount();

    renderInRouter(
      <>
        <CaseOverviewSection description="Text" title="Overview" />
        <KeyAllegationsSection aiGenerated allegations={["One"]} emptyLabel="None" title="Allegations" />
        <CaseTimelineSection language="en" timeline={timeline} title="Timeline" />
      </>,
    );
    expect(badges().map((b) => b.closest("section")?.id)).toEqual(["allegations"]);
  });
});
