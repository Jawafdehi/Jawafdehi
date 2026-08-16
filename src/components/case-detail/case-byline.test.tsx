import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

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

const AUTHORS = [
  { display_name: "Subodh Kandel", credit_note: "" },
  { display_name: "Sambhav Koirala", credit_note: "BALLB 4th Year Student" },
];

describe("CaseByline — structured byline", () => {
  it("names the authors in order, folding the credit note into the name", () => {
    const { container } = render(<CaseByline authors={AUTHORS} />);

    // The conjunction comes from t("…byline.and"), which the passthrough mock
    // returns as the raw key — assert order and credit-note folding, not the word.
    const names = container.querySelector('[data-testid="case-byline-authors"]');
    expect(names?.textContent).toContain(
      "Subodh Kandel caseDetail.byline.and Sambhav Koirala (BALLB 4th Year Student)",
    );
  });

  it("uses a plain name for a single author, with no list separator", () => {
    const { container } = render(
      <CaseByline authors={[{ display_name: "Rujit Kafle", credit_note: "" }]} />,
    );

    expect(
      container.querySelector('[data-testid="case-byline-authors"]')?.textContent,
    ).toContain("names=Rujit Kafle");
  });

  it("renders the first-published date", () => {
    const { container } = render(
      <CaseByline authors={AUTHORS} publishDate="2026-07-22" />,
    );

    const published = container.querySelector(
      '[data-testid="case-byline-published"]',
    );
    expect(published?.textContent).toContain("Jul 22, 2026");
  });

  it("omits the published line entirely when there is no publish date", () => {
    const { container } = render(<CaseByline authors={AUTHORS} publishDate={null} />);

    expect(
      container.querySelector('[data-testid="case-byline-published"]'),
    ).toBeNull();
  });

  it("lists the edit history behind a disclosure", () => {
    const { container } = render(
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
    const { container } = render(<CaseByline authors={AUTHORS} editHistory={[]} />);

    expect(container.querySelector('[data-testid="case-byline-history"]')).toBeNull();
  });

  it("drops history rows whose remarks are blank", () => {
    const { container } = render(
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
    const { container } = render(
      <CaseByline authors={[{ display_name: "  ", credit_note: "" }]} />,
    );

    // No usable author left, and no free-text fallback either.
    expect(container.querySelector('[data-testid="case-byline"]')).toBeNull();
  });
});

describe("CaseByline — legacy free-text fallback", () => {
  it("renders nothing when there is no byline at all", () => {
    for (const value of ["", "   ", null, undefined]) {
      const { container } = render(<CaseByline markdown={value} />);
      expect(container.querySelector('[data-testid="case-byline"]')).toBeNull();
      expect(container.textContent?.trim()).toBe("");
    }
  });

  it("renders the legacy byline as markdown (bold + link, no raw asterisks)", () => {
    const markdown =
      "Documented by **the Jawafdehi research team**. First published Shrawan 2082 — see [the report](https://example.org/r).";
    const { container } = render(<CaseByline markdown={markdown} />);

    const byline = container.querySelector('[data-testid="case-byline"]');
    expect(byline).toBeTruthy();

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

  it("prefers structured authors over the legacy text when a case has both", () => {
    // A backfilled case may still carry its old public_notes until the field is
    // dropped; it must not render the byline twice.
    const { container } = render(
      <CaseByline
        authors={AUTHORS}
        markdown="**Case Drafted by Rujit Kafle. First Published On 21 May 2026.**"
      />,
    );

    expect(container.textContent).toContain("Subodh Kandel");
    expect(container.textContent).not.toContain("Rujit Kafle");
  });
});
