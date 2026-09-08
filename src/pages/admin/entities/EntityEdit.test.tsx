import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const navigate = vi.fn();
const { refRef } = vi.hoisted(() => ({ refRef: { current: "person/ram-bahadur" } }));
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
  useParams: () => ({ "*": refRef.current }),
}));

const { getEntity, patchEntity, getEntityVersions, deleteEntity, uploadCaseImage } =
  vi.hoisted(() => ({
    getEntity: vi.fn(),
    patchEntity: vi.fn(),
    getEntityVersions: vi.fn(),
    deleteEntity: vi.fn(),
    uploadCaseImage: vi.fn(),
  }));
vi.mock("@/services/admin-api", () => ({
  getEntity,
  patchEntity,
  getEntityVersions,
  deleteEntity,
  uploadCaseImage,
  adminErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

import EntityEdit from "./EntityEdit";

const IRI = "https://jawafdehi.org/entity/person/ram-bahadur";
// Non-square, so a width/height transposition cannot pass.
const THUMB = {
  src: "https://s3.example.org/new.width-1200.format-webp.webp",
  srcset: "",
  width: 1200,
  height: 675,
  alt: "",
};
const RESULT = { id: 5, title: "new.png", width: 900, height: 900, thumbnail: THUMB, banner: THUMB };
const OLD_IMAGE = { "@type": "ImageObject", contentUrl: "https://s3.example.org/old.jpg" };

const doc = (extra: Record<string, unknown> = {}) => ({
  "@context": "https://schema.org",
  "@id": IRI,
  "@type": "Person",
  name: { en: "Ram Bahadur" },
  ...extra,
});

async function renderEdit(d: Record<string, unknown>) {
  getEntity.mockResolvedValue(d);
  getEntityVersions.mockResolvedValue({ versions: [], total: 2 });
  const utils = render(<EntityEdit />);
  await waitFor(() => expect(screen.getByLabelText(/name \(english\)/i)).toBeTruthy());
  return utils;
}

function pickPicture(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File(["x".repeat(64)], "new.png", { type: "image/png" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

const saveBtn = () =>
  screen.getByRole("button", { name: /save changes/i }) as HTMLButtonElement;
const extraBox = (c: HTMLElement) => c.querySelector<HTMLTextAreaElement>("#extra")!;

beforeEach(() => {
  navigate.mockClear();
  getEntity.mockReset();
  patchEntity.mockReset();
  getEntityVersions.mockReset();
  uploadCaseImage.mockReset();
});

describe("EntityEdit — picture", () => {
  it("lifts `image` out of the JSON box, so it has exactly one editor", async () => {
    // Editable in both places, the two would diverge and whichever the `after`
    // merge applied last would silently win.
    const { container } = await renderEdit(doc({ image: OLD_IMAGE, jobTitle: "Mayor" }));
    const json = extraBox(container).value;
    expect(json).toContain("jobTitle");
    expect(json).not.toContain("image");
    // ...and it is shown in the picture field instead.
    expect(
      (screen.getByTestId("entity-image-preview") as HTMLImageElement).getAttribute("src"),
    ).toBe(OLD_IMAGE.contentUrl);
  });

  it("replacing the picture emits one `replace /image` op", async () => {
    uploadCaseImage.mockResolvedValue(RESULT);
    patchEntity.mockResolvedValue(doc({ image: { "@type": "ImageObject", contentUrl: THUMB.src } }));

    const { container } = await renderEdit(doc({ image: OLD_IMAGE }));
    pickPicture(container);
    await waitFor(() => expect(saveBtn().disabled).toBe(false));

    fireEvent.click(saveBtn());
    await waitFor(() => expect(patchEntity).toHaveBeenCalled());
    expect(patchEntity.mock.calls[0][1]).toEqual([
      {
        op: "replace",
        path: "/image",
        value: { "@type": "ImageObject", contentUrl: THUMB.src, width: 1200, height: 675 },
      },
    ]);
  });

  it("removing the picture emits `remove /image`, not a null write", async () => {
    patchEntity.mockResolvedValue(doc());
    const { container } = await renderEdit(doc({ image: OLD_IMAGE }));
    void container;

    fireEvent.click(screen.getByRole("button", { name: /remove picture/i }));
    await waitFor(() => expect(saveBtn().disabled).toBe(false));

    fireEvent.click(saveBtn());
    await waitFor(() => expect(patchEntity).toHaveBeenCalled());
    expect(patchEntity.mock.calls[0][1]).toEqual([{ op: "remove", path: "/image" }]);
  });

  it("adding a picture to a record that had none emits `add /image`", async () => {
    uploadCaseImage.mockResolvedValue(RESULT);
    patchEntity.mockResolvedValue(doc());

    const { container } = await renderEdit(doc());
    pickPicture(container);
    await waitFor(() => expect(saveBtn().disabled).toBe(false));

    fireEvent.click(saveBtn());
    await waitFor(() => expect(patchEntity).toHaveBeenCalled());
    expect(patchEntity.mock.calls[0][1]).toEqual([
      {
        op: "add",
        path: "/image",
        value: { "@type": "ImageObject", contentUrl: THUMB.src, width: 1200, height: 675 },
      },
    ]);
  });

  it("leaves an un-authorable image untouched when an unrelated field changes", async () => {
    // An editor who opens a record storing several pictures and fixes the name
    // must not silently lose the ones this field cannot author.
    const many = [
      { "@type": "ImageObject", contentUrl: "https://s3.example.org/1.jpg" },
      { "@type": "ImageObject", contentUrl: "https://s3.example.org/2.jpg" },
    ];
    patchEntity.mockResolvedValue(doc({ image: many }));

    await renderEdit(doc({ image: many }));
    fireEvent.change(screen.getByLabelText(/name \(english\)/i), {
      target: { value: "Ram B. Thapa" },
    });
    await waitFor(() => expect(saveBtn().disabled).toBe(false));

    fireEvent.click(saveBtn());
    await waitFor(() => expect(patchEntity).toHaveBeenCalled());
    const ops = patchEntity.mock.calls[0][1] as Array<{ path: string }>;
    expect(ops.map((o) => o.path)).toEqual(["/name"]);
  });

  it("blocks Save while the picture is uploading", async () => {
    // There must be a PENDING EDIT first. `canSave` also requires
    // `patchOps.length > 0`, and picking a file changes nothing until the
    // upload resolves — so on an untouched document Save is already disabled
    // for want of changes and this would assert nothing about the gate.
    let resolveUpload: (v: unknown) => void = () => {};
    uploadCaseImage.mockReturnValue(new Promise((r) => (resolveUpload = r)));

    const { container } = await renderEdit(doc());
    fireEvent.change(screen.getByLabelText(/name \(english\)/i), {
      target: { value: "Ram B. Thapa" },
    });
    await waitFor(() => expect(saveBtn().disabled).toBe(false));

    pickPicture(container);
    await waitFor(() => expect(uploadCaseImage).toHaveBeenCalled());
    // Now the ONLY thing that can be disabling Save is the in-flight upload.
    expect(saveBtn().disabled).toBe(true);
    fireEvent.click(saveBtn());
    expect(patchEntity).not.toHaveBeenCalled();

    resolveUpload(RESULT);
    await waitFor(() => expect(saveBtn().disabled).toBe(false));
  });

  it("rejects an `image` smuggled through the JSON box", async () => {
    const { container } = await renderEdit(doc({ jobTitle: "Mayor" }));
    fireEvent.change(extraBox(container), {
      target: { value: '{"image": "https://evil.example/x.jpg"}' },
    });

    expect(
      screen.getByText(/"image" is managed separately and can't be set here/i),
    ).toBeTruthy();
    expect(saveBtn().disabled).toBe(true);
  });

  it("re-hydrates the picture from the server's response after a save", async () => {
    // The PATCH returns the stored document; the field must follow it rather
    // than keep showing what was uploaded locally.
    uploadCaseImage.mockResolvedValue(RESULT);
    const serverShape = { "@type": "ImageObject", contentUrl: "https://s3.example.org/canonical.webp" };
    patchEntity.mockResolvedValue(doc({ image: serverShape }));

    const { container } = await renderEdit(doc());
    pickPicture(container);
    await waitFor(() => expect(saveBtn().disabled).toBe(false));
    fireEvent.click(saveBtn());

    await waitFor(() =>
      expect(
        (screen.getByTestId("entity-image-preview") as HTMLImageElement).getAttribute("src"),
      ).toBe(serverShape.contentUrl),
    );
    // And the re-hydrated image still isn't duplicated into the JSON box.
    expect(extraBox(container).value).not.toContain("image");
  });
});
