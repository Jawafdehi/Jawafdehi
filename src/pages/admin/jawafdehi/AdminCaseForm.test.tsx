import { describe, it, expect, beforeEach, vi } from "vitest";
import { render as rtlRender, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

// Router: the editor reads the slug from the URL. Most tests are edit-mode, so
// the slug defaults to the fixture; a create-mode test clears it. Hoisted (not a
// plain `let`) because the mock factory runs before this file's own bindings are
// initialized.
const route = vi.hoisted(() => ({ slug: "ncell-tax-case" as string | undefined }));
const navigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: () => ({ slug: route.slug }),
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
  patchCaseWithEtag: vi.fn(),
  createCase: vi.fn(),
  // The byline editor fetches the account roster on mount. Stubbed so the test
  // exercises the form, not axios against a jsdom origin that has no server.
  listCaseAuthorCandidates: vi.fn(async () => []),
}));
import { createCase, getCaseWithEtag, patchCaseWithEtag } from "@/services/admin-api";

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
// Interactive enough for B3: renders the label and an AD input wired to
// onAdChange, so a test can find a date field by its label and drive a value
// through it without exercising the real calendar popovers.
vi.mock("@/components/admin/DatePairInput", () => ({
  default: ({
    label,
    idBase,
    adValue,
    onAdChange,
  }: {
    label: string;
    idBase: string;
    adValue: string;
    onAdChange: (ad: string) => void;
  }) => (
    <div>
      <label htmlFor={`${idBase}-ad`}>{label}</label>
      <input
        id={`${idBase}-ad`}
        value={adValue}
        onChange={(e) => onAdChange(e.target.value)}
      />
    </div>
  ),
}));

import AdminCaseForm from "./AdminCaseForm";
import { dateChronologyErrors } from "@/lib/jawafdehi-forms";

// The byline editor reads its roster through React Query, so the component
// needs a provider — the real app mounts one above this route.
const render = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

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
  route.slug = "ncell-tax-case";
  vi.mocked(getCaseWithEtag).mockReset();
  vi.mocked(patchCaseWithEtag).mockReset();
  vi.mocked(createCase).mockReset();
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

  it("renders the structured byline editor distinct from the internal notes field", async () => {
    loadCase("PUBLISHED");
    render(<AdminCaseForm />);

    // The byline (authors / first published / edit history) replaced the
    // free-text public_notes field, and is distinct from the internal notes
    // (t() passthrough returns the i18n key verbatim).
    await waitFor(() =>
      expect(screen.getByText("admin.caseForm.bylineHeading")).toBeTruthy(),
    );
    expect(screen.getByText("admin.caseForm.labelAuthors")).toBeTruthy();
    expect(screen.getByText("admin.caseForm.labelPublishDate")).toBeTruthy();
    expect(screen.getByText("admin.caseForm.labelEditHistory")).toBeTruthy();
    expect(screen.getByText("admin.caseForm.labelNotes")).toBeTruthy();
  });

  it("hides the deprecated free-text byline on a case that doesn't carry one", async () => {
    loadCase("PUBLISHED", { public_notes: "" });
    render(<AdminCaseForm />);

    await waitFor(() =>
      expect(screen.getByText("admin.caseForm.bylineHeading")).toBeTruthy(),
    );
    // Nothing new should be written to public_notes, so the field is not offered.
    expect(screen.queryByText("admin.caseForm.labelPublicNotes")).toBeNull();
  });

  it("still shows the deprecated free-text byline on an un-backfilled case", async () => {
    // The ~72 legacy cases keep their hand-written line until it is replaced, so
    // a caseworker must be able to read and clear it.
    loadCase("PUBLISHED", {
      public_notes: "**Case Drafted by Rujit Kafle. First Published On 21 May 2026.**",
    });
    render(<AdminCaseForm />);

    await waitFor(() =>
      expect(screen.getByText("admin.caseForm.labelPublicNotes")).toBeTruthy(),
    );
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

describe("AdminCaseForm — trial/appeal dates (B3)", () => {
  it("renders the four date inputs by label under an appeal heading", async () => {
    loadCase("PUBLISHED");
    render(<AdminCaseForm />);

    await waitFor(() =>
      expect(screen.getByText("admin.caseForm.appealHeading")).toBeTruthy(),
    );
    expect(screen.getByLabelText("admin.caseForm.trialStart")).toBeTruthy();
    expect(screen.getByLabelText("admin.caseForm.trialEnd")).toBeTruthy();
    expect(screen.getByLabelText("admin.caseForm.appealStart")).toBeTruthy();
    expect(screen.getByLabelText("admin.caseForm.appealEnd")).toBeTruthy();
  });

  it("emits replace ops only for the trial/appeal date fields that changed", async () => {
    loadCase("PUBLISHED", {
      trial_start_date: "2080-01-01",
      trial_end_date: "2080-06-15",
      appeal_start_date: null,
      appeal_end_date: null,
    });
    vi.mocked(patchCaseWithEtag).mockResolvedValue({
      data: {
        slug: "ncell-tax-case",
        title: "Ncell tax case",
        case_type: "CORRUPTION",
        state: "PUBLISHED",
      },
      etag: 'W/"2"',
    });
    render(<AdminCaseForm />);

    await waitFor(() =>
      expect(screen.getByLabelText("admin.caseForm.trialEnd")).toBeTruthy(),
    );

    // Change trial end and appeal start; leave trial start and appeal end alone.
    fireEvent.change(screen.getByLabelText("admin.caseForm.trialEnd"), {
      target: { value: "2080-07-20" },
    });
    fireEvent.change(screen.getByLabelText("admin.caseForm.appealStart"), {
      target: { value: "2080-08-01" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "admin.caseForm.saveChanges" }),
    );

    await waitFor(() =>
      expect(patchCaseWithEtag).toHaveBeenCalledTimes(1),
    );
    const [, ops] = vi.mocked(patchCaseWithEtag).mock.calls[0];
    const byPath = Object.fromEntries(
      (ops as { path: string; value: unknown }[]).map((o) => [o.path, o.value]),
    );
    expect(byPath["/trial_end_date"]).toBe("2080-07-20");
    expect(byPath["/appeal_start_date"]).toBe("2080-08-01");
    // Unchanged fields (one populated, one still blank) emit no op at all.
    expect("/trial_start_date" in byPath).toBe(false);
    expect("/appeal_end_date" in byPath).toBe(false);
  });

  it("emits a null value when a populated date is cleared", async () => {
    loadCase("PUBLISHED", {
      trial_start_date: "2080-01-01",
      trial_end_date: "2080-06-15",
      appeal_start_date: null,
      appeal_end_date: null,
    });
    vi.mocked(patchCaseWithEtag).mockResolvedValue({
      data: {
        slug: "ncell-tax-case",
        title: "Ncell tax case",
        case_type: "CORRUPTION",
        state: "PUBLISHED",
      },
      etag: 'W/"2"',
    });
    render(<AdminCaseForm />);

    await waitFor(() =>
      expect(screen.getByLabelText("admin.caseForm.trialEnd")).toBeTruthy(),
    );

    fireEvent.change(screen.getByLabelText("admin.caseForm.trialEnd"), {
      target: { value: "" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "admin.caseForm.saveChanges" }),
    );

    await waitFor(() =>
      expect(patchCaseWithEtag).toHaveBeenCalledTimes(1),
    );
    const [, ops] = vi.mocked(patchCaseWithEtag).mock.calls[0];
    const byPath = Object.fromEntries(
      (ops as { path: string; value: unknown }[]).map((o) => [o.path, o.value]),
    );
    expect(byPath["/trial_end_date"]).toBe(null);
  });
});

describe("dateChronologyErrors", () => {
  const CONSISTENT = {
    trial_start_date: "2023-01-15",
    trial_end_date: "2024-06-10",
    appeal_start_date: "2024-07-01",
    appeal_end_date: "2025-02-20",
  };

  it("returns nothing for a consistent set of four dates", () => {
    expect(dateChronologyErrors(CONSISTENT)).toEqual({});
  });

  it("returns nothing when every field is blank", () => {
    expect(
      dateChronologyErrors({
        trial_start_date: "",
        trial_end_date: "",
        appeal_start_date: "",
        appeal_end_date: "",
      }),
    ).toEqual({});
  });

  it("flags a trial end before the trial start", () => {
    expect(
      dateChronologyErrors({ ...CONSISTENT, trial_end_date: "2022-12-31" }),
    ).toEqual({
      trial_end_date: "admin.caseForm.trialEndBeforeStart",
      // The appeal end is then compared against that (earlier) trial end, which
      // it still follows, so only the trial pair is at fault.
    });
  });

  it("flags an appeal start before the latest trial date", () => {
    expect(
      dateChronologyErrors({ ...CONSISTENT, appeal_start_date: "2024-01-01" }),
    ).toEqual({
      appeal_start_date: "admin.caseForm.appealStartBeforeTrial",
    });
  });

  it("flags an appeal end before the appeal start", () => {
    expect(
      dateChronologyErrors({ ...CONSISTENT, appeal_end_date: "2024-06-30" }),
    ).toEqual({
      appeal_end_date: "admin.caseForm.appealEndBeforeStart",
    });
  });

  it("flags an appeal end before the trial dates when no appeal start is set", () => {
    expect(
      dateChronologyErrors({
        ...CONSISTENT,
        appeal_start_date: "",
        appeal_end_date: "2024-01-01",
      }),
    ).toEqual({
      appeal_end_date: "admin.caseForm.appealEndBeforeTrial",
    });
  });

  it("anchors the appeal on the trial start when no trial end is set", () => {
    expect(
      dateChronologyErrors({
        trial_start_date: "2024-06-10",
        trial_end_date: "",
        appeal_start_date: "2024-01-01",
        appeal_end_date: "",
      }),
    ).toEqual({
      appeal_start_date: "admin.caseForm.appealStartBeforeTrial",
    });
  });

  it("compares an unpadded date chronologically, not lexically", () => {
    // The editor accepts "YYYY-M-D" (isValidDateField), where a raw string
    // compare would read "2024-9-01" as earlier than "2024-10-01".
    expect(
      dateChronologyErrors({
        trial_start_date: "2024-9-01",
        trial_end_date: "2024-10-01",
        appeal_start_date: "",
        appeal_end_date: "",
      }),
    ).toEqual({});
  });
});

describe("AdminCaseForm — client-side date chronology", () => {
  it("shows an inline message under the offending field and disables Save", async () => {
    loadCase("PUBLISHED", {
      trial_start_date: "2024-06-01",
      trial_end_date: null,
      appeal_start_date: null,
      appeal_end_date: null,
    });
    render(<AdminCaseForm />);

    await waitFor(() =>
      expect(screen.getByLabelText("admin.caseForm.trialEnd")).toBeTruthy(),
    );

    fireEvent.change(screen.getByLabelText("admin.caseForm.trialEnd"), {
      target: { value: "2024-01-01" },
    });

    expect(screen.getByText("admin.caseForm.trialEndBeforeStart")).toBeTruthy();
    // The malformed-shape hint is NOT what fires here — both dates parse.
    expect(screen.queryByText("admin.caseForm.datesInvalid")).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "admin.caseForm.saveChanges",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("clears the message and re-enables Save once the order is fixed", async () => {
    loadCase("PUBLISHED", {
      trial_start_date: "2024-06-01",
      trial_end_date: null,
      appeal_start_date: null,
      appeal_end_date: null,
    });
    render(<AdminCaseForm />);

    await waitFor(() =>
      expect(screen.getByLabelText("admin.caseForm.trialEnd")).toBeTruthy(),
    );

    const trialEnd = screen.getByLabelText("admin.caseForm.trialEnd");
    fireEvent.change(trialEnd, { target: { value: "2024-01-01" } });
    expect(screen.getByText("admin.caseForm.trialEndBeforeStart")).toBeTruthy();

    fireEvent.change(trialEnd, { target: { value: "2024-08-01" } });
    expect(screen.queryByText("admin.caseForm.trialEndBeforeStart")).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "admin.caseForm.saveChanges",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
});

describe("AdminCaseForm — create mode carries the four dates", () => {
  it("posts the typed trial/appeal dates, and null for the ones left blank", async () => {
    route.slug = undefined;
    vi.mocked(createCase).mockResolvedValue({ slug: "new-case" });
    render(<AdminCaseForm />);

    await waitFor(() =>
      expect(screen.getByLabelText("admin.caseForm.trialStart")).toBeTruthy(),
    );

    fireEvent.change(screen.getByLabelText("admin.caseForm.labelTitle"), {
      target: { value: "A brand new case" },
    });
    fireEvent.change(screen.getByLabelText("admin.caseForm.trialStart"), {
      target: { value: "2024-01-15" },
    });
    fireEvent.change(screen.getByLabelText("admin.caseForm.trialEnd"), {
      target: { value: "2024-06-10" },
    });
    fireEvent.change(screen.getByLabelText("admin.caseForm.appealStart"), {
      target: { value: "2024-07-01" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "admin.caseForm.createCase" }),
    );

    await waitFor(() => expect(createCase).toHaveBeenCalledTimes(1));
    const [payload] = vi.mocked(createCase).mock.calls[0];
    expect(payload.trial_start_date).toBe("2024-01-15");
    expect(payload.trial_end_date).toBe("2024-06-10");
    expect(payload.appeal_start_date).toBe("2024-07-01");
    // Left blank — sent explicitly as null rather than silently dropped.
    expect(payload.appeal_end_date).toBe(null);
  });
});
