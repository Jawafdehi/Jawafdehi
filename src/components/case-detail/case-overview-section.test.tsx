import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { CaseOverviewSection } from "@/components/case-detail/case-overview-section";
import { padColspanTableHeaders } from "@/utils/rehype-colspan";

// Passthrough translations so assertions don't depend on i18n resources (mirrors ArticleView.test.tsx).
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

// These lock in that the case-description markdown pipeline (padColspanTableHeaders + react-markdown + remark-gfm + rehype-raw + rehypeColspan) renders well-formed input correctly, so the recurring "** shows as literal asterisks" report can only be authoring-side (malformed markdown), not a renderer defect.
describe("padColspanTableHeaders", () => {
  it("leaves well-formed emphasis and headings untouched", () => {
    const source = "# Heading text\n\nThis has **bold text** and _italic text_.";
    expect(padColspanTableHeaders(source)).toBe(source);
  });

  it("only pads the header of a colspan table and preserves inline markup inside it", () => {
    const source = "| **A** |\n| --- | --- |\n| x | y |";
    const padded = padColspanTableHeaders(source);
    // The **A** header cell is preserved verbatim; only an empty trailing cell is appended so the header width matches the delimiter row.
    expect(padded).toContain("**A**");
    expect(padded.split("\n")[0]).toBe("| **A** |  |");
  });
});

describe("CaseOverviewSection markdown rendering", () => {
  const description = [
    "# Heading text",
    "",
    "This has **bold text** and _italic text_ inline.",
    "",
    "- item one",
    "- item two",
  ].join("\n");

  it("renders well-formed markdown to real HTML elements through the case-overview path", () => {
    const { container } = render(
      <CaseOverviewSection description={description} title="Overview" />,
    );

    // Bold renders as <strong>, not literal asterisks.
    const strong = container.querySelector("strong");
    expect(strong?.textContent).toBe("bold text");
    expect(container.textContent).not.toContain("**bold text**");

    // Underscore emphasis renders as <em>.
    const em = container.querySelector("em");
    expect(em?.textContent).toBe("italic text");

    // A heading with a space after '#' renders as a heading element.
    expect(screen.getByRole("heading", { name: "Heading text" })).toBeTruthy();

    // A dash list renders as <ul>/<li>.
    const items = Array.from(container.querySelectorAll("ul > li")).map((li) => li.textContent?.trim());
    expect(items).toEqual(["item one", "item two"]);
  });
});
