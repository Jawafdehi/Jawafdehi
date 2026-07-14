import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Passthrough translations: t() returns the key verbatim so assertions don't
// depend on i18n resources (mirrors AdminCaseForm.test.tsx).
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The badge links via react-router's <Link>; render it as a plain anchor so the
// component test needs no router context.
vi.mock("react-router-dom", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/services/casework-api", () => ({ listReviews: vi.fn() }));
import { listReviews } from "@/services/casework-api";

import CaseReviewScoreBadge from "./CaseReviewScoreBadge";
import type { ReviewListItem } from "@/types/casework";

const review = (over: Partial<ReviewListItem>): ReviewListItem => ({
  id: 1,
  slug: "s",
  status: "done",
  stage: "",
  case_title: "",
  case_state: "",
  source_count: 0,
  sources_converted: 0,
  overall_score: null,
  disposition: null,
  case_type: "",
  reviewers: null,
  created_at: "2026-07-14T00:00:00Z",
  completed_at: null,
  duration_seconds: null,
  ...over,
});

const page = (results: ReviewListItem[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

beforeEach(() => vi.mocked(listReviews).mockReset());

describe("CaseReviewScoreBadge", () => {
  it("shows the latest score + disposition, linking to the case review history", async () => {
    vi.mocked(listReviews).mockResolvedValue(
      page([review({ id: 42, overall_score: 82, disposition: "PASS" })]),
    );

    render(<CaseReviewScoreBadge slug="ncell-tax-case" />);

    const link = (await screen.findByRole("link")) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/admin/reviews/case/ncell-tax-case");
    expect(link.textContent).toContain("82");
    expect(link.textContent).toContain("PASS");
    // It fetches only the newest run for this case.
    expect(listReviews).toHaveBeenCalledWith({
      slug: "ncell-tax-case",
      page_size: 1,
    });
  });

  it("url-encodes the slug in the review-history link", async () => {
    vi.mocked(listReviews).mockResolvedValue(page([]));

    render(<CaseReviewScoreBadge slug="a/b c" />);

    const link = (await screen.findByRole("link")) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/admin/reviews/case/a%2Fb%20c");
  });

  it("shows a muted 'no review' link when the case has never been reviewed", async () => {
    vi.mocked(listReviews).mockResolvedValue(page([]));

    render(<CaseReviewScoreBadge slug="fresh-case" />);

    const link = (await screen.findByRole("link")) as HTMLAnchorElement;
    expect(link.textContent).toContain("admin.caseForm.reviewBadge.none");
  });

  it("shows the run stage/status while a review is still pending (no score yet)", async () => {
    vi.mocked(listReviews).mockResolvedValue(
      page([
        review({ status: "running", stage: "scoring", overall_score: null }),
      ]),
    );

    render(<CaseReviewScoreBadge slug="c" />);

    const link = (await screen.findByRole("link")) as HTMLAnchorElement;
    expect(link.textContent).toContain("scoring");
  });

  // An endpoint error degrades to the same latest===null render as the "no
  // review" case above (the component's catch sets latest to null), so the
  // "none" test already covers that render branch. It isn't re-tested through a
  // thrown mock here because a rejection raised inside the effect trips vitest's
  // global unhandled-rejection detector even though the component handles it.
});
