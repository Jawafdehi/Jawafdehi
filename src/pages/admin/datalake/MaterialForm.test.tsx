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

function stageFile(container: HTMLElement, name = "order.pdf") {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("no file input on the create form");
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
  it("offers the attach-a-file control on /new", () => {
    // Regression: the control used to render only in edit mode, so a caseworker
    // had to save, return to the list and re-open the material to attach a file.
    const { container } = render(<MaterialForm />);
    expect(screen.getByText("Attach a file")).toBeTruthy();
    expect(container.querySelector('input[type="file"]')).toBeTruthy();
  });

  it("defers the upload: no upload button, and nothing is sent before Save", () => {
    const { container } = render(<MaterialForm />);
    stageFile(container);
    expect(screen.queryByRole("button", { name: /upload file/i })).toBeNull();
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

  it("surfaces a create failure and never attempts the upload", async () => {
    createMock.mockRejectedValue(new Error("422"));
    const { container } = render(<MaterialForm />);
    fillRequired(container);
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
    await waitFor(() => expect(screen.getByText("Attach a file")).toBeTruthy());

    stageFile(container);
    fireEvent.click(screen.getByRole("button", { name: /upload file/i }));

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
    await waitFor(() => expect(screen.getByText("Attach a file")).toBeTruthy());
    stageFile(container);
    fireEvent.click(screen.getByRole("button", { name: /upload file/i }));

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
});
