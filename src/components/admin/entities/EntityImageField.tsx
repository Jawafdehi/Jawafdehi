import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { uploadCaseImage, adminErrorMessage } from "@/services/admin-api";
import { FieldError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  entityImageObject,
  entityImageUrl,
  ENTITY_IMAGE_KEY,
} from "@/lib/entity-jsonld";

// The backend's own cap (WAGTAILIMAGES_MAX_UPLOAD_SIZE). Checked here too so an
// oversize file is refused before it is streamed, rather than after.
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// What the file picker offers. The backend re-derives the real format from the
// bytes and rejects a mismatch (WagtailImageField checks the content matches
// the extension), so this is a convenience, not the gate.
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

interface Props {
  /** The entity doc's current `image` value, in whatever shape it is stored. */
  value: unknown;
  /** Called with the next `image` value, or undefined to drop the key. */
  onChange: (next: unknown) => void;
  /** Reports whether an upload is in flight, so the form can block save. */
  onUploadingChange?: (uploading: boolean) => void;
  /** Set while the form is saving, so a picker cannot start a late upload. */
  disabled?: boolean;
}

/** Upload-and-preview control for an entity's picture (schema.org `image`).
 *
 * WHERE THE BYTES GO. There is no entity-scoped upload endpoint — the entities
 * app has no file-accepting route at all — so this posts to the case-image
 * library endpoint (`POST /api/case-images/`). That is a reuse, not a hack: the
 * endpoint carries no case reference anywhere in the view, it exists to add a
 * file to the shared image library and hand back a handle, and pointing a
 * record at that handle is deliberately a separate write. Its permission
 * (`IsCaseImageUploader` → superuser or Caseworker) is the SAME principal set
 * `HasEntityWriteRole` requires, so there is no role a person could hold that
 * would let them edit an entity but not upload its picture.
 *
 * WHY IT UPLOADS ON PICK, not on save. Same reason as `CaseImageField`: the
 * upload only adds to the library, so it costs nothing if the editor then
 * abandons the form, and the preview shows the REAL rendition the profile will
 * serve rather than a local object URL that might differ. Nothing about an
 * entity write forces a deferral either — create sends the value inside its
 * single POST and edit sends one RFC-6902 op — so unlike the material file
 * flow there is no create-then-attach ordering, and therefore no "saved but
 * the picture didn't attach" state to design around.
 *
 * WHY `value` IS `unknown`. Imported NES records store `image` as a plain
 * string, an ImageObject, or an array of either. This field can only author the
 * ImageObject form, so it treats anything else as opaque: it previews whatever
 * url it can resolve and passes the ORIGINAL value straight back until the
 * editor uploads or removes. An editor opening a record with three pictures and
 * saving an unrelated field must not silently lose two of them.
 */
export default function EntityImageField({
  value,
  onChange,
  onUploadingChange,
  disabled = false,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resolve the preview with the same helper the public profile uses, so the
  // two agree on which url a given `image` value means.
  //
  // Scoped to `image` deliberately: the helper also falls back to `logo`, but
  // this field neither owns nor writes that key, and previewing a logo here
  // would invite an editor to "Replace" it and instead get a NEW `image` that
  // silently outranks a logo still sitting in the document. The cost is that a
  // logo-only record reads as "No picture" here while the profile shows its
  // logo — the honest reading of a field that only speaks for `image`.
  const previewUrl = entityImageUrl({ [ENTITY_IMAGE_KEY]: value });

  // One setter for both the local spinner and the parent's save gate, so the
  // two can never disagree about whether an upload is still in flight.
  const setPending = (pending: boolean) => {
    setUploading(pending);
    onUploadingChange?.(pending);
  };

  // Clearing the input is what lets the SAME path be picked again — a file
  // input emits no change event when its value is unchanged. Every exit from
  // `pick` has to do it, not just the success path: an editor who is told the
  // file is too large, shrinks it in place and re-picks it would otherwise get
  // no event at all, and sit looking at a message that is no longer true.
  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("Image exceeds the 10MB limit.");
      clearInput();
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await uploadCaseImage(file);
      // Store the CARD ladder rather than the hero one: both are generated
      // eagerly, and the card ladder tops out at 1200w against the hero's
      // 1600w. `src` is that ladder's LARGEST rendition and `width`/`height`
      // describe that same rendition, which is why they are read as a pair —
      // taking a smaller url out of `srcset` would leave the stored dimensions
      // describing a different file.
      //
      // It is bigger than any consumer needs today (EntityAvatar renders at
      // 128px at most), but `image` is a single-url schema.org property with
      // nowhere to put a srcset, so the choice is one url for every consumer.
      // The oversize-for-an-avatar tradeoff is noted rather than hidden.
      const r = result.thumbnail;
      onChange(entityImageObject(r.src, r.width, r.height));
      toast({ title: "Picture uploaded", description: file.name });
    } catch (err) {
      setError(adminErrorMessage(err, "Upload failed"));
    } finally {
      setPending(false);
      clearInput();
    }
  };

  return (
    // A group rather than a labelled field: the real control is a pair of
    // buttons over a hidden file input, so there is no single element for the
    // Label to point `htmlFor` at.
    <div className="space-y-2" role="group" aria-labelledby="entity-image-label">
      <Label id="entity-image-label">Picture</Label>
      {/* Names only the surfaces that actually pass a `src` to EntityAvatar:
          the entity profile (EntityRecordProfile) and the entity cards on a
          case page. The search result card mounts EntityAvatar with no `src`
          at all, so it always shows the kind glyph — promising a picture there
          would be untrue until that card is given one. */}
      <p className="text-xs text-muted-foreground">
        Shown on the entity's public profile and beside its name on case pages.
        PNG, JPEG, WebP or GIF, up to 10MB.
      </p>

      <div className="flex items-center gap-3">
        {/* Circular, because that is how every consumer crops it
            (EntityAvatar) — a square preview would promise a framing the
            profile does not use. */}
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border bg-muted">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover"
              data-testid="entity-image-preview"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-center text-[10px] leading-tight text-muted-foreground">
              No picture
            </div>
          )}
        </div>

        {/* Disabled in the same conditions as the button that opens it. The
            button is the only thing that can reach a display:none input, so
            this is defence in depth rather than a live path — but it means the
            "one upload at a time" guarantee is enforced by the control itself
            instead of resting on nothing else calling click(). */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          disabled={uploading || disabled}
          onChange={(e) => pick(e.target.files?.[0])}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || disabled}
            onClick={() => inputRef.current?.click()}
            className="gap-2"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {previewUrl ? "Replace picture" : "Upload picture"}
          </Button>

          {/* `value !== undefined` alone, NOT also `!== null`: a document
              storing `image: null` has a useless key and no preview, and since
              `image` is withheld from the raw JSON box this button is the only
              thing that can drop it. */}
          {value !== undefined && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading || disabled}
              // undefined, not null: the edit form diffs the document by key,
              // so dropping the key is what produces `remove /image` rather
              // than a `replace` that writes a null the readers can't use.
              onClick={() => onChange(undefined)}
              className="gap-2 text-muted-foreground"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove picture
            </Button>
          )}
        </div>
      </div>

      {/* An `image` this field cannot author is left exactly as stored; say so,
          rather than letting a Replace look like it edited one of several.
          Only for a genuine plural — a one-element array is authored the same
          way a bare object is, so claiming "several" would be false. */}
      {Array.isArray(value) && value.length > 1 && (
        <p className="text-xs text-muted-foreground">
          This record stores {value.length} pictures and only the first is shown.
          Replacing or removing here acts on all of them; editing one requires
          the API, since this field authors a single picture.
        </p>
      )}

      <FieldError message={error ?? false} />
    </div>
  );
}
