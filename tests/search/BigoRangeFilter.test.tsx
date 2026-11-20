import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { BigoRangeFilter } from "@/components/search/BigoRangeFilter";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string | { defaultValue: string }) =>
      typeof fallback === "string" ? fallback : fallback.defaultValue,
  }),
}));

const extent = { min: 45_220, max: 66_000_000_000, count: 80 };
const input = (name: string) => screen.getByRole("textbox", { name }) as HTMLInputElement;
const preset = (name: string) => screen.getByRole("button", { name });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BigoRangeFilter presets", () => {
  it.each([
    ["Under Rs 1 crore", { max: 10_000_000 }],
    ["Rs 1 – 10 crore", { min: 10_000_000, max: 100_000_000 }],
    ["Rs 10 – 100 crore", { min: 100_000_000, max: 1_000_000_000 }],
    ["Rs 1 – 10 arab", { min: 1_000_000_000, max: 10_000_000_000 }],
    ["Over Rs 10 arab", { min: 10_000_000_000 }],
  ] as const)("commits %s as its bounds", (name, bounds) => {
    const onCommit = vi.fn();
    render(<BigoRangeFilter extent={extent} onCommit={onCommit} />);
    fireEvent.click(preset(name));
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(bounds);
  });

  it("is single-select: only the matching preset is pressed, and choosing it again clears", () => {
    const onCommit = vi.fn();
    render(<BigoRangeFilter extent={extent} min={1_000_000_000} max={10_000_000_000} onCommit={onCommit} />);
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
    expect(preset("Rs 1 – 10 arab").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(preset("Rs 1 – 10 arab"));
    expect(onCommit).toHaveBeenCalledExactlyOnceWith({});
  });
});

describe("BigoRangeFilter custom range", () => {
  it("keeps the fields behind 'Custom range' until asked for", () => {
    render(<BigoRangeFilter extent={extent} onCommit={vi.fn()} />);
    expect(screen.queryByRole("textbox", { name: "Min (Rs)" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Custom range" }));
    expect(input("Min (Rs)").value).toBe("");
    expect(input("Max (Rs)").value).toBe("");
  });

  it("opens with the bounds in force when they match no preset", () => {
    render(<BigoRangeFilter extent={extent} min={25_000} max={80_000_000_000} onCommit={vi.fn()} />);
    expect(input("Min (Rs)").value).toBe("25,000");
    expect(input("Max (Rs)").value).toBe("80,00,00,00,000");
  });

  it("resynchronizes the fields when the URL moves (a preset, a pill, Clear)", () => {
    const { rerender } = render(<BigoRangeFilter extent={extent} min={25_000} onCommit={vi.fn()} />);
    expect(input("Min (Rs)").value).toBe("25,000");
    rerender(<BigoRangeFilter extent={extent} onCommit={vi.fn()} />);
    expect(input("Min (Rs)").value).toBe("");
  });

  it("commits a typed bound on Enter", () => {
    const onCommit = vi.fn();
    render(<BigoRangeFilter extent={extent} onCommit={onCommit} />);
    fireEvent.click(screen.getByRole("button", { name: "Custom range" }));
    fireEvent.change(input("Max (Rs)"), { target: { value: "50000000" } });
    fireEvent.keyDown(input("Max (Rs)"), { key: "Enter" });
    expect(onCommit).toHaveBeenCalledExactlyOnceWith({ min: undefined, max: 50_000_000 });
  });
});
