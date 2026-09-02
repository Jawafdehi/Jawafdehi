import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Trash2, Upload } from "lucide-react";
import { uploadCaseImage, adminErrorMessage } from "@/services/admin-api";
import { FieldError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import type { CaseImage } from "@/types/jds";

// The backend's own cap (WAGTAILIMAGES_MAX_UPLOAD_SIZE). Checked here too so an
// oversize file is refused before it is streamed, rather than after.
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// What the file picker offers. The backend re-derives the real format from the
// bytes and rejects a mismatch, so this is a convenience, not the gate.
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/** Which of the two case-image slots this control fills.
 *
 * Drives both the preview box's shape and which of the two ladders the upload
 * returns is previewed, so the caseworker sees roughly what the public page
 * will crop to rather than a generic square.
 */
type Variant = "card" | "hero";

const VARIANTS: Record<Variant, { aspect: string; ladder: "thumbnail" | "banner" }> = {
  // The card box is a shallow landscape crop; the hero spans the full width.
  card: { aspect: "aspect-[16/10]", ladder: "thumbnail" },
  hero: { aspect: "aspect-[21/9]", ladder: "banner" },
};

interface Props {
  variant: Variant;
  /** Field label, e.g. "Card image". */
  label: string;
  /** One line explaining where this image appears. */
  help: string;
  /** Current selection: the id written to the case, and its preview payload. */
  imageId: number | null;
  preview: CaseImage | null;
  /** Called with the new id (or null when cleared) and its preview. */
  onChange: (imageId: number | null, preview: CaseImage | null) => void;
  testId?: string;
}

/** Upload-and-preview control for one case image.
 *
 * Uploads immediately on pick rather than deferring to form submit. The upload
 * only adds to the shared image library — it does not touch the case — so doing
 * it eagerly costs nothing if the caseworker then abandons the form, and it
 * means the preview shows the REAL rendition the public page will serve rather
 * than a local object URL that might differ.
 */
export default function CaseImageField({
  variant,
  label,
  help,
  imageId,
  preview,
  onChange,
  testId,
}: Props) {
  const { t } = useTranslation();
  const { aspect, ladder } = VARIANTS[variant];
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError(t("admin.caseForm.imageTooLarge"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const result = await uploadCaseImage(file);
      // The upload returns both ladders; preview with the one this slot renders.
      onChange(result.id, result[ladder]);
      toast({ title: t("admin.caseForm.imageUploaded"), description: file.name });
    } catch (err) {
      setError(adminErrorMessage(err, t("admin.caseForm.imageUploadFailed")));
    } finally {
      setUploading(false);
      // Reset the input so re-picking the SAME file fires onChange again (a
      // file input does not emit when the value is unchanged).
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{help}</p>

      <div
        className={`relative overflow-hidden rounded-md border bg-muted/40 ${aspect}`}
      >
        {preview ? (
          <img
            src={preview.src}
            srcSet={preview.srcset}
            sizes="(min-width: 640px) 50vw, 100vw"
            alt={preview.alt || label}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            {t("admin.caseForm.imageNone")}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          {preview
            ? t("admin.caseForm.imageReplace")
            : t("admin.caseForm.imageUpload")}
        </Button>

        {imageId !== null && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={() => onChange(null, null)}
            className="gap-2 text-muted-foreground"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t("admin.caseForm.imageClear")}
          </Button>
        )}

        {preview && (
          <span className="text-xs text-muted-foreground">
            {preview.width}&times;{preview.height}
          </span>
        )}
      </div>

      <FieldError message={error ?? false} />
    </div>
  );
}
