import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

const getArticles = vi.fn();
vi.mock("@/services/cms-api", () => ({
  getArticles: (...args: unknown[]) => getArticles(...args),
}));

import Updates from "@/pages/Updates";

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/updates"]}>
          <Updates />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

// One skeleton card = one aria-hidden root carrying the view mode.
const skeletonCards = (root: HTMLElement, viewMode: "cards" | "list") =>
  root.querySelectorAll(`[aria-hidden='true'][data-view='${viewMode}']`).length;

const loadingStatus = () => screen.getByRole("status", { name: "Loading updates" });

beforeEach(() => {
  getArticles.mockReset();
  // Never settles, so the page stays in its loading state for the assertions.
  getArticles.mockReturnValue(new Promise(() => {}));
});

describe("Updates loading state", () => {
  it("renders card skeletons instead of a bare loading string", () => {
    const { container } = renderPage();

    expect(screen.queryByText(/^Loading updates…$/)).toBeNull();
    expect(skeletonCards(loadingStatus(), "cards")).toBe(6);
    // The shapes pulse via the shared <Skeleton> primitive.
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("swaps to list-shaped skeletons when the list view is selected", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "List view" }));

    expect(skeletonCards(loadingStatus(), "list")).toBe(3);
    expect(skeletonCards(loadingStatus(), "cards")).toBe(0);
  });

  it("announces the load once and hides the decorative shapes", () => {
    renderPage();

    const status = loadingStatus();
    // The status node carries the announcement; the placeholder cards inside it
    // are hidden so a screen reader doesn't walk an empty card tree.
    expect(status.getAttribute("aria-hidden")).toBeNull();
    expect(skeletonCards(status, "cards")).toBe(6);
  });

  it("keeps the skeleton grid on the same layout as the loaded grid", () => {
    renderPage();

    expect(loadingStatus().className).toContain("md:grid-cols-2");
  });
});
