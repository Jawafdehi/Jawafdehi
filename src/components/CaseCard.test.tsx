import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CaseCard } from "@/components/CaseCard";

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === "string" ? fallback : key,
    i18n: { language: "en" },
  }),
}));

const baseProps = {
  id: "1",
  slug: "ntc-081-cr-0111",
  title: "Nepal Telecom procurement",
  entity: "Nepal Telecom",
  location: "Kathmandu",
  status: "ongoing" as const,
  description: "A case description.",
};

function renderCard(props: Partial<React.ComponentProps<typeof CaseCard>> = {}) {
  const { container, rerender } = render(
    <MemoryRouter>
      <CaseCard {...baseProps} {...props} />
    </MemoryRouter>,
  );

  // Re-renders the SAME instance with new props, which is what a list re-sort
  // or refetch does — the point at which stale image state would show.
  const rerenderCard = (nextProps: Partial<React.ComponentProps<typeof CaseCard>>) => {
    rerender(
      <MemoryRouter>
        <CaseCard {...baseProps} {...nextProps} />
      </MemoryRouter>,
    );
    return container;
  };

  return { container, rerenderCard };
}

function getImage(container: HTMLElement): HTMLImageElement {
  const image = container.querySelector("img");
  if (!image) throw new Error("expected CaseCard to render an <img>");
  return image;
}

// The tier-3 generative thumbnail announces itself as one summary graphic.
function getGenerative(container: HTMLElement): HTMLElement {
  const node = container.querySelector('[aria-label="caseCard.generativeThumbnail.summary"]');
  if (!node) throw new Error("expected CaseCard to render the generative thumbnail");
  return node as HTMLElement;
}

describe("CaseCard image fallback", () => {
  it("renders the generative data thumbnail when the case has no images at all", () => {
    const { container } = renderCard();

    expect(container.querySelector("img")).toBeNull();
    const generative = getGenerative(container);
    // One coherent summary for assistive tech, not SVG soup.
    expect(generative.getAttribute("role")).toBe("img");
  });

  it("treats blank and staff-only /admin/ URLs as no image at all", () => {
    const { container } = renderCard({
      thumbnailUrl: "   ",
      bannerUrl: "https://jawafdehi.org/admin/uploads/banner.png",
    });

    expect(container.querySelector("img")).toBeNull();
    getGenerative(container);
  });

  it("prefers the editor hero image over thumbnail and banner", () => {
    const { container } = renderCard({
      heroImageUrl: "https://cdn.example.org/hero.jpg",
      thumbnailUrl: "https://cdn.example.org/thumb.jpg",
      bannerUrl: "https://cdn.example.org/banner.jpg",
    });

    expect(getImage(container).getAttribute("src")).toBe("https://cdn.example.org/hero.jpg");
  });

  it("prefers the thumbnail, and describes it for assistive tech", () => {
    const { container } = renderCard({
      thumbnailUrl: "https://cdn.example.org/thumb.jpg",
      bannerUrl: "https://cdn.example.org/banner.jpg",
    });

    const image = getImage(container);
    expect(image.getAttribute("src")).toBe("https://cdn.example.org/thumb.jpg");
    expect(image.getAttribute("alt")).toBe("caseCard.thumbnailAlt");
  });

  it("falls through hero → thumbnail → banner → generative as candidates fail to load", () => {
    const { container } = renderCard({
      heroImageUrl: "https://cdn.example.org/hero.jpg",
      // Cases sometimes carry an article/page link as the thumbnail, which
      // loads as an error rather than an image.
      thumbnailUrl: "https://news.example.org/article",
      bannerUrl: "https://cdn.example.org/banner.jpg",
    });

    fireEvent.error(getImage(container));
    expect(getImage(container).getAttribute("src")).toBe("https://news.example.org/article");

    fireEvent.error(getImage(container));
    expect(getImage(container).getAttribute("src")).toBe("https://cdn.example.org/banner.jpg");

    fireEvent.error(getImage(container));
    expect(container.querySelector("img")).toBeNull();
    getGenerative(container);
  });

  it("reaches the generative thumbnail when the thumbnail and banner are the same broken URL", () => {
    // Scraped cases routinely carry one url as both thumbnail and banner (e.g.
    // case-081-cr-0136-oxygen-plant). Advancing from that url to an identical
    // one changes no attribute, so no second error event would ever arrive —
    // the card used to sit on the broken image forever.
    const sameUrl = "https://thahamun.gov.np/files/img/slider/thahabuilding.jpg";
    const { container } = renderCard({ thumbnailUrl: sameUrl, bannerUrl: sameUrl });

    expect(getImage(container).getAttribute("src")).toBe(sameUrl);

    fireEvent.error(getImage(container));
    expect(container.querySelector("img")).toBeNull();
    getGenerative(container);
  });

  it("starts from the new thumbnail when the same card is reused for another case", () => {
    const { container, rerenderCard } = renderCard({
      thumbnailUrl: "https://news.example.org/article",
      bannerUrl: "https://cdn.example.org/banner.jpg",
    });

    fireEvent.error(getImage(container));
    expect(getImage(container).getAttribute("src")).toBe("https://cdn.example.org/banner.jpg");

    // A list re-sort or refetch hands this instance a different case. The
    // fallback position belonged to the old images, so it must not carry over —
    // otherwise the new case opens on its banner, or on the generative fallback.
    rerenderCard({
      thumbnailUrl: "https://cdn.example.org/next-thumb.jpg",
      bannerUrl: "https://cdn.example.org/next-banner.jpg",
    });

    expect(getImage(container).getAttribute("src")).toBe("https://cdn.example.org/next-thumb.jpg");
  });

  it("keeps its place when a re-render yields the same candidates", () => {
    const { container, rerenderCard } = renderCard({
      thumbnailUrl: "https://news.example.org/article",
      bannerUrl: "https://cdn.example.org/banner.jpg",
    });

    fireEvent.error(getImage(container));
    expect(getImage(container).getAttribute("src")).toBe("https://cdn.example.org/banner.jpg");

    // Same URLs, only re-trimmed. Resetting on raw prop identity would send the
    // card back to the thumbnail that just failed, and it would flicker between
    // the two on every render.
    rerenderCard({
      thumbnailUrl: "  https://news.example.org/article  ",
      bannerUrl: "https://cdn.example.org/banner.jpg",
    });

    expect(getImage(container).getAttribute("src")).toBe("https://cdn.example.org/banner.jpg");
  });

  it("stays on the generative thumbnail once every candidate has failed", () => {
    const { container } = renderCard({ thumbnailUrl: "https://news.example.org/article" });

    fireEvent.error(getImage(container));
    // The generative thumbnail draws from case data — it has no URL to fail,
    // so there is nothing left to error-loop on.
    expect(container.querySelector("img")).toBeNull();
    getGenerative(container);
  });
});
