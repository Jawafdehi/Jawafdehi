import { useId, useState } from "react";
import { uploadMaterialFile, adminErrorMessage } from "@/services/admin-api";
import { FieldError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";

// An upload is always the primary document: the link-role vocabulary describes
// what kind of URL an entry is (PERMALINK = the source's own canonical page,
// SOURCE_PAGE = the HTML it was scraped from, MARKDOWN = our OCR output), and
// none of those can describe bytes we are storing ourselves. So this control
// asks nobody to classify anything and sends RAW; the role stays editable on
// the resulting row in the Links list if a document really is an ALTERNATE.
const UPLOAD_ROLE = "RAW";

// A file the caseworker has picked but which has not been sent yet — the
// deferred mode's output (see `mode` below).
export interface StagedMaterialFile {
  file: File;
}

interface Props {
  // How this control writes. Two modes, because the upload endpoint is keyed on
  // a material that must already exist:
  //
  //  "immediate" (edit page) — the material is already stored, so its
  //    {source}/{ident} is known and the file is POSTed as soon as the
  //    caseworker clicks Upload, independently of the form's Save.
  //
  //  "deferred" (create page) — there is no material yet, so there is nothing
  //    to attach to. The picked file is only reported upward via
  //    `onStagedChange`; MaterialForm creates the material on Save and *then*
  //    uploads. This ordering is not cosmetic: every non-PATCH material write
  //    replaces the stored `data` JSON-LD wholesale (materials
  //    single_source_ingest.upsert_single_source_material), so uploading first
  //    and saving second would erase the MediaObject the upload just appended.
  //    Upload last and the server's read-modify-write keeps both.
  mode?: "immediate" | "deferred";
  // Required in "immediate" mode; unused in "deferred" (the material does not
  // exist yet, so the caller resolves the path after it creates one).
  source?: string;
  ident?: string;
  disabled?: boolean;
  // "immediate" only: fires with the material JSON-LD the upload returned.
  onUploaded?: (result: unknown) => void;
  // "immediate" only: lets the parent form block Save while bytes are in
  // flight, so a Save cannot race an upload that has not landed yet (mirrors
  // CaseImageField/AdminCaseForm).
  onUploadingChange?: (uploading: boolean) => void;
  // "deferred" only: the currently-staged file, or null when cleared.
  onStagedChange?: (staged: StagedMaterialFile | null) => void;
  // Renders a dismiss button. The parent reveals this panel from the Links
  // card, so it owns closing it (and clearing whatever was staged).
  onDismiss?: () => void;
}

// Backend upload cap (see test plan M9). Rejected client-side so an oversize
// file isn't streamed only to 413/timeout at the gateway.
const MAX_FILE_BYTES = 100 * 1024 * 1024;

// F8 — material file upload control. Multipart POST to
// /api/materials/{source}/{ident}/file with { file, role }. On the create page
// the same block stages the file instead of posting it; see `mode`.
export default function MaterialFileUpload({
  mode = "immediate",
  source,
  ident,
  disabled = false,
  onUploaded,
  onUploadingChange,
  onStagedChange,
  onDismiss,
}: Props) {
  const headingId = useId();
  const fileId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped after a successful upload to remount the uncontrolled <input
  // type="file"> so its displayed filename clears with the state.
  const [inputKey, setInputKey] = useState(0);

  const deferred = mode === "deferred";

  // One setter for both the local spinner and the parent's save gate, so the
  // two can never disagree about whether an upload is still in flight.
  const setPending = (pending: boolean) => {
    setUploading(pending);
    onUploadingChange?.(pending);
  };

  // Oversize is rejected at pick time rather than on submit: in deferred mode
  // there is no Upload button to hang the error off, and staging a file we know
  // the server will refuse would fail the Save instead of the file.
  const tooBig = (f: File) => {
    if (f.size <= MAX_FILE_BYTES) return false;
    setError("File exceeds the 100MB limit.");
    return true;
  };

  const pick = (picked: File | null) => {
    setError(null);
    if (picked && tooBig(picked)) {
      // Don't keep a file the server would reject, and clear any prior staging.
      setFile(null);
      if (deferred) onStagedChange?.(null);
      // Remount the input so it stops displaying the rejected filename AND so
      // re-picking that same path fires a change event again — a file input is
      // silent when its value is unchanged, which would otherwise wedge the
      // control until a different file was chosen.
      setInputKey((k) => k + 1);
      return;
    }
    setFile(picked);
    if (deferred) onStagedChange?.(picked ? { file: picked } : null);
  };

  const upload = async () => {
    // pick() is the only writer of `file` and refuses anything over the cap, so
    // no size re-check is needed here.
    if (!file || !source || !ident) return;
    setPending(true);
    setError(null);
    try {
      const res = await uploadMaterialFile(source, ident, file, UPLOAD_ROLE);
      toast({ title: "File uploaded", description: file.name });
      setFile(null);
      setInputKey((k) => k + 1);
      onUploaded?.(res);
    } catch (err) {
      setError(adminErrorMessage(err, "Upload failed"));
    } finally {
      setPending(false);
    }
  };

  return (
    // A nested panel inside the Links card, not a card of its own: an uploaded
    // file becomes an associatedMedia entry exactly like a pasted URL, so the
    // two entry points are presented as siblings.
    <div
      role="group"
      aria-labelledby={headingId}
      className="space-y-3 rounded-md border bg-muted/40 p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <Label id={headingId} className="text-sm font-semibold">
            Attach a file
          </Label>
          <p className="text-xs text-muted-foreground">
            {deferred
              ? "Attached when you save this material (≤100MB)."
              : "Uploads to this material now (≤100MB)."}
          </p>
        </div>
        {onDismiss && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onDismiss}
            disabled={uploading}
            title="Cancel upload"
            aria-label="Cancel upload"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor={fileId} className="text-xs">
          File
        </Label>
        <input
          id={fileId}
          key={inputKey}
          type="file"
          disabled={uploading || disabled}
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-secondary"
        />
      </div>


      <FieldError message={error} />

      {/* Deferred mode has no button of its own — the form's Save sends the
          file, so a second one here would imply a write that doesn't happen.
          Nor does it echo the filename: the parent lists the staged file as a
          pending row alongside the links, which is where it actually lands. */}
      {deferred ? null : (
        <Button
          type="button"
          onClick={upload}
          disabled={!file || uploading || disabled}
        >
          {uploading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-1 h-4 w-4" />
          )}
          {/* NOT "Upload file": that is the Links-card button which reveals
              this panel, and two same-named buttons on one page are ambiguous
              to screen readers and to anyone scanning it. */}
          Attach file
        </Button>
      )}
    </div>
  );
}
