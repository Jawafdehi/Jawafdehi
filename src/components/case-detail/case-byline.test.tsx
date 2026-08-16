import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";

// Passthrough translations, plus interpolation, so assertions read the values
// the component computed rather than depending on i18n resources. `t` keeps a
// stable identity across renders, matching the real react-i18next.
vi.mock("react-i18next", () => {
  const translation = {
    t: (key: string, opts?: Record<string, unknown>) => {
      if (!opts) return key;
      const args = Object.entries(opts)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(",");
      return args ? `${key}:${args}` : key;
    },
    i18n: { language: "en" },
  };
  return { useTranslation: () => translation };
});

import { CaseByline } from "@/components/case-detail/case-byline";
import type { CaseAuthorCredit } from "@/types/jds";

const author = (over: Partial<CaseAuthorCredit> = {}): CaseAuthorCredit => ({
  slug: "subodh-kandel",
  display_name: "Subodh Kandel",
  description: "",
  photo_url: "",
  has_public_page: false,
  ...over,
});

const AUTHORS: CaseAuthorCredit[] = [
  author(),
  author({
    slug: "sambhav-koirala",
    display_name: "Sambhav Koirala",
    description: "BALLB 4th Year Student",
  }),
];

const renderByline = (ui: ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe("CaseByline — author cards", () => {
  it("renders one card per author, in the order given", () => {
    const { container } = renderByline(<CaseByline authors={AUTHORS} />);

    const cards = container.querySelectorAll('[data-testid="author-card"]');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain("Subodh Kandel");
    expect(cards[1].textContent).toContain("Sambhav Koirala");
  });

  it("shows the author's per-person description on the card", () => {
    const { container } = renderByline(<CaseByline authors={AUTHORS} />);

    const cards = container.querySelectorAll('[data-testid="author-card"]');
    expect(cards[1].textContent).toContain("BALLB 4th Year Student");
  });

  it("links a card to the profile only when that profile is published", () => {
    const { container } = renderByline(
      <CaseByline
        authors={[
          author({ has_public_page: true }),
          author({ slug: "unpublished", display_name: "No Page", has_public_page: false }),
        ]}
      />,
    );

    const cards = container.querySelectorAll('[data-testid="author-card"]');
    expect(cards[0].tagName).toBe("A");
    expect(cards[0].getAttribute("href")).toBe("/author/subodh-kandel");
    // An auto-created, unfilled profile is not a page worth sending readers to.
    expect(cards[1].tagName).not.toBe("A");
  });

  it("does not link a published profile that somehow has no slug", () => {
    const { container } = renderByline(
      <CaseByline authors={[author({ slug: "", has_public_page: true })]} />,
    );

    expect(
      container.querySelector('[data-testid="author-card"]')?.tagName,
    ).not.toBe("A");
  });

  it("renders the photo when there is one, and a placeholder when there isn't", () => {
    const { container } = renderByline(
      <CaseByline
        authors={[
          author({ photo_url: "https://s3.jawafdehi.org/team/subodh.jpeg" }),
          author({ slug: "no-photo", display_name: "No Photo" }),
        ]}
      />,
    );

    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute("src")).toBe(
      "https://s3.jawafdehi.org/team/subodh.jpeg",
    );
    // The photo is decorative — the name next to it is the accessible label.
    expect(images[0].getAttribute("alt")).toBe("");
  });

  it("renders the first-published date", () => {
    const { container } = renderByline(
      <CaseByline authors={AUTHORS} publishDate="2026-07-22" />,
    );

    expect(
      container.querySelector('[data-testid="case-byline-published"]')?.textContent,
    ).toContain("Jul 22, 2026");
  });

  it("omits the published line entirely when there is no publish date", () => {
    const { container } = renderByline(
      <CaseByline authors={AUTHORS} publishDate={null} />,
    );

    expect(
      container.querySelector('[data-testid="case-byline-published"]'),
    ).toBeNull();
  });

  it("lists the edit history behind a disclosure", () => {
    const { container } = renderByline(
      <CaseByline
        authors={AUTHORS}
        editHistory={[
          { date: "2026-08-14", remarks: "Corrected the bigo figure." },
          { date: "2026-08-02", remarks: "Added the charge-sheet." },
        ]}
      />,
    );

    const history = container.querySelector('[data-testid="case-byline-history"]');
    expect(history?.textContent).toContain("Corrected the bigo figure.");
    expect(history?.textContent).toContain("Added the charge-sheet.");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("omits the history disclosure when there are no entries", () => {
    const { container } = renderByline(
      <CaseByline authors={AUTHORS} editHistory={[]} />,
    );

    expect(container.querySelector('[data-testid="case-byline-history"]')).toBeNull();
  });

  it("drops history rows whose remarks are blank", () => {
    const { container } = renderByline(
      <CaseByline
        authors={AUTHORS}
        editHistory={[
          { date: "2026-08-14", remarks: "   " },
          { date: "2026-08-02", remarks: "Real entry." },
        ]}
      />,
    );

    expect(container.querySelectorAll("li")).toHaveLength(1);
  });

  it("ignores an author row with a blank display name", () => {
    const { container } = renderByline(
      <CaseByline authors={[author({ display_name: "  " })]} />,
    );

    // No usable author left, and no free-text fallback either.
    expect(container.querySelector('[data-testid="case-byline"]')).toBeNull();
  });
});

describe("CaseByline — legacy free-text fallback", () => {
  it("renders nothing when there is no byline at all", () => {
    for (const value of ["", "   ", null, undefined]) {
      const { container } = renderByline(<CaseByline markdown={value} />);
      expect(container.querySelector('[data-testid="case-byline"]')).toBeNull();
      expect(container.textContent?.trim()).toBe("");
    }
  });

  it("renders the legacy byline as markdown (bold + link, no raw asterisks)", () => {
    const markdown =
      "Documented by **the Jawafdehi research team**. First published Shrawan 2082 — see [the report](https://example.org/r).";
    const { container } = renderByline(<CaseByline markdown={markdown} />);

    expect(container.querySelector('[data-testid="case-byline"]')).toBeTruthy();

    // Bold renders as <strong>, not literal asterisks.
    expect(container.querySelector("strong")?.textContent).toBe(
      "the Jawafdehi research team",
    );
    expect(container.textContent).not.toContain("**");

    // A markdown link renders as a real anchor to its href.
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.org/r");
    expect(link?.textContent).toBe("the report");
  });

  it("prefers author cards over the legacy text when a case has both", () => {
    // A backfilled case may still carry its old public_notes until the field is
    // dropped; it must not render the byline twice.
    const { container } = renderByline(
      <CaseByline
        authors={AUTHORS}
        markdown="**Case Drafted by Rujit Kafle. First Published On 21 May 2026.**"
      />,
    );

    expect(container.textContent).toContain("Subodh Kandel");
    expect(container.textContent).not.toContain("Rujit Kafle");
  });
});
