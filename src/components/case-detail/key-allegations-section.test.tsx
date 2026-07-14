import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { KeyAllegationsSection } from "@/components/case-detail/key-allegations-section";

// BB-29: allegations were prefixed with a literal "#" (rendered "#1."). The
// marker must be a plain ordinal ("1.", "2.") with no stray hash.
describe("KeyAllegationsSection", () => {
  it("numbers allegations without a leading '#'", () => {
    const { container } = render(
      <KeyAllegationsSection
        allegations={["First allegation", "Second allegation"]}
        emptyLabel="None"
        title="Key Allegations"
      />,
    );

    const markers = Array.from(container.querySelectorAll("li > span")).map(
      (span) => span.textContent?.trim(),
    );
    expect(markers).toEqual(["1.", "2."]);
    expect(container.textContent).not.toContain("#");
    expect(container.textContent).toContain("First allegation");
    expect(container.textContent).toContain("Second allegation");
  });

  it("shows the empty label when there are no allegations", () => {
    const { container } = render(
      <KeyAllegationsSection allegations={[]} emptyLabel="No allegations recorded" title="Key Allegations" />,
    );

    expect(container.textContent).toContain("No allegations recorded");
    expect(container.querySelectorAll("li > span")).toHaveLength(0);
  });
});
