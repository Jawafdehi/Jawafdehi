import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// BB-37 — the admin case editor gains a "View on website" link to the public
// case page (/case/<slug>). The link is enabled only for a PUBLISHED (public)
// case; DRAFT/IN_REVIEW/CLOSED 404 publicly, so it is disabled instead.
//
// The PUBLISHED (enabled-link) case is ALSO verified live/headlessly: a seeded
// dev-auth session renders the real admin editor and the case data loads from
// the genuinely-public PUBLISHED read endpoint (see the round2/fixes evidence
// screenshots). The non-public states can't be verified that way — their case
// data is auth-gated at the API (a dev-auth localStorage snapshot mints no real
// bearer, so the read 404s and the editor shows its load-failure view, never
// the form). Those state edge cases are therefore locked in here.

// Passthrough translations so assertions don't depend on i18n resources
// (mirrors case-overview-section.test.tsx). t() returns the key verbatim.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && "slug" in opts ? `${key}:${String(opts.slug)}` : key,
  }),
}));

// Router: the editor reads the slug from the URL (any truthy value puts it in
// edit mode) and never navigates in this test. The public href is built from the
// LOADED case's slug (form.slug), not this param, so tests vary it via loadCase.
const navigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: () => ({ slug: "ncell-tax-case" }),
  useNavigate: () => navigate,
}));

// Casework auth is a context provider we don't mount here.
vi.mock("@/context/CaseworkAuthContext", () => ({
  useCaseworkAuth: () => ({ isModerator: true }),
}));

// The case load is the only network call at render; stub it per-test. Keep the
// module's real error/type exports (CaseConflictError, adminErrorMessage, …).
vi.mock("@/services/admin-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/admin-api")>()),
  getCaseWithEtag: vi.fn(),
}));
import { getCaseWithEtag } from "@/services/admin-api";

// Heavy / side-effectful children are irrelevant to the header link under test;
// stub them so the form renders fast and without the Markdown editor, the
// Nepali datepicker, or the history panel's own fetch on mount.
vi.mock("@uiw/react-md-editor", () => ({ default: () => <div /> }));
vi.mock("@/components/admin/case/EntityRelationshipsEditor", () => ({ default: () => <div /> }));
vi.mock("@/components/admin/case/TimelineEditor", () => ({ default: () => <div /> }));
vi.mock("@/components/admin/case/EvidenceEditor", () => ({ default: () => <div /> }));
vi.mock("@/components/admin/case/ChipListEditor", () => ({ default: () => <div /> }));
vi.mock("@/components/admin/case/CaseStateControl", () => ({ default: () => <div /> }));
vi.mock("@/components/admin/case/CaseHistoryPanel", () => ({ default: () => <div /> }));
vi.mock("@/components/admin/DatePairInput", () => ({ default: () => <div /> }));

import AdminCaseForm from "./AdminCaseForm";

const DEFAULT_SLUG = "ncell-tax-case";

const loadCase = (state: string, slug: string = DEFAULT_SLUG) =>
  vi.mocked(getCaseWithEtag).mockResolvedValue({
    data: {
      slug,
      title: "Ncell tax case",
      case_type: "CORRUPTION",
      state,
    },
    etag: 'W/"1"',
  });

const viewLink = (slug: string = DEFAULT_SLUG): HTMLAnchorElement | null =>
  document.querySelector(`a[href="/case/${slug}"]`);

// Any anchor pointing at a public /case/ route (used to assert NONE exists).
const anyViewLink = (): HTMLAnchorElement | null =>
  document.querySelector('a[href^="/case/"]');

beforeEach(() => {
  vi.mocked(getCaseWithEtag).mockReset();
  navigate.mockReset();
});

describe("AdminCaseForm — View on website link (BB-37)", () => {
  it("renders an enabled new-tab link to /case/<slug> for a PUBLISHED case", async () => {
    loadCase("PUBLISHED");
    render(<AdminCaseForm />);

    await waitFor(() => expect(viewLink()).not.toBeNull());
    const link = viewLink() as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/case/ncell-tax-case");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    // It is a real link, not a disabled control.
    expect(link.hasAttribute("disabled")).toBe(false);
    expect(link.getAttribute("aria-disabled")).not.toBe("true");
  });

  it("builds the href verbatim from the loaded slug, incl. special characters", async () => {
    // Real slugs are lowercase-alnum-hyphen, but the href must reflect the
    // backend's slug exactly — consistent with every other /case/${slug} link in
    // the app (CaseCard, EntityDetail, …), none of which re-encode.
    const specialSlug = "081-cr.0022_ncell-v2.appeal";
    loadCase("PUBLISHED", specialSlug);
    render(<AdminCaseForm />);

    await waitFor(() => expect(viewLink(specialSlug)).not.toBeNull());
    const link = viewLink(specialSlug) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(`/case/${specialSlug}`);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  // DRAFT/IN_REVIEW/CLOSED all 404 publicly — no link to a dead page; the
  // control is disabled with the accessible "not public yet" hint instead.
  it.each(["DRAFT", "IN_REVIEW", "CLOSED"])(
    "disables the link (no public href) for a non-public %s case",
    async (state) => {
      loadCase(state);
      render(<AdminCaseForm />);

      // Wait for the load to resolve (the editing hint appears post-load).
      await waitFor(() =>
        expect(screen.getByText(/admin\.caseForm\.editingHint/)).toBeTruthy(),
      );

      // No public link of any kind is rendered for a non-public case…
      expect(anyViewLink()).toBeNull();
      // …instead a disabled "View on website" button is shown.
      const btn = screen.getByRole("button", {
        name: /admin\.caseForm\.viewOnWebsite/,
      }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      // The native `disabled` already conveys the state; no redundant aria-disabled.
      expect(btn.hasAttribute("aria-disabled")).toBe(false);

      // The "not public yet" reason reaches sighted mouse users via the wrapping
      // span's hover title…
      const tip = btn.closest("span[title]");
      expect(tip?.getAttribute("title")).toBe(
        "admin.caseForm.viewOnWebsiteNotPublic",
      );
      // …and keyboard / screen-reader users via an sr-only hint wired through
      // aria-describedby (a disabled button can't be focused to reveal a title).
      const describedBy = btn.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      const hint = document.getElementById(describedBy as string);
      expect(hint?.textContent).toBe("admin.caseForm.viewOnWebsiteNotPublic");
      expect(hint?.className).toContain("sr-only");
    },
  );
});
