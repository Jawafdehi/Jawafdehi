import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import EmbedCaseCard from "@/pages/EmbedCaseCard";
import type { Case, CaseImage } from "@/types/jds";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) =>
      typeof fallback === "string" ? fallback : key,
    i18n: { language: "en" },
  }),
}));

vi.mock("react-helmet-async", () => ({
  Helmet: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useParams: () => ({ id: "a-case" }) };
});

const getCaseById = vi.fn();
vi.mock("@/services/jds-api", () => ({
  getCaseById: (...args: unknown[]) => getCaseById(...args),
}));

const LADDER: CaseImage = {
  src: "https://s3.example.org/up.width-1200.format-webp.webp",
  srcset: "https://s3.example.org/up.width-400.format-webp.webp 400w",
  width: 1200,
  height: 675,
  alt: "",
};

const makeCase = (overrides: Partial<Case> = {}) =>
  ({
    id: 1,
    slug: "a-case",
    title: "A case",
    state: "PUBLISHED",
    case_type: "CORRUPTION",
    short_description: "Summary.",
    description: "",
    entities: [],
    tags: [],
    key_allegations: [],
    court_cases: [],
    timeline: [],
    evidence: [],
    bigo: null,
    case_start_date: null,
    case_end_date: null,
    ...overrides,
  }) as unknown as Case;

function renderEmbed() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <EmbedCaseCard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return utils;
}

beforeEach(() => {
  getCaseById.mockReset();
});

describe("EmbedCaseCard image fallback", () => {
  it("prefers the uploaded ladder and carries its srcset", async () => {
    getCaseById.mockResolvedValue(
      makeCase({ thumbnail: LADDER, thumbnail_url: "https://cdn.example.org/legacy.jpg" }),
    );

    const { container } = renderEmbed();

    await waitFor(() => expect(container.querySelector("img")).toBeTruthy());
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe(LADDER.src);
    expect(img.getAttribute("srcset")).toBe(LADDER.srcset);
  });

  it("advances to the legacy URL when the ladder fails to load", async () => {
    // This card had no onError at all, so a broken first candidate meant the
    // embed showed a broken image forever and never tried the others — every
    // other case surface walks the list.
    getCaseById.mockResolvedValue(
      makeCase({ thumbnail: LADDER, banner_url: "https://cdn.example.org/banner.jpg" }),
    );

    const { container } = renderEmbed();
    await waitFor(() => expect(container.querySelector("img")).toBeTruthy());

    fireEvent.error(container.querySelector("img")!);

    await waitFor(() =>
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "https://cdn.example.org/banner.jpg",
      ),
    );
    // The legacy URL has no renditions, so the ladder's srcset must not linger.
    expect(container.querySelector("img")?.getAttribute("srcset")).toBeNull();
  });

  it("falls through to the no-image band once every candidate fails", async () => {
    getCaseById.mockResolvedValue(makeCase({ thumbnail: LADDER }));

    const { container } = renderEmbed();
    await waitFor(() => expect(container.querySelector("img")).toBeTruthy());

    fireEvent.error(container.querySelector("img")!);

    // The embed's own treatment — a short navy band, NOT the shared scales
    // placeholder the public card uses.
    await waitFor(() => expect(container.querySelector("img")).toBeNull());
  });

  it("shows the no-image band when the case carries no image at all", async () => {
    getCaseById.mockResolvedValue(makeCase());

    const { container } = renderEmbed();

    await waitFor(() => expect(getCaseById).toHaveBeenCalled());
    await waitFor(() => expect(container.textContent).toContain("A case"));
    expect(container.querySelector("img")).toBeNull();
  });
});
