import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createMaterial,
  replaceMaterial,
  getMaterialByPath,
  deleteMaterial,
  adminErrorMessage,
} from "@/services/admin-api";
import {
  MATERIAL_TYPES,
  isValidMaterialIri,
  parseMaterialIri,
} from "@/lib/datalake-forms";
import DeleteButton from "@/components/admin/DeleteButton";
import MaterialFileUpload from "@/components/admin/datalake/MaterialFileUpload";
import FormPageShell from "@/components/admin/FormPageShell";
import AdminFormActions from "@/components/admin/AdminFormActions";
import { FieldError } from "@/components/admin/FormError";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

// A starter JSON-LD skeleton for a new material. @id is the canonical material
// IRI (the upsert key); name is required by the backend validator.
const TEMPLATE = `{
  "@context": "https://schema.org",
  "@id": "https://jawafdehi.org/material/report/example-2082",
  "@type": "Report",
  "name": {"en": "Example report", "ne": "उदाहरण प्रतिवेदन"}
}`;

// Create or edit a data-lake material (a schema.org JSON-LD document). In create mode
// the backend upserts by @id and derives the schema.org @type from
// material_type. In edit mode (routed on the IRI's <source>/<ident> via a splat)
// the existing doc is loaded and PUT-replaced; @id is locked.
export default function MaterialForm() {
  const navigate = useNavigate();
  // The "*" splat param is the material IRI tail (source/ident) in edit mode.
  const params = useParams();
  const refPath = params["*"] ?? "";
  const editing = refPath !== "";

  const [materialType, setMaterialType] = useState<string>("document");
  const [jsonText, setJsonText] = useState(editing ? "" : TEMPLATE);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the existing material in edit mode. The splat is source/ident; source
  // may be multi-segment, so split on the LAST slash for the API call.
  useEffect(() => {
    if (!editing) return;
    let alive = true;
    const lastSlash = refPath.lastIndexOf("/");
    if (lastSlash <= 0) {
      setError("Invalid material reference.");
      setLoading(false);
      return;
    }
    const source = refPath.slice(0, lastSlash);
    const ident = refPath.slice(lastSlash + 1);
    setLoading(true);
    getMaterialByPath<Record<string, unknown>>(source, ident)
      .then((doc) => {
        if (!alive) return;
        setJsonText(JSON.stringify(doc, null, 2));
      })
      .catch((err) => {
        if (alive) setError(adminErrorMessage(err, "Failed to load material"));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [editing, refPath]);

  let parsed: Record<string, unknown> | null = null;
  let parseError: string | null = null;
  try {
    const p = JSON.parse(jsonText);
    if (p && typeof p === "object" && !Array.isArray(p)) {
      parsed = p as Record<string, unknown>;
    } else {
      parseError = "Material must be a JSON object.";
    }
  } catch {
    parseError = "Invalid JSON.";
  }

  const iri = typeof parsed?.["@id"] === "string" ? (parsed["@id"] as string) : "";
  const iriValid = iri !== "" && isValidMaterialIri(iri);
  const canSave = !saving && !loading && !parseError && iriValid;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !parsed) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        // Replace at the material's own IRI path (parsed from its @id, so a
        // PUT to the canonical location even if the route ref differs).
        const parts = parseMaterialIri(iri);
        if (!parts) throw new Error("Material @id is not a valid IRI.");
        await replaceMaterial(parts.source, parts.ident, parsed);
        toast({ title: "Material updated", description: iri });
      } else {
        const created = await createMaterial(parsed, materialType);
        toast({
          title: "Material saved",
          description: (created as Record<string, unknown>)["@id"] as string,
        });
      }
      navigate("/admin/datalake/materials");
    } catch (err) {
      setError(adminErrorMessage(err, "Failed to save material"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPageShell
      title={editing ? "Edit Material" : "New Material"}
      backLabel="Materials"
      onBack={() => navigate("/admin/datalake/materials")}
      error={error}
      loading={loading}
      subtitle={
        <>
          A schema.org JSON-LD document keyed by its <code>@id</code> IRI.{" "}
          {editing
            ? "Saving replaces the stored document."
            : "Saving upserts by @id."}
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {/* material_type only drives the create upsert's @type derivation; a
            PUT replace stores the @type in the doc verbatim, so hide it then. */}
        {!editing && (
          <div className="space-y-1">
            <Label>Material type</Label>
            <Select value={materialType} onValueChange={setMaterialType}>
              <SelectTrigger className="max-w-sm">
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

        <div className="space-y-1">
          <Label htmlFor="jsonld">JSON-LD document</Label>
          <Textarea
            id="jsonld"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={16}
            className="font-mono text-xs"
          />
          {parseError ? (
            <FieldError message={parseError} />
          ) : iri !== "" && !iriValid ? (
            <p className="text-xs text-red-600">
              <code>@id</code> must be a valid material IRI
              (https://&lt;base&gt;/material/&lt;source&gt;/&lt;ident&gt;).
            </p>
          ) : iri === "" ? (
            <p className="text-xs text-red-600">
              The document needs an <code>@id</code> material IRI.
            </p>
          ) : null}
        </div>

        <AdminFormActions
          saving={saving}
          canSave={canSave}
          submitLabel="Save material"
          onCancel={() => navigate("/admin/datalake/materials")}
          deleteSlot={
            editing ? (
              <DeleteButton
                resourceLabel="material"
                onDelete={() => {
                  // Delete keys on the route ref (source/ident) that loaded the
                  // doc — the same components the PUT/DELETE routes expect.
                  const lastSlash = refPath.lastIndexOf("/");
                  return deleteMaterial(
                    refPath.slice(0, lastSlash),
                    refPath.slice(lastSlash + 1),
                  );
                }}
                onDeleted={() => navigate("/admin/datalake/materials")}
              />
            ) : undefined
          }
        />
      </form>

      {/* F8 — file upload. Only in edit mode (the material must exist so its
          {source}/{ident} path is known). Prefer the components parsed from the
          doc's @id (canonical location); fall back to the route ref. Refresh the
          doc after upload so the new contentUrl/associatedMedia shows. */}
      {editing &&
        (() => {
          const parts = iri ? parseMaterialIri(iri) : null;
          const lastSlash = refPath.lastIndexOf("/");
          // Fall back to splitting refPath ONLY when it actually contains a
          // slash — otherwise slice(0, -1) would silently truncate and ident
          // would be the whole (wrong) string, passing the non-empty guard.
          const fallback =
            lastSlash > 0
              ? { source: refPath.slice(0, lastSlash), ident: refPath.slice(lastSlash + 1) }
              : { source: "", ident: "" };
          const source = parts?.source ?? fallback.source;
          const ident = parts?.ident ?? fallback.ident;
          if (!source || !ident) return null;
          return (
            <MaterialFileUpload
              source={source}
              ident={ident}
              onUploaded={(res) => {
                if (res && typeof res === "object") {
                  setJsonText(JSON.stringify(res, null, 2));
                }
              }}
            />
          );
        })()}
    </FormPageShell>
  );
}
