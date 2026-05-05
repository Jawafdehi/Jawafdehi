import { describe, expect, it, vi } from "vitest";
import {
  CASE_COMMENTS_SECTION_ID,
  getCaseShareBarLeftOffset,
  getCaseShareBarPlacement,
  scrollToCommentsSection,
} from "@/components/caseShareUtils";

describe("getCaseShareBarLeftOffset", () => {
  it("returns null when there is no safe outer margin", () => {
    expect(getCaseShareBarLeftOffset(1440)).toBeNull();
  });

  it("returns the minimum safe offset at the desktop threshold", () => {
    expect(getCaseShareBarLeftOffset(1536)).toBe(12);
  });

  it("keeps the rail in the side gutter on wider screens", () => {
    expect(getCaseShareBarLeftOffset(1920)).toBe(204);
  });
});

describe("getCaseShareBarPlacement", () => {
  it("falls back to top bar when sidebar gutter is unavailable", () => {
    expect(getCaseShareBarPlacement(1440)).toEqual({ mode: "top" });
  });

  it("keeps using top bar even on wide screens", () => {
    expect(getCaseShareBarPlacement(1920)).toEqual({ mode: "top" });
  });
});

describe("scrollToCommentsSection", () => {
  it("returns false when comments section is missing", () => {
    expect(scrollToCommentsSection()).toBe(false);
  });

  it("scrolls smoothly to the comments section when it exists", () => {
    const section = document.createElement("section");
    section.id = CASE_COMMENTS_SECTION_ID;
    section.scrollIntoView = vi.fn();
    document.body.appendChild(section);

    const result = scrollToCommentsSection();

    expect(result).toBe(true);
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });

    section.remove();
  });
});
