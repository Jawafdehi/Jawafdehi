import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { CaseByline } from "@/components/case-detail/case-byline";

describe("CaseByline", () => {
  it("renders nothing when public_notes is empty, null, or whitespace", () => {
    for (const value of ["", "   ", null, undefined]) {
      const { container } = render(<CaseByline markdown={value} />);
      expect(container.querySelector('[data-testid="case-byline"]')).toBeNull();
      expect(container.textContent?.trim()).toBe("");
    }
  });

  it("renders the caseworker byline as markdown (bold + link, no raw asterisks)", () => {
    const markdown =
      "Documented by **the Jawafdehi research team**. First published Shrawan 2082 — see [the report](https://example.org/r).";
    const { container } = render(<CaseByline markdown={markdown} />);

    const byline = container.querySelector('[data-testid="case-byline"]');
    expect(byline).toBeTruthy();

    // Bold renders as <strong>, not literal asterisks.
    expect(container.querySelector("strong")?.textContent).toBe(
      "the Jawafdehi research team",
    );
    expect(container.textContent).not.toContain("**");

    // A markdown link renders as a real anchor to its href.
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.org/r");
    expect(link?.textContent).toBe("the report");
  });
});
