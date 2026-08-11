import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CaseCard } from "@/components/CaseCard";
import { CASE_PLACEHOLDER_IMAGE } from "@/lib/case-images";

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
  const { container } = render(
    <MemoryRouter>
      <CaseCard {...baseProps} {...props} />
    </MemoryRouter>,
  );

  const image = container.querySelector("img");
  if (!image) throw new Error("CaseCard rendered no <img>");

  return { container, image };
}

describe("CaseCard image fallback", () => {
  it("shows the placeholder illustration when the case has no thumbnail or banner", () => {
    const { image } = renderCard();

    expect(image.getAttribute("src")).toBe(CASE_PLACEHOLDER_IMAGE);
    // Decorative: the placeholder says nothing about this case, so it must not
    // announce an alt text — a missing `caseCard.thumbnailAlt` resource used to
    // surface the raw key as visible text on cards with no image.
    expect(image.getAttribute("alt")).toBe("");
  });

  it("treats blank and staff-only /admin/ URLs as no image at all", () => {
    const { image } = renderCard({
      thumbnailUrl: "   ",
      bannerUrl: "https://jawafdehi.org/admin/uploads/banner.png",
    });

    expect(image.getAttribute("src")).toBe(CASE_PLACEHOLDER_IMAGE);
  });

  it("prefers the thumbnail, and describes it for assistive tech", () => {
    const { image } = renderCard({
      thumbnailUrl: "https://cdn.example.org/thumb.jpg",
      bannerUrl: "https://cdn.example.org/banner.jpg",
    });

    expect(image.getAttribute("src")).toBe("https://cdn.example.org/thumb.jpg");
    expect(image.getAttribute("alt")).toBe("caseCard.thumbnailAlt");
  });

  it("falls through thumbnail → banner → placeholder as candidates fail to load", () => {
    const { image } = renderCard({
      // Cases sometimes carry an article/page link as the thumbnail, which
      // loads as an error rather than an image.
      thumbnailUrl: "https://news.example.org/article",
      bannerUrl: "https://cdn.example.org/banner.jpg",
    });

    fireEvent.error(image);
    expect(image.getAttribute("src")).toBe("https://cdn.example.org/banner.jpg");

    fireEvent.error(image);
    expect(image.getAttribute("src")).toBe(CASE_PLACEHOLDER_IMAGE);
    expect(image.getAttribute("alt")).toBe("");
  });

  it("reaches the placeholder when the thumbnail and banner are the same broken URL", () => {
    // Scraped cases routinely carry one url as both thumbnail and banner (e.g.
    // case-081-cr-0136-oxygen-plant). Advancing from that url to an identical
    // one changes no attribute, so no second error event would ever arrive —
    // the card used to sit on the broken image forever.
    const sameUrl = "https://thahamun.gov.np/files/img/slider/thahabuilding.jpg";
    const { image } = renderCard({ thumbnailUrl: sameUrl, bannerUrl: sameUrl });

    expect(image.getAttribute("src")).toBe(sameUrl);

    fireEvent.error(image);
    expect(image.getAttribute("src")).toBe(CASE_PLACEHOLDER_IMAGE);
    expect(image.getAttribute("alt")).toBe("");
  });

  it("stays on the placeholder if the placeholder itself fails to load", () => {
    const { image } = renderCard({ thumbnailUrl: "https://news.example.org/article" });

    fireEvent.error(image);
    expect(image.getAttribute("src")).toBe(CASE_PLACEHOLDER_IMAGE);

    // Advancing past the last candidate must not wrap back to a URL that has
    // already failed, which would loop the error handler forever.
    fireEvent.error(image);
    expect(image.getAttribute("src")).toBe(CASE_PLACEHOLDER_IMAGE);
  });
});
