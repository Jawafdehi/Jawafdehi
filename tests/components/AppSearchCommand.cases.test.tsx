// SPDX-License-Identifier: Hippocratic-3.0
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";

// The palette's cases used to come from /search-index.json, which the build
// filled by walking the whole case archive. It no longer does; cases are asked
// of /api/search/ live. These tests pin how that is wired in.

vi.mock("react-i18next", () => {
  const translation = { t: (key: string) => key, i18n: { language: "en" } };
  return { useTranslation: () => translation };
});

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

vi.mock("@/services/search-api", () => ({ searchArchive: vi.fn() }));
import { searchArchive } from "@/services/search-api";

import { AppSearchCommand } from "@/components/AppSearchCommand";
import type { ArchiveSearchResponse, ArchiveSearchResult } from "@/types/search";

const mockedSearch = vi.mocked(searchArchive);

const hit = (slug: string, title: string, extra: Partial<ArchiveSearchResult> = {}): ArchiveSearchResult =>
  ({
    type: "case",
    id: `case-${slug}`,
    source_app: "jawafdehi",
    title: { en: title, ne: null },
    snippet: { en: `About ${title}`, ne: null },
    score: 1,
    url: `/case/${slug}`,
    api_url: null,
    matched_fields: [],
    extra: {},
    card: { slug, title, short_description: `${title} summary` } as ArchiveSearchResult["card"],
    ...extra,
  }) as ArchiveSearchResult;

const response = (results: ArchiveSearchResult[]) =>
  ({ results }) as unknown as ArchiveSearchResponse;

beforeAll(() => {
  // cmdk and Radix Dialog reach for these; jsdom has neither.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  mockedSearch.mockReset();
  navigate.mockReset();
  // The static index: one page, so local matches have something to find.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          version: 1,
          generatedAt: "2026-11-18T00:00:00Z",
          entries: [
            {
              path: "/about",
              title: "About Melamchi",
              keywords: ["about"],
              description: "Who we are",
              icon: "Info",
              group: "pages",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderPalette(open = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = (isOpen: boolean) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AppSearchCommand open={isOpen} onOpenChange={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>
  );
  const utils = render(ui(open));
  return { ...utils, rerenderOpen: (isOpen: boolean) => utils.rerender(ui(isOpen)) };
}

async function type(value: string) {
  fireEvent.change(screen.getByPlaceholderText("searchCommand.placeholder"), {
    target: { value },
  });
}

async function settle(ms = 300) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("AppSearchCommand: live case search", () => {
  it("queries cases after the debounce and lists them after the local matches", async () => {
    mockedSearch.mockResolvedValue(
      response([hit("melamchi-water-supply", "Melamchi Water Supply"), hit("melamchi-tunnel", "Melamchi Tunnel")]),
    );
    renderPalette();

    await type("melamchi");
    expect(mockedSearch).not.toHaveBeenCalled(); // still inside the debounce
    await settle();

    expect(mockedSearch).toHaveBeenCalledTimes(1);
    expect(mockedSearch).toHaveBeenCalledWith(
      expect.objectContaining({ q: "melamchi", type: "case", page_size: 8 }),
    );

    await screen.findByText("Melamchi Tunnel");
    const titles = screen.getAllByRole("option").map((option) => option.textContent ?? "");
    expect(titles).toHaveLength(3);
    expect(titles[0]).toContain("About Melamchi"); // local first
    expect(titles[1]).toContain("Melamchi Water Supply");
    expect(titles[2]).toContain("Melamchi Tunnel");
    expect(titles[1]).toContain("Melamchi Water Supply summary");
  });

  it("does not query for a one-character term", async () => {
    renderPalette();
    await type("m");
    await settle();
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it("does not query while the dialog is closed", async () => {
    const { rerenderOpen } = renderPalette(true);
    await type("melamchi");
    rerenderOpen(false);
    await settle();
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it("debounces: a burst of typing costs one request, for the last term", async () => {
    mockedSearch.mockResolvedValue(response([]));
    renderPalette();
    await type("me");
    await settle(100);
    await type("mel");
    await settle(100);
    await type("melamchi");
    await settle();
    expect(mockedSearch).toHaveBeenCalledTimes(1);
    expect(mockedSearch).toHaveBeenCalledWith(expect.objectContaining({ q: "melamchi" }));
  });

  it("never shows a slow answer for an earlier term under a newer one", async () => {
    let resolveFirst: (value: ArchiveSearchResponse) => void = () => {};
    mockedSearch
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValue(response([hit("ram-shah", "Ram Shah procurement")]));
    renderPalette();

    await type("melamchi");
    await settle();
    await type("ram shah");
    await settle();
    await act(async () => {
      resolveFirst(response([hit("melamchi-water-supply", "Melamchi Water Supply")]));
    });
    await settle(50);

    expect(await screen.findByText("Ram Shah procurement")).toBeTruthy();
    expect(screen.queryByText("Melamchi Water Supply")).toBeNull();
  });

  it("dedupes by path and uses the canonical slashed case URL", async () => {
    mockedSearch.mockResolvedValue(
      response([
        hit("melamchi-water-supply", "Melamchi Water Supply"),
        hit("melamchi-water-supply", "Melamchi Water Supply (again)"),
        // No card: falls back to the result url, slash added.
        hit("melamchi-tunnel", "Melamchi Tunnel", { card: undefined }),
      ]),
    );
    renderPalette();
    await type("melamchi");
    await settle();

    await screen.findByText("Melamchi Tunnel");
    expect(screen.queryByText("Melamchi Water Supply (again)")).toBeNull();
    expect(screen.getAllByRole("option")).toHaveLength(3);

    fireEvent.click(screen.getByText("Melamchi Water Supply"));
    expect(navigate).toHaveBeenLastCalledWith("/case/melamchi-water-supply/");
    fireEvent.click(screen.getByText("Melamchi Tunnel"));
    expect(navigate).toHaveBeenLastCalledWith("/case/melamchi-tunnel/");
  });

  it("fails quietly: an API error leaves the local results", async () => {
    mockedSearch.mockRejectedValue(new Error("upstream 503"));
    renderPalette();
    await type("melamchi");
    await settle();

    expect(mockedSearch).toHaveBeenCalledTimes(1);
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain("About Melamchi");
  });

  it("leaves nothing in the query cache when rendered on the server", () => {
    // It sits in the Navbar of every pre-rendered and edge-rendered page; a
    // pending query left behind would read as a failed prefetch.
    const client = new QueryClient();
    renderToString(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AppSearchCommand open={false} onOpenChange={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(mockedSearch).not.toHaveBeenCalled();
  });
});
