import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PaginationControls } from "@/components/ui/pagination";

// i18n in tests: render the fallback/key rather than booting a real backend, and
// make `pageOf` interpolate so the mobile label can be asserted on.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "pagination.pageOf") {
        return `Page ${options?.page} of ${options?.totalPages}`;
      }
      if (key === "pagination.goToPage") return `Go to page ${options?.page}`;
      return key;
    },
    i18n: { language: "en" },
  }),
}));

/** Page numbers currently offered as clickable controls. */
function offeredPages() {
  return screen
    .getAllByRole("button")
    .map((b) => b.textContent?.trim())
    .filter((text) => text && /^\d+$/.test(text))
    .map(Number);
}

describe("PaginationControls", () => {
  const base = {
    page: 7,
    pageSize: 12,
    onPageChange: vi.fn(),
  };

  it("derives the last page from the item count when uncapped", () => {
    render(<PaginationControls {...base} totalItems={120} />);
    expect(Math.max(...offeredPages())).toBe(10);
  });

  // The archive-search regression: `count` reports 578k records but the API
  // refuses offset paging past 10k results, so the implied last page (48,185)
  // answered HTTP 400 on every click. The pager must never offer a page the
  // backing API cannot serve.
  it("never offers a page beyond maxPages", () => {
    render(
      <PaginationControls
        {...base}
        totalItems={578_211}
        maxPages={Math.floor(10_000 / 12)}
      />,
    );

    const pages = offeredPages();
    expect(Math.max(...pages)).toBe(833);
    expect(pages).not.toContain(48_185);
  });

  it("disables Next on the capped last page, not the implied one", () => {
    render(
      <PaginationControls
        {...base}
        page={833}
        totalItems={578_211}
        maxPages={Math.floor(10_000 / 12)}
      />,
    );

    const next = screen.getByRole("button", {
      name: "pagination.goToNextPage",
    }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  // A bookmarked ?page=40000 must fold to the capped last page, not sit past the
  // end: unclamped it rendered "Page 40000 of 833" and highlighted nothing.
  it("clamps an out-of-range requested page to the cap", () => {
    render(
      <PaginationControls
        {...base}
        page={40_000}
        totalItems={578_211}
        maxPages={Math.floor(10_000 / 12)}
      />,
    );

    expect(screen.getByText("Page 833 of 833")).toBeTruthy();
  });

  it("uses the implied count when it is smaller than the cap", () => {
    // 2,095 published cases at 12/page = 175 pages, well inside the 833 ceiling:
    // the cap must not inflate a short result set.
    render(
      <PaginationControls {...base} totalItems={2_095} maxPages={833} />,
    );
    expect(Math.max(...offeredPages())).toBe(175);
  });
});
