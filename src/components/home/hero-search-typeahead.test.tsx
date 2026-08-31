import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => {
  const translation = {
    t: (key: string) => key,
    i18n: { language: "en" },
  };
  return { useTranslation: () => translation };
});

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

vi.mock("@/services/search-api", () => ({ searchArchive: vi.fn() }));
import { searchArchive } from "@/services/search-api";

import { HeroSearchTypeahead } from "./hero-search-typeahead";
import type { ArchiveSearchResult } from "@/types/search";

const hit = (n: number): ArchiveSearchResult =>
  ({
    type: "case",
    id: `case-${n}`,
    source_app: "jawafdehi",
    title: { en: `Case ${n}`, ne: null },
    snippet: { en: null, ne: null },
    score: 1,
    url: `/case/case-${n}`,
    api_url: null,
    matched_fields: [],
    extra: {},
  }) as ArchiveSearchResult;

const results = (n: number) => ({
  results: Array.from({ length: n }, (_, i) => hit(i + 1)),
});

const renderTypeahead = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HeroSearchTypeahead />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const input = () => screen.getByRole("combobox");

const typeQuery = async (value: string) => {
  fireEvent.focus(input());
  fireEvent.change(input(), { target: { value } });
  // Cross the 250ms debounce window with real timers.
  await waitFor(() => expect(searchArchive).toHaveBeenCalled(), { timeout: 2000 });
};

beforeEach(() => {
  vi.mocked(searchArchive).mockReset().mockResolvedValue(results(5) as never);
  navigate.mockReset();
});

describe("HeroSearchTypeahead", () => {
  it("debounces: one API call with the final query, typed as case search", async () => {
    renderTypeahead();
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: "te" } });
    fireEvent.change(input(), { target: { value: "tea" } });
    fireEvent.change(input(), { target: { value: "tea estate" } });

    await waitFor(() => expect(searchArchive).toHaveBeenCalledTimes(1), {
      timeout: 2000,
    });
    expect(searchArchive).toHaveBeenCalledWith(
      expect.objectContaining({ q: "tea estate", type: "case", page_size: 5 }),
    );
  });

  it("does not query below the minimum length", async () => {
    renderTypeahead();
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: "t" } });
    // Give the debounce a chance to fire if it (wrongly) would.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(searchArchive).not.toHaveBeenCalled();
  });

  it("renders the suggestions as an ARIA listbox wired to the combobox", async () => {
    renderTypeahead();
    await typeQuery("tea");

    const listbox = await screen.findByRole("listbox");
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(5);
    expect(input().getAttribute("aria-expanded")).toBe("true");
    expect(input().getAttribute("aria-controls")).toBe(listbox.id);
  });

  it("ArrowDown + Enter opens the highlighted case", async () => {
    renderTypeahead();
    await typeQuery("tea");
    await screen.findAllByRole("option");

    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(input().getAttribute("aria-activedescendant")).toContain("option-0");
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    fireEvent.submit(input().closest("form")!);
    expect(navigate).toHaveBeenCalledWith("/case/case-2");
  });

  it("Enter with no active option still navigates to the case search", async () => {
    renderTypeahead();
    await typeQuery("tea estate");
    await screen.findAllByRole("option");

    fireEvent.submit(input().closest("form")!);
    expect(navigate).toHaveBeenCalledWith("/search?type=case&q=tea+estate");
  });

  it("Escape closes the list and keeps the typed text", async () => {
    renderTypeahead();
    await typeQuery("tea");
    await screen.findAllByRole("option");

    fireEvent.keyDown(input(), { key: "Escape" });
    expect(screen.queryByRole("option")).toBeNull();
    expect((input() as HTMLInputElement).value).toBe("tea");
  });

  it("clicking a suggestion navigates to that case", async () => {
    renderTypeahead();
    await typeQuery("tea");
    const options = await screen.findAllByRole("option");

    fireEvent.click(options[2]);
    expect(navigate).toHaveBeenCalledWith("/case/case-3");
  });
});
