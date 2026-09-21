import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { SearchTabs } from "@/components/search/SearchTabs";

// Covers the Copilot review comment on PR #352: the control carried ARIA tab
// roles but none of the keyboard behaviour the tabs pattern implies, so it was
// five separate tab stops with no arrow-key navigation.
describe("SearchTabs keyboard navigation", () => {
  const LABELS = ["All records", "Cases", "Entities", "Materials", "Court cases"];

  function setup(activeType: Parameters<typeof SearchTabs>[0]["activeType"] = "all") {
    const onChange = vi.fn();
    render(<SearchTabs activeType={activeType} onChange={onChange} />);
    return { onChange };
  }

  it("exposes the tablist as a single tab stop (roving tabindex)", () => {
    setup("entity");

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);

    const focusable = tabs.filter((tab) => tab.getAttribute("tabindex") === "0");
    expect(focusable).toHaveLength(1);
    expect(focusable[0].textContent).toBe("Entities");
    // Every other tab is reachable by arrow key, not by Tab.
    for (const tab of tabs.filter((t) => t !== focusable[0])) {
      expect(tab.getAttribute("tabindex")).toBe("-1");
    }
  });

  it.each([
    ["ArrowRight", "All records", "case", "Cases"],
    ["ArrowLeft", "All records", "courtcase", "Court cases"],
    ["ArrowRight", "Court cases", undefined, "All records"],
    ["Home", "Materials", undefined, "All records"],
    ["End", "All records", "courtcase", "Court cases"],
  ])("%s from %s selects and focuses the right tab", (key, from, expected, focused) => {
    // Active type has to match `from` so the roving index starts there.
    const active = { "All records": "all", Materials: "material", "Court cases": "courtcase" }[
      from as string
    ] as Parameters<typeof SearchTabs>[0]["activeType"];
    const { onChange } = setup(active);

    fireEvent.keyDown(screen.getByRole("tab", { name: from as string }), { key });

    expect(onChange).toHaveBeenCalledWith(expected);
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: focused as string }));
  });

  it("ignores keys it does not own, so typing still reaches the page", () => {
    const { onChange } = setup();

    fireEvent.keyDown(screen.getByRole("tab", { name: "All records" }), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("tab", { name: "All records" }), { key: "a" });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("still selects on click", () => {
    const { onChange } = setup();

    fireEvent.click(screen.getByRole("tab", { name: "Materials" }));

    expect(onChange).toHaveBeenCalledWith("material");
  });

  it("labels every tab", () => {
    setup();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(LABELS);
  });
});
