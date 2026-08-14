import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PaginationControls } from "@/components/ui/pagination";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      key === "pagination.pageOf"
        ? `Page ${values?.page} of ${values?.totalPages}`
        : key === "pagination.goToPage"
          ? `Go to page ${values?.page}`
          : key,
  }),
}));

// 33 items at 4 per page = 9 pages. Search echoes back the requested ?page= even
// when it is past the end, so the control has to defend itself.
const renderControls = (page: number, onPageChange = vi.fn()) => {
  render(
    <PaginationControls
      onPageChange={onPageChange}
      page={page}
      pageSize={4}
      totalItems={33}
    />,
  );
  return {
    onPageChange,
    next: screen.getByRole("button", {
      name: "pagination.goToNextPage",
    }) as HTMLButtonElement,
    previous: screen.getByRole("button", {
      name: "pagination.goToPrevPage",
    }) as HTMLButtonElement,
  };
};

describe("PaginationControls", () => {
  it("labels and marks the current page normally", () => {
    const { next, previous } = renderControls(5);

    expect(screen.getByText("Page 5 of 9")).toBeDefined();
    expect(screen.getByRole("button", { name: "Go to page 5" })).toHaveProperty(
      "ariaCurrent",
      "page",
    );
    expect(next.disabled).toBe(false);
    expect(previous.disabled).toBe(false);
  });

  it("clamps a page past the end to the last page", () => {
    const { next, previous } = renderControls(10);

    expect(screen.getByText("Page 9 of 9")).toBeDefined();
    expect(screen.queryByText("Page 10 of 9")).toBeNull();
    expect(screen.getByRole("button", { name: "Go to page 9" })).toHaveProperty(
      "ariaCurrent",
      "page",
    );
    expect(next.disabled).toBe(true);
    expect(previous.disabled).toBe(false);
  });

  it("steps back from the clamped page, not the requested one", () => {
    const { onPageChange, previous } = renderControls(10);

    previous.click();

    expect(onPageChange).toHaveBeenCalledWith(8);
  });

  it("clamps a page below the first page", () => {
    const { next, previous } = renderControls(0);

    expect(screen.getByText("Page 1 of 9")).toBeDefined();
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);
  });

  it("falls back to the first page for a non-finite page", () => {
    renderControls(Number.NaN);

    expect(screen.getByText("Page 1 of 9")).toBeDefined();
  });
});
