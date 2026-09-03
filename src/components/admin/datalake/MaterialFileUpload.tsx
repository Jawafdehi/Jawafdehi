import { useState } from "react";
import { uploadMaterialFile, adminErrorMessage } from "@/services/admin-api";
import { FieldError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

// Link-role choices for an uploaded material file (matches DocumentSource
// link-role vocabulary: RAW is the primary/original file).
const FILE_ROLES = ["RAW", "ALTERNATE", "PERMALINK"] as const;

// A file the caseworker has picked but which has not been sent yet — the
// deferred mode's output (see `mode` below).
export interface StagedMaterialFile {
  file: File;
  role: string;
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
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState<string>("RAW");
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
      return;
    }
    setFile(picked);
    if (deferred) onStagedChange?.(picked ? { file: picked, role } : null);
  };

  const changeRole = (next: string) => {
    setRole(next);
    // Keep the staged role in step, or the parent would upload with a stale one.
    if (deferred && file) onStagedChange?.({ file, role: next });
  };

  const upload = async () => {
    if (!file || !source || !ident) return;
    if (tooBig(file)) return;
    setPending(true);
    setError(null);
    try {
      const res = await uploadMaterialFile(source, ident, file, role);
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
    <div className="space-y-3 rounded-md border bg-white p-4">
      <Label className="text-sm font-semibold">Attach a file</Label>
      <p className="text-xs text-muted-foreground">
        {deferred
          ? "Attached when you save this material (≤100MB). Pick a link role for the stored file."
          : "Uploads to this material (≤100MB). Pick a link role for the stored file."}
      </p>

      <input
        key={inputKey}
        type="file"
        aria-label="Material file"
        disabled={uploading || disabled}
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-secondary"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Role</Label>
          <Select
            value={role}
            onValueChange={changeRole}
            disabled={uploading || disabled}
          >
            <SelectTrigger aria-label="Link role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <FieldError message={error} />

      {/* Deferred mode has no button of its own — the form's Save sends the
          file, so a second one here would imply a write that doesn't happen. */}
      {deferred ? (
        file && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">{file.name}</span> will be attached on
            save.
          </p>
        )
      ) : (
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
          Upload file
        </Button>
      )}
    </div>
  );
}
