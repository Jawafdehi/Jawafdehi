import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Radix Select needs pointer/layout APIs jsdom lacks; a native <select> makes
// onValueChange drivable with fireEvent.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string;
    onValueChange: (v: string) => void;
    disabled?: boolean;
    children?: ReactNode;
  }) => (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onValueChange(e.currentTarget.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

// Radix Tabs activates via pointer events jsdom doesn't implement, so a click
// never switches panels. Swap in a minimal native equivalent that keeps the
// real roles ("tab"/"tabpanel") so the queries still assert real semantics.
vi.mock("@/components/ui/tabs", async () => {
  const React = await import("react");
  const Ctx = React.createContext<{ value: string; set: (v: string) => void }>({
    value: "",
    set: () => {},
  });
  return {
    Tabs: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (v: string) => void;
      children?: ReactNode;
    }) => (
      <Ctx.Provider value={{ value, set: onValueChange }}>{children}</Ctx.Provider>
    ),
    TabsList: ({ children }: { children?: ReactNode }) => (
      <div role="tablist">{children}</div>
    ),
    TabsTrigger: ({ value, children }: { value: string; children?: ReactNode }) => {
      const c = React.useContext(Ctx);
      return (
        <button
          type="button"
          role="tab"
          aria-selected={c.value === value}
          onClick={() => c.set(value)}
        >
          {children}
        </button>
      );
    },
    // `forceMount` is honoured because the edit-mode upload panel depends on
    // it: without it Radix unmounts the panel on a tab switch and destroys the
    // uploader's in-flight/error state. A mock that always unmounted would test
    // the mock instead of the fix.
    //
    // Real Radix leaves `hidden` FALSE under forceMount (`hidden: !present`,
    // `present = forceMount || isSelected`) and relies on the panel's
    // `data-[state=inactive]:hidden` class to hide it. jsdom applies no
    // Tailwind, so stand that class in with the `hidden` attribute — role
    // queries then behave the way a real browser's a11y tree does.
    TabsContent: ({
      value,
      forceMount,
      children,
    }: {
      value: string;
      forceMount?: true;
      children?: ReactNode;
    }) => {
      const c = React.useContext(Ctx);
      const active = c.value === value;
      if (!active && !forceMount) return null;
      return (
        <div role="tabpanel" hidden={!active}>
          {children}
        </div>
      );
    },
  };
});

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...a: unknown[]) => toast(...a) }));

// This form is the sole useMatch consumer: null == the /new route, a match ==
// the /edit/* route. navigate is asserted for the partial-failure redirect.
const navigate = vi.fn();
const { matchRef } = vi.hoisted(() => ({
  matchRef: { current: null as { params: { "*": string } } | null },
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
  useMatch: () => matchRef.current,
}));

const { createMock, uploadMock, replaceMock, getMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  uploadMock: vi.fn(),
  replaceMock: vi.fn(),
  getMock: vi.fn(),
}));
vi.mock("@/services/admin-api", () => ({
  createMaterial: createMock,
  replaceMaterial: replaceMock,
  getMaterialByPath: getMock,
  deleteMaterial: vi.fn(),
  uploadMaterialFile: uploadMock,
  patchMaterialVisibilityPolicy: vi.fn(),
  adminErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

import MaterialForm from "./MaterialForm";

const IRI = "https://jawafdehi.org/material/ciaa/press-2081-042";

// Fill the two fields canSave requires (a valid @id and a name in one language).
function fillRequired(container: HTMLElement, iri = IRI) {
  const iriInput = container.querySelector<HTMLInputElement>("#material-iri");
  const nameNe = container.querySelector<HTMLInputElement>("#name-ne");
  if (!iriInput || !nameNe) throw new Error("form fields missing");
  fireEvent.change(iriInput, { target: { value: iri } });
  fireEvent.change(nameNe, { target: { value: "सीआईएए प्रेस विज्ञप्ति" } });
}

// The Links card's composer is tabbed: the list of attached items is always
// visible, and the tabs switch only HOW you add one. Nothing renders a file
// input until the "Upload file" tab is selected.
const openUpload = () =>
  fireEvent.click(screen.getByRole("tab", { name: /upload file/i }));
const openLinkTab = () =>
  fireEvent.click(screen.getByRole("tab", { name: /add link/i }));

function stageFile(container: HTMLElement, name = "order.pdf") {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("no file input — was the upload panel opened?");
  const file = new File(["x".repeat(64)], name, { type: "application/pdf" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
  return file;
}

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: /save material/i }));

beforeEach(() => {
  matchRef.current = null;
  toast.mockClear();
  navigate.mockClear();
  createMock.mockReset();
  uploadMock.mockReset();
  replaceMock.mockReset();
  getMock.mockReset();
});

describe("MaterialForm — create page file upload", () => {
  it("offers both ways to attach a document from the Links card on /new", () => {
    // Regression: the upload control used to render only in edit mode, so a
    // caseworker had to save, return to the list and re-open the material to
    // attach a file. Pasting a URL was the only option on /new.
    const { container } = render(<MaterialForm />);
    expect(screen.getByRole("tab", { name: /add link/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /upload file/i })).toBeTruthy();
    // Link is the default tab, so no file input until the other one is chosen.
    expect(container.querySelector('input[type="file"]')).toBeNull();

    openUpload();
    expect(screen.getByText("Attach a file")).toBeTruthy();
    expect(container.querySelector('input[type="file"]')).toBeTruthy();
  });

  it("keeps a staged file visible in the list, and across a tab switch", () => {
    // The staged file must never be invisible state that the next Save acts on,
    // so it is listed with the links rather than living only inside the tab.
    const { container } = render(<MaterialForm />);
    openUpload();
    stageFile(container, "charge-sheet.pdf");

    expect(screen.getByText("charge-sheet.pdf")).toBeTruthy();
    expect(screen.getByText(/attaches on save/i)).toBeTruthy();

    // Switching back to the link tab hides the picker but NOT the staged row.
    openLinkTab();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.getByText("charge-sheet.pdf")).toBeTruthy();
  });

  it("removing the staged row un-stages the file so Save does not upload it", async () => {
    createMock.mockResolvedValue({ "@id": IRI });
    const { container } = render(<MaterialForm />);
    fillRequired(container);
    openUpload();
    stageFile(container);
    fireEvent.click(screen.getByRole("button", { name: /remove staged file/i }));
    expect(screen.queryByText(/attaches on save/i)).toBeNull();

    save();
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/admin/datalake/materials"),
    );
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("defers the upload: the panel has no action button, and nothing is sent before Save", () => {
    const { container } = render(<MaterialForm />);
    openUpload();
    stageFile(container);
    // "Attach file" is the immediate-mode action; deferred mode rides on Save,
    // so offering it here would imply a write that doesn't happen.
    expect(screen.queryByRole("button", { name: /attach file/i })).toBeNull();
    expect(uploadMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates the material FIRST, then attaches the staged file", async () => {
    // Order is load-bearing: createMaterial replaces the stored `data` document
    // wholesale, so attaching first would have its MediaObject erased by the
    // create. Attaching last lets the upload's read-modify-write keep both.
    createMock.mockResolvedValue({ "@id": IRI });
    uploadMock.mockResolvedValue({ "@id": IRI });

    const { container } = render(<MaterialForm />);
    fillRequired(container);
    openUpload();
    const file = stageFile(container);
    save();

    await waitFor(() => expect(uploadMock).toHaveBeenCalled());
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(uploadMock).toHaveBeenCalledWith("ciaa", "press-2081-042", file, "RAW");
    expect(createMock.mock.invocationCallOrder[0]).toBeLessThan(
      uploadMock.mock.invocationCallOrder[0],
    );
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/admin/datalake/materials"),
    );
  });

  it("derives the upload path from the @id the server returned, not the typed one", async () => {
    // The server canonicalizes the IRI, so the returned @id is the authority.
    const canonical = "https://jawafdehi.org/material/court/sc/068-ci-0123";
    createMock.mockResolvedValue({ "@id": canonical });
    uploadMock.mockResolvedValue({});

    const { container } = render(<MaterialForm />);
    fillRequired(container, "https://jawafdehi.org/material/court/sc/068-ci-0123");
    openUpload();
    stageFile(container);
    save();

    await waitFor(() =>
      expect(uploadMock).toHaveBeenCalledWith(
        "court/sc",
        "068-ci-0123",
        expect.any(File),
        "RAW",
      ),
    );
  });

  it("saves without uploading when no file was staged", async () => {
    createMock.mockResolvedValue({ "@id": IRI });
    const { container } = render(<MaterialForm />);
    fillRequired(container);
    save();

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/admin/datalake/materials"),
    );
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("keeps the saved material and routes to its edit page when only the upload fails", async () => {
    // The material really was created, so reporting a failed save would be
    // false; the edit page is where the retry control lives.
    createMock.mockResolvedValue({ "@id": IRI });
    uploadMock.mockRejectedValue(new Error("boom"));

    const { container } = render(<MaterialForm />);
    fillRequired(container);
    openUpload();
    stageFile(container);
    save();

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Material saved, but the file was not attached",
          variant: "destructive",
        }),
      ),
    );
    expect(navigate).toHaveBeenCalledWith(
      "/admin/datalake/materials/edit/ciaa/press-2081-042",
    );
    expect(navigate).not.toHaveBeenCalledWith("/admin/datalake/materials");
    expect(screen.queryByText("Failed to save material")).toBeNull();
  });

  it("reopens the upload tab on partial failure, so the retry control is on screen", async () => {
    // `composer` survives the redirect for the same reason `staged` does —
    // both routes render this element, so React reconciles them as one
    // instance. Staging on "Upload file" and then switching back to "Add link"
    // would otherwise land the caseworker on an edit page whose only visible
    // affordance is "Add a link row".
    createMock.mockResolvedValue({ "@id": IRI });
    uploadMock.mockRejectedValue(new Error("boom"));

    const { container } = render(<MaterialForm />);
    fillRequired(container);
    openUpload();
    stageFile(container);
    openLinkTab();
    expect(
      screen.getByRole("tab", { name: /add link/i }).getAttribute("aria-selected"),
    ).toBe("true");

    save();

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        "/admin/datalake/materials/edit/ciaa/press-2081-042",
      ),
    );
    expect(
      screen.getByRole("tab", { name: /upload file/i }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("surfaces a create failure and never attempts the upload", async () => {
    createMock.mockRejectedValue(new Error("422"));
    const { container } = render(<MaterialForm />);
    fillRequired(container);
    openUpload();
    stageFile(container);
    save();

    await waitFor(() =>
      expect(screen.getByText("Failed to save material")).toBeTruthy(),
    );
    expect(uploadMock).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("MaterialForm — edit page file upload", () => {
  beforeEach(() => {
    matchRef.current = { params: { "*": "ciaa/press-2081-042" } };
    getMock.mockResolvedValue({
      "@context": "https://schema.org",
      "@id": IRI,
      "@type": "DigitalDocument",
      name: { ne: "प्रेस विज्ञप्ति" },
      "jawafdehi:visibilityPolicy": "PUBLIC",
      "jawafdehi:visibility": "LISTED",
    });
  });

  it("still uploads immediately, with its own button", async () => {
    uploadMock.mockResolvedValue({ "@id": IRI });
    const { container } = render(<MaterialForm />);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /upload file/i })).toBeTruthy(),
    );

    openUpload();
    stageFile(container);
    fireEvent.click(screen.getByRole("button", { name: /attach file/i }));

    await waitFor(() =>
      expect(uploadMock).toHaveBeenCalledWith(
        "ciaa",
        "press-2081-042",
        expect.any(File),
        "RAW",
      ),
    );
    // The upload is out-of-band: it must not trigger the form's own save.
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("blocks Save while an upload is in flight", async () => {
    // The headline data-loss guard: a PUT during the gap replaces `data`
    // wholesale and drops the MediaObject the upload is still appending.
    // Asserted here, not just in the child's onUploadingChange test, because
    // dropping the prop from the call site would silently un-fix the race.
    let resolveUpload: (v: unknown) => void = () => {};
    uploadMock.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );

    const { container } = render(<MaterialForm />);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /upload file/i })).toBeTruthy(),
    );
    const saveBtn = () =>
      screen.getByRole("button", { name: /save material/i }) as HTMLButtonElement;
    expect(saveBtn().disabled).toBe(false);

    openUpload();
    stageFile(container);
    fireEvent.click(screen.getByRole("button", { name: /attach file/i }));

    await waitFor(() => expect(saveBtn().disabled).toBe(true));
    // The endpoint returns the whole stored document (a name is required by the
    // backend validator), so resolve with one — an @id-only body would blank
    // `name` via applyDoc and keep Save disabled for an unrelated reason.
    resolveUpload({
      "@context": "https://schema.org",
      "@id": IRI,
      "@type": "DigitalDocument",
      name: { ne: "प्रेस विज्ञप्ति" },
    });
    await waitFor(() => expect(saveBtn().disabled).toBe(false));
  });

  it("keeps the visibility annotations the upload response omits", async () => {
    // The write plane returns the document without the authed-read annotations,
    // so applying it verbatim would blank the policy and hide the control.
    uploadMock.mockResolvedValue({
      "@context": "https://schema.org",
      "@id": IRI,
      "@type": "DigitalDocument",
      name: { ne: "प्रेस विज्ञप्ति" },
      associatedMedia: [
        { "@type": "MediaObject", contentUrl: "https://s3.example.org/a.pdf" },
      ],
    });

    const { container } = render(<MaterialForm />);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /upload file/i })).toBeTruthy(),
    );
    openUpload();
    stageFile(container);
    fireEvent.click(screen.getByRole("button", { name: /attach file/i }));

    // The uploaded file's URL reached the Links editor...
    await waitFor(() =>
      expect(
        container.querySelector<HTMLInputElement>('input[aria-label="Link 1 URL"]')
          ?.value,
      ).toBe("https://s3.example.org/a.pdf"),
    );
    // ...and the visibility control survived the refresh.
    expect(screen.getByText("LISTED")).toBeTruthy();
  });

  it("keeps an upload failure reportable across a composer tab switch", async () => {
    // Regression: the panel used to unmount on a tab switch, so `setError`
    // landed on a dead component. With no toast on the failure path either,
    // the upload failed in total silence and the picked file was destroyed.
    let rejectUpload: (e: unknown) => void = () => {};
    uploadMock.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectUpload = reject;
      }),
    );

    const { container } = render(<MaterialForm />);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /upload file/i })).toBeTruthy(),
    );
    openUpload();
    stageFile(container);
    fireEvent.click(screen.getByRole("button", { name: /attach file/i }));

    // The caseworker wanders off to the link tab while the bytes are in flight.
    openLinkTab();
    rejectUpload(new Error("boom"));

    // Coming back, the failure is still on screen and the pick survived, so
    // "Attach file" can retry it without re-picking from disk.
    await waitFor(() => expect(screen.getByText("Upload failed")).toBeTruthy());
    openUpload();
    expect(screen.getByText("Upload failed")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: /attach file/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("does not let a tab switch start a second, overlapping upload", async () => {
    // Regression: remounting reset the child's `uploading`, so "Attach file"
    // came back enabled mid-flight. A second upload could start, and the FIRST
    // one settling cleared `uploadPending` while the second was still going —
    // re-opening the Save-vs-upload race, since a PUT in that window replaces
    // `data` wholesale and drops the MediaObject being appended.
    const resolvers: Array<(v: unknown) => void> = [];
    uploadMock.mockImplementation(
      () => new Promise((resolve) => resolvers.push(resolve)),
    );

    const { container } = render(<MaterialForm />);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /upload file/i })).toBeTruthy(),
    );
    const saveBtn = () =>
      screen.getByRole("button", { name: /save material/i }) as HTMLButtonElement;

    openUpload();
    stageFile(container);
    fireEvent.click(screen.getByRole("button", { name: /attach file/i }));
    await waitFor(() => expect(saveBtn().disabled).toBe(true));

    openLinkTab();
    openUpload();

    // Try in earnest to start a second one: pick another file and click. The
    // surviving instance is still uploading, so its input and button are both
    // disabled and React drops the events. (Without forceMount this is a fresh
    // instance with `uploading` reset, the pick lands, and the click fires a
    // second POST — which is what makes the gate below fail open.)
    stageFile(container, "second.pdf");
    fireEvent.click(screen.getByRole("button", { name: /attach file/i }));
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(saveBtn().disabled).toBe(true);

    // The first upload settling may only unlock Save because it is the ONLY
    // one; if a second were in flight this is where the race would open.
    resolvers[0]({
      "@context": "https://schema.org",
      "@id": IRI,
      "@type": "DigitalDocument",
      name: { ne: "प्रेस विज्ञप्ति" },
    });
    await waitFor(() => expect(saveBtn().disabled).toBe(false));
    expect(resolvers).toHaveLength(1);
  });
});
