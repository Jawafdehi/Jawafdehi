import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import EntityImageField from "@/components/admin/entities/EntityImageField";
import type { CaseImage } from "@/types/jds";

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const uploadCaseImage = vi.fn();
vi.mock("@/services/admin-api", () => ({
  uploadCaseImage: (...args: unknown[]) => uploadCaseImage(...args),
  adminErrorMessage: (_err: unknown, fallback: string) => fallback,
}));

// The card ladder, which is the one an entity picture stores (an avatar is
// 128px at most, so the hero ladder would ship a needlessly large file).
const THUMB: CaseImage = {
  src: "https://s3.example.org/a.width-400.format-webp.webp",
  srcset: "https://s3.example.org/a.width-400.format-webp.webp 400w",
  width: 400,
  height: 400,
  alt: "",
};
const BANNER: CaseImage = { ...THUMB, src: "https://s3.example.org/a.hero.webp", width: 1600 };
const RESULT = { id: 7, title: "ram.png", width: 900, height: 900, thumbnail: THUMB, banner: BANNER };

function renderField(props: Partial<React.ComponentProps<typeof EntityImageField>> = {}) {
  const onChange = vi.fn();
  const onUploadingChange = vi.fn();
  const utils = render(
    <EntityImageField
      value={undefined}
      onChange={onChange}
      onUploadingChange={onUploadingChange}
      {...props}
    />,
  );
  const input = utils.container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("no file input");
  return { ...utils, input, onChange, onUploadingChange };
}

const pick = (input: HTMLInputElement, name = "ram.png") => {
  const file = new File(["x".repeat(64)], name, { type: "image/png" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
};

beforeEach(() => {
  uploadCaseImage.mockReset();
});

describe("EntityImageField", () => {
  it("uploads on pick and reports the stored ImageObject shape", async () => {
    // The stored shape is fixed by the NES->schema.org mapping the importer
    // already follows, so an admin upload and an imported record read alike.
    uploadCaseImage.mockResolvedValue(RESULT);
    const { input, onChange } = renderField();
    pick(input);

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange).toHaveBeenCalledWith({
      "@type": "ImageObject",
      contentUrl: THUMB.src,
      width: 400,
      height: 400,
    });
  });

  it("stores the card rendition, not the hero one", async () => {
    uploadCaseImage.mockResolvedValue(RESULT);
    const { input, onChange } = renderField();
    pick(input);

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const stored = onChange.mock.calls[0][0] as { contentUrl: string };
    expect(stored.contentUrl).toBe(THUMB.src);
    expect(stored.contentUrl).not.toBe(BANNER.src);
  });

  it("reports pending before the upload resolves, and clears it after", async () => {
    // onChange only fires on RESOLVE, so the form has no other way to know an
    // upload is in flight; without this it is submittable in the gap and the
    // entity saves with no picture while the file sits orphaned in the library.
    let resolveUpload: (v: unknown) => void = () => {};
    uploadCaseImage.mockReturnValue(new Promise((r) => (resolveUpload = r)));

    const { input, onUploadingChange, onChange } = renderField();
    pick(input);

    await waitFor(() => expect(onUploadingChange).toHaveBeenCalledWith(true));
    expect(onChange).not.toHaveBeenCalled();

    resolveUpload(RESULT);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onUploadingChange).toHaveBeenLastCalledWith(false);
  });

  it("clears the pending flag when the upload FAILS", async () => {
    // Otherwise a failed upload wedges the form's save button forever.
    uploadCaseImage.mockRejectedValue(new Error("boom"));
    const { input, onUploadingChange, onChange } = renderField();
    pick(input);

    await waitFor(() => expect(onUploadingChange).toHaveBeenLastCalledWith(false));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Upload failed")).toBeTruthy();
  });

  it("rejects an oversize file before any request, and reports no pending", () => {
    const { input, onUploadingChange } = renderField();
    const huge = new File(["x"], "huge.png", { type: "image/png" });
    Object.defineProperty(huge, "size", { value: 11 * 1024 * 1024 });
    Object.defineProperty(input, "files", { value: [huge], configurable: true });
    fireEvent.change(input);

    expect(uploadCaseImage).not.toHaveBeenCalled();
    expect(onUploadingChange).not.toHaveBeenCalledWith(true);
    expect(screen.getByText("Image exceeds the 10MB limit.")).toBeTruthy();
  });

  it("offers an accept filter, so the picker does not offer arbitrary files", () => {
    const { input } = renderField();
    expect(input.getAttribute("accept")).toBe("image/png,image/jpeg,image/webp,image/gif");
  });

  it("removes by dropping the key, not by writing null", () => {
    // The edit form diffs the document BY KEY, so only an absent key yields
    // `remove /image`; a null would be a `replace` writing an unusable value.
    const { onChange } = renderField({
      value: { "@type": "ImageObject", contentUrl: THUMB.src },
    });
    fireEvent.click(screen.getByRole("button", { name: /remove picture/i }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("offers no Remove when there is no picture", () => {
    renderField();
    expect(screen.queryByRole("button", { name: /remove picture/i })).toBeNull();
    expect(screen.getByRole("button", { name: /upload picture/i })).toBeTruthy();
  });

  describe("shapes an imported record may already store", () => {
    it("previews a plain string url", () => {
      renderField({ value: "https://s3.example.org/legacy.jpg" });
      const img = screen.getByTestId("entity-image-preview") as HTMLImageElement;
      expect(img.getAttribute("src")).toBe("https://s3.example.org/legacy.jpg");
    });

    it("previews an ImageObject that uses `url` rather than `contentUrl`", () => {
      renderField({ value: { "@type": "ImageObject", url: "https://s3.example.org/u.jpg" } });
      expect(
        (screen.getByTestId("entity-image-preview") as HTMLImageElement).getAttribute("src"),
      ).toBe("https://s3.example.org/u.jpg");
    });

    it("previews the first usable entry of an array, and warns that others exist", () => {
      renderField({
        value: [
          { "@type": "ImageObject", contentUrl: "https://s3.example.org/1.jpg" },
          { "@type": "ImageObject", contentUrl: "https://s3.example.org/2.jpg" },
        ],
      });
      expect(
        (screen.getByTestId("entity-image-preview") as HTMLImageElement).getAttribute("src"),
      ).toBe("https://s3.example.org/1.jpg");
      expect(screen.getByText(/stores several pictures/i)).toBeTruthy();
    });

    it("passes an unrecognised value straight back rather than rewriting it", () => {
      // An editor who opens a record this field cannot author and saves an
      // unrelated field must not silently lose the pictures.
      const weird = [{ "@type": "ImageObject", contentUrl: "https://s3.example.org/1.jpg" }, "x"];
      const { onChange } = renderField({ value: weird });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it("disables both controls while the form is saving", () => {
    renderField({ value: { "@type": "ImageObject", contentUrl: THUMB.src }, disabled: true });
    const buttons = screen.getAllByRole("button") as HTMLButtonElement[];
    expect(buttons.length).toBeGreaterThan(1); // Replace + Remove
    expect(buttons.every((b) => b.disabled)).toBe(true);
  });
});
