import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { BigoRangeFilter } from "@/components/search/BigoRangeFilter";
import "../support/resize-observer";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string | { defaultValue: string }) =>
      typeof fallback === "string" ? fallback : fallback.defaultValue,
  }),
}));

const extent = { min: 45_220, max: 66_000_000_000, count: 80 };
const input = (name: string) => screen.getByRole("textbox", { name }) as HTMLInputElement;

beforeEach(() => {
  // jsdom has no pointer capture or layout; keep the real Radix event handling.
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 200, 20),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function startDrag(name: string) {
  const thumb = screen.getByRole("slider", { name });
  let captured = false;
  Object.assign(thumb, {
    setPointerCapture: () => { captured = true; },
    hasPointerCapture: () => captured,
    releasePointerCapture: () => { captured = false; },
  });
  fireEvent.pointerDown(thumb, { button: 0 });
  return thumb;
}

describe("BigoRangeFilter live amounts", () => {
  it("shows each minimum while dragging and commits only on release", () => {
    const onCommit = vi.fn();
    render(<BigoRangeFilter extent={extent} onCommit={onCommit} />);
    const thumb = startDrag("Minimum amount");

    fireEvent.pointerMove(thumb, { clientX: 80 });
    expect(screen.getByText("Rs 1.00 Crore")).toBeTruthy();
    expect(input("Min (Rs)").value).toBe("1,00,00,000");
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.pointerMove(thumb, { clientX: 100 });
    expect(screen.getByText("Rs 5.00 Crore")).toBeTruthy();
    expect(input("Min (Rs)").value).toBe("5,00,00,000");
    expect(thumb.getAttribute("aria-valuetext")).toBe("Rs 5.00 Crore");
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.pointerUp(thumb);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith({ min: 50_000_000, max: undefined });
  });

  it("shows the maximum before release too", () => {
    const onCommit = vi.fn();
    render(<BigoRangeFilter extent={extent} onCommit={onCommit} />);
    const thumb = startDrag("Maximum amount");

    fireEvent.pointerMove(thumb, { clientX: 160 });
    expect(screen.getByText("Rs 5.00 Arab")).toBeTruthy();
    expect(input("Max (Rs)").value).toBe("5,00,00,00,000");
    expect(input("Min (Rs)").value).toBe("");
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.pointerUp(thumb);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith({ min: undefined, max: 5_000_000_000 });
  });

  it.each([
    ["Minimum amount", "Min (Rs)", "No minimum", 0, { min: 10_000_000 }],
    ["Maximum amount", "Max (Rs)", "No maximum", 200, { max: 10_000_000 }],
  ] as const)("clears the %s preview at its unbounded endpoint", (name, field, label, clientX, bounds) => {
    const onCommit = vi.fn();
    render(<BigoRangeFilter extent={extent} {...bounds} onCommit={onCommit} />);
    const thumb = startDrag(name);

    fireEvent.pointerMove(thumb, { clientX });
    expect(screen.getByText(label)).toBeTruthy();
    expect(input(field).value).toBe("");
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.pointerUp(thumb);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith({ min: undefined, max: undefined });
  });

  it("resynchronizes a preview with exact URL bounds and Clear", () => {
    const onCommit = vi.fn();
    const { rerender } = render(<BigoRangeFilter extent={extent} onCommit={onCommit} />);
    const thumb = startDrag("Minimum amount");
    fireEvent.pointerMove(thumb, { clientX: 80 });
    fireEvent.pointerUp(thumb);

    rerender(<BigoRangeFilter extent={extent} min={25_000} max={80_000_000_000} onCommit={onCommit} />);
    expect(screen.getByText("Rs 25,000")).toBeTruthy();
    expect(screen.getByText("Rs 80.00 Arab")).toBeTruthy();
    expect(input("Min (Rs)").value).toBe("25,000");
    expect(input("Max (Rs)").value).toBe("80,00,00,00,000");

    rerender(<BigoRangeFilter extent={extent} onCommit={onCommit} />);
    expect(screen.getByText("No minimum")).toBeTruthy();
    expect(screen.getByText("No maximum")).toBeTruthy();
    expect(input("Min (Rs)").value).toBe("");
    expect(input("Max (Rs)").value).toBe("");
  });

  it("updates visible amounts for keyboard steps", () => {
    const onCommit = vi.fn();
    render(<BigoRangeFilter extent={extent} onCommit={onCommit} />);
    const thumb = screen.getByRole("slider", { name: "Minimum amount" });
    fireEvent.focus(thumb);
    fireEvent.keyDown(thumb, { key: "ArrowRight" });
    expect(screen.getByText("Rs 50,000")).toBeTruthy();
    expect(input("Min (Rs)").value).toBe("50,000");
    expect(onCommit).toHaveBeenCalledExactlyOnceWith({ min: 50_000, max: undefined });
  });
});
