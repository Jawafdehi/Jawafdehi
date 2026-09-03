import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CaseCard } from "@/components/CaseCard";
import { CASE_PLACEHOLDER_IMAGE } from "@/lib/case-images";

// Passthrough translations so assertions don't depend on i18n resources, with
// one interpolating branch standing in for en.json's "X with N others" (see the
// entity-summary suite at the bottom).
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => {
      if (typeof fallback === "string") return fallback;
      if (fallback && "name" in fallback) return `${fallback.name} +${fallback.count}`;
      return key;
    },
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

  const image = container.querySelector("img");
  if (!image) throw new Error("CaseCard rendered no <img>");

  // Re-renders the SAME instance with new props, which is what a list re-sort
  // or refetch does — the point at which stale image state would show.
  const rerenderCard = (nextProps: Partial<React.ComponentProps<typeof CaseCard>>) => {
    rerender(
      <MemoryRouter>
        <CaseCard {...baseProps} {...nextProps} />
      </MemoryRouter>,
    );

    const nextImage = container.querySelector("img");
    if (!nextImage) throw new Error("CaseCard rendered no <img>");

    return nextImage;
  };

  return { container, image, rerenderCard };
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

  it("starts from the new thumbnail when the same card is reused for another case", () => {
    const { image, rerenderCard } = renderCard({
      thumbnailUrl: "https://news.example.org/article",
      bannerUrl: "https://cdn.example.org/banner.jpg",
    });

    fireEvent.error(image);
    expect(image.getAttribute("src")).toBe("https://cdn.example.org/banner.jpg");

    // A list re-sort or refetch hands this instance a different case. The
    // fallback position belonged to the old images, so it must not carry over —
    // otherwise the new case opens on its banner, or on the placeholder.
    const nextImage = rerenderCard({
      thumbnailUrl: "https://cdn.example.org/next-thumb.jpg",
      bannerUrl: "https://cdn.example.org/next-banner.jpg",
    });

    expect(nextImage.getAttribute("src")).toBe("https://cdn.example.org/next-thumb.jpg");
  });

  it("keeps its place when a re-render yields the same candidates", () => {
    const { image, rerenderCard } = renderCard({
      thumbnailUrl: "https://news.example.org/article",
      bannerUrl: "https://cdn.example.org/banner.jpg",
    });

    fireEvent.error(image);
    expect(image.getAttribute("src")).toBe("https://cdn.example.org/banner.jpg");

    // Same URLs, only re-trimmed. Resetting on raw prop identity would send the
    // card back to the thumbnail that just failed, and it would flicker between
    // the two on every render.
    const nextImage = rerenderCard({
      thumbnailUrl: "  https://news.example.org/article  ",
      bannerUrl: "https://cdn.example.org/banner.jpg",
    });

    expect(nextImage.getAttribute("src")).toBe("https://cdn.example.org/banner.jpg");
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

describe("CaseCard uploaded image", () => {
  const uploaded = {
    src: "https://s3.jawafdehi.org/case_uploads/abc.width-1200.format-webp.webp",
    srcset:
      "https://s3.jawafdehi.org/case_uploads/abc.width-400.format-webp.webp 400w, " +
      "https://s3.jawafdehi.org/case_uploads/abc.width-1200.format-webp.webp 1200w",
    width: 1200,
    height: 800,
    alt: "",
  };

  it("renders the rendition ladder with a sizes hint", () => {
    const { image } = renderCard({ image: uploaded });

    expect(image.getAttribute("src")).toBe(uploaded.src);
    expect(image.getAttribute("srcset")).toBe(uploaded.srcset);
    // Without `sizes` the browser assumes 100vw and picks the widest tier on
    // every card, which is most of what the ladder exists to avoid.
    expect(image.getAttribute("sizes")).toBeTruthy();
    // No width/height: CSS sizes this image in both dimensions, so the
    // attributes' only effect (the UA aspect-ratio hint) would not apply, and
    // the fixed-height container already reserves the box.
    expect(image.getAttribute("width")).toBeNull();
    expect(image.getAttribute("height")).toBeNull();
  });

  it("prefers the uploaded image over a legacy URL on the same case", () => {
    const { image } = renderCard({
      image: uploaded,
      thumbnailUrl: "https://cdn.example.org/legacy.jpg",
    });

    expect(image.getAttribute("src")).toBe(uploaded.src);
  });

  it("drops the srcset when a load error falls back past the ladder", () => {
    const { image } = renderCard({
      image: uploaded,
      thumbnailUrl: "https://cdn.example.org/legacy.jpg",
    });

    fireEvent.error(image);

    // The legacy URL has no renditions. Leaving the old srcset attached would
    // have the browser keep fetching the tier that just failed and never reach
    // the fallback at all.
    expect(image.getAttribute("src")).toBe("https://cdn.example.org/legacy.jpg");
    expect(image.getAttribute("srcset")).toBeNull();
  });

  it("falls through to the placeholder when the uploaded image fails and nothing else is set", () => {
    const { image } = renderCard({ image: uploaded });

    fireEvent.error(image);

    expect(image.getAttribute("src")).toBe(CASE_PLACEHOLDER_IMAGE);
    expect(image.getAttribute("srcset")).toBeNull();
    expect(image.getAttribute("alt")).toBe("");
  });
});

// The entity summary moved out to the shared `summarizeNames` in the
// court-case-parties change, and nothing in the repo pinned it — so a refactor
// of the util could quietly change what every case card shows. These are the
// behaviours the move was supposed to preserve.
describe("CaseCard entity summary", () => {
  const summaryOf = (props: Partial<React.ComponentProps<typeof CaseCard>>) => {
    const { container } = render(
      <MemoryRouter>
        <CaseCard {...baseProps} {...props} />
      </MemoryRouter>,
    );
    // The entity row is the first line of the meta block; its `title` carries
    // the full unabbreviated list, which is how the row is identified here.
    const row = container.querySelector(`[title="${props.entity ?? baseProps.entity}"]`);
    return row?.textContent ?? "";
  };

  it("shows a lone entity name with no count", () => {
    expect(summaryOf({ entity: "Nepal Telecom", entityNames: ["Nepal Telecom"] })).toBe(
      "Nepal Telecom",
    );
  });

  it("names the first entity and counts the rest", () => {
    expect(
      summaryOf({
        entity: "Nepal Telecom, Ncell, Smart Cell",
        entityNames: ["Nepal Telecom", "Ncell", "Smart Cell"],
      }),
    ).toBe("Nepal Telecom +2");
  });

  it("falls back to splitting the joined entity string when there is no list", () => {
    // Older callers pass only `entity`. The split has to survive the move to
    // the shared util, including the whitespace after each comma.
    expect(summaryOf({ entity: "Nepal Telecom, Ncell" })).toBe("Nepal Telecom +1");
  });

  it("trims the names it is handed", () => {
    // A behaviour CHANGE from before the shared util, recorded deliberately:
    // entity names used to render with their surrounding whitespace intact.
    expect(summaryOf({ entity: "  Nepal Telecom  ", entityNames: ["  Nepal Telecom  "] })).toBe(
      "Nepal Telecom",
    );
  });

  it("keeps an entity name that carries its own समेत, without adding a count", () => {
    // Also a behaviour change from before the shared util: the marker rule
    // written for court-case parties applies to case entities too, since both
    // cards now go through one summary.
    expect(
      summaryOf({ entity: "क समेत, ख", entityNames: ["क समेत", "ख"] }),
    ).toBe("क समेत");
  });

  it("falls back to the raw entity string when the list is unusable", () => {
    expect(summaryOf({ entity: "Unknown Entity", entityNames: ["   "] })).toBe("Unknown Entity");
  });
});
