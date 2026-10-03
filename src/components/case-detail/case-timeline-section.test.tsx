import { describe, it, expect, beforeAll, vi } from "vitest";
import { render } from "@testing-library/react";

import { CaseTimelineSection } from "@/components/case-detail/case-timeline-section";
import type { TimelineEntry } from "@/types/jds";

// Passthrough translations so assertions don't depend on i18n resources
// (mirrors case-overview-section.test.tsx).
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

// CollapsibleCaseContent measures its content with a ResizeObserver, which jsdom does not implement.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const timeline: TimelineEntry[] = [
  {
    date: "2024-03-12",
    title: "Special Court registers the charge sheet",
    description: "CIAA files against three former officials.",
  },
];

function renderSection() {
  return render(
    <CaseTimelineSection language="en" timeline={timeline} title="Timeline" />,
  );
}

// The timeline heading used to live inside ChangelogContent on the old sans
// style, which left it as the one content section that skipped the case-detail
// design pass. It is now the caller's, rendered through CaseSectionHeading.
describe("CaseTimelineSection heading", () => {
  it("renders its title through the shared editorial section heading", () => {
    const { container } = renderSection();
    const headings = container.querySelectorAll("h2");

    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toContain("Timeline");
    expect(headings[0].className).toContain("font-case-section-title");
  });

  it("keeps the heading outside the collapsible so it never counts against the clamp", () => {
    const { container } = renderSection();
    const section = container.querySelector("section#timeline");

    // Direct child of the section, ahead of the collapsible — same shape as
    // every other case-detail section.
    expect(section?.firstElementChild?.tagName).toBe("H2");
  });
});
