import { useState } from "react";
import { uploadMaterialFile, adminErrorMessage } from "@/services/admin-api";
import { MATERIAL_TYPES } from "@/lib/datalake-forms";
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

interface Props {
  source: string;
  ident: string;
  // Passed on create-time uploads so the backend can derive the @type; omit on
  // uploads to an existing material.
  showMaterialType?: boolean;
  onUploaded?: (result: unknown) => void;
}

// Backend upload cap (see test plan M9). Rejected client-side so an oversize
// file isn't streamed only to 413/timeout at the gateway.
const MAX_FILE_BYTES = 100 * 1024 * 1024;

// F8 — material file upload control. Multipart POST to
// /api/materials/{source}/{ident}/file with { file, role, material_type? }.
export default function MaterialFileUpload({
  source,
  ident,
  showMaterialType = false,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState<string>("RAW");
  const [materialType, setMaterialType] = useState<string>("document");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped after a successful upload to remount the uncontrolled <input
  // type="file"> so its displayed filename clears with the state.
  const [inputKey, setInputKey] = useState(0);

  const upload = async () => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("File exceeds the 100MB limit.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await uploadMaterialFile(
        source,
        ident,
        file,
        role,
        showMaterialType ? materialType : undefined,
      );
      toast({ title: "File uploaded", description: file.name });
      setFile(null);
      setInputKey((k) => k + 1);
      onUploaded?.(res);
    } catch (err) {
      setError(adminErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border bg-white p-4">
      <Label className="text-sm font-semibold">Attach a file</Label>
      <p className="text-xs text-muted-foreground">
        Uploads to this material (≤100MB). Pick a link role for the stored file.
      </p>

      <input
        key={inputKey}
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
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
        {showMaterialType && (
          <div className="space-y-1">
            <Label className="text-xs">Material type</Label>
            <Select value={materialType} onValueChange={setMaterialType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPES.map((t) => (
                  <SelectItem key={t.token} value={t.token}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <FieldError message={error} />

      <Button type="button" onClick={upload} disabled={!file || uploading}>
        {uploading ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-1 h-4 w-4" />
        )}
        Upload file
      </Button>
    </div>
  );
}
