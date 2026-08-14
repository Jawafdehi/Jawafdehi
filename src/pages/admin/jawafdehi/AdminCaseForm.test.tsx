import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// BB-37 — the admin case editor gains a "View on website" link to the public
// case page (/case/<slug>). The link is enabled only for a PUBLISHED (public)
// case; DRAFT/IN_REVIEW/CLOSED 404 publicly, so it is disabled instead. This
// component test renders AdminCaseForm through its real render path (the live
// login-gated admin view is not headlessly reachable) and asserts that gate.

// Passthrough translations so assertions don't depend on i18n resources
// (mirrors case-overview-section.test.tsx). t() returns the key verbatim.
// `t` MUST keep a stable identity across renders, the way the real
// react-i18next does. AdminCaseForm's `loadCase` is a useCallback keyed on
// `[editing, slug, t]` and its effect calls it, so returning a fresh `t` (or a
// fresh wrapper object) on every render re-fires the load on every render — the
// component drops back into its loading spinner mid-test, and asserting on the
// form becomes a race the CI runner loses.
vi.mock("react-i18next", () => {
  const translation = {
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && "slug" in opts ? `${key}:${String(opts.slug)}` : key,
  };
  return { useTranslation: () => translation };
});

// Router: the editor reads the slug from the URL and never navigates in this test.
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

const loadCase = (state: string, extra: Record<string, unknown> = {}) =>
  vi.mocked(getCaseWithEtag).mockResolvedValue({
    data: {
      slug: "ncell-tax-case",
      title: "Ncell tax case",
      case_type: "CORRUPTION",
      state,
      ...extra,
    },
    etag: 'W/"1"',
  });

const viewLink = (): HTMLAnchorElement | null =>
  document.querySelector('a[href="/case/ncell-tax-case"]');

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

  it("renders a public-notes / byline field distinct from the internal notes field (#4)", async () => {
    loadCase("PUBLISHED");
    render(<AdminCaseForm />);

    // Both the internal notes and the new public byline field are present and
    // labelled distinctly (t() passthrough returns the i18n key verbatim).
    await waitFor(() =>
      expect(screen.getByText("admin.caseForm.labelPublicNotes")).toBeTruthy(),
    );
    expect(screen.getByText("admin.caseForm.labelNotes")).toBeTruthy();
    // The help text spells out that the field is public and hand-written.
    expect(screen.getByText("admin.caseForm.publicNotesHelp")).toBeTruthy();
  });

  it("renders an editable short-description field and loads its value from the case", async () => {
    loadCase("PUBLISHED", { short_description: "A concise card blurb." });
    render(<AdminCaseForm />);

    // The field is present and labelled distinctly from the markdown description
    // (t() passthrough returns the i18n key verbatim).
    await waitFor(() =>
      expect(screen.getByText("admin.caseForm.labelShortDescription")).toBeTruthy(),
    );
    expect(screen.getByText("admin.caseForm.shortDescriptionHelp")).toBeTruthy();

    // It is a real, editable textarea seeded with the loaded value — the missing
    // control that made short_description un-editable in the admin panel.
    const field = document.getElementById(
      "short_description",
    ) as HTMLTextAreaElement | null;
    expect(field).not.toBeNull();
    expect(field?.tagName).toBe("TEXTAREA");
    expect(field?.value).toBe("A concise card blurb.");
  });

  it("disables the link (no public href) for a non-public DRAFT case", async () => {
    loadCase("DRAFT");
    render(<AdminCaseForm />);

    // Wait for the load to resolve (the editing hint appears post-load).
    await waitFor(() =>
      expect(screen.getByText(/admin\.caseForm\.editingHint/)).toBeTruthy(),
    );

    // No public link is rendered for a draft…
    expect(viewLink()).toBeNull();
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
    // Regression guard for the re-entrant load described at the i18n mock above:
    // an unstable `t` made this 2+ and left the form flickering back to its
    // spinner, which is what made this test flaky in CI.
    expect(vi.mocked(getCaseWithEtag)).toHaveBeenCalledTimes(1);

    // …and keyboard / screen-reader users via an sr-only hint wired through
    // aria-describedby (a disabled button can't be focused to reveal a title).
    const describedBy = btn.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const hint = document.getElementById(describedBy as string);
    expect(hint?.textContent).toBe("admin.caseForm.viewOnWebsiteNotPublic");
    expect(hint?.className).toContain("sr-only");
  });
});
