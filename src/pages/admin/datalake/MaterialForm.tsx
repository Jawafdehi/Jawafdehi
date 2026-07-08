import { useEffect, useState } from "react";
import { useMatch, useNavigate } from "react-router-dom";
import {
  createMaterial,
  replaceMaterial,
  getMaterialByPath,
  deleteMaterial,
  adminErrorMessage,
} from "@/services/admin-api";
import {
  MATERIAL_TYPES,
  MATERIAL_SOURCE_TYPES,
  MATERIAL_LINK_ROLES,
  isValidMaterialIri,
  parseMaterialIri,
} from "@/lib/datalake-forms";
import DeleteButton from "@/components/admin/DeleteButton";
import MaterialFileUpload from "@/components/admin/datalake/MaterialFileUpload";
import FormPageShell from "@/components/admin/FormPageShell";
import AdminFormActions from "@/components/admin/AdminFormActions";
import { FieldError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Trash2 } from "lucide-react";

type Doc = Record<string, unknown>;

// A fresh JSON-LD skeleton for a new material. @id is the canonical material
// IRI (the upsert key); name is required by the backend validator.
const NEW_DOC: Doc = {
  "@context": "https://schema.org",
  "@id": "",
  "@type": "DigitalDocument",
  name: {},
};

// --- Bilingual {en?, ne?} language-map helpers -------------------------------
// name/description are language maps in stored docs, but legacy docs may hold a
// plain string (treated as the Nepali value, matching the backend's tagging of
// untagged Devanagari titles).
function langValue(v: unknown, lang: "en" | "ne"): string {
  if (typeof v === "string") return lang === "ne" ? v : "";
  if (v && typeof v === "object") {
    const s = (v as Record<string, unknown>)[lang];
    return typeof s === "string" ? s : "";
  }
  return "";
}

function withLangValue(v: unknown, lang: "en" | "ne", s: string): unknown {
  const map: Record<string, string> = {};
  for (const l of ["en", "ne"] as const) {
    const existing = langValue(v, l);
    if (existing) map[l] = existing;
  }
  if (s.trim()) map[lang] = s;
  else delete map[lang];
  return Object.keys(map).length > 0 ? map : undefined;
}

// --- associatedMedia (roled links) helpers -----------------------------------
interface MediaRow {
  contentUrl: string;
  role: string;
  // The original entry, so unknown fields (encodingFormat, names…) survive a
  // round-trip through the row editor.
  original: Doc | null;
}

function mediaRows(doc: Doc): MediaRow[] {
  // JSON-LD allows a single object where a list is expected; normalize so a
  // lone media entry is editable instead of being invisible (and then dropped
  // by the next save).
  const raw = doc.associatedMedia;
  const media = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
  return media.map((entry) => {
    const e = (entry && typeof entry === "object" ? entry : {}) as Doc;
    const url =
      typeof e.contentUrl === "string"
        ? e.contentUrl
        : typeof e.url === "string"
          ? e.url
          : "";
    const role =
      typeof e["jawafdehi:linkRole"] === "string"
        ? (e["jawafdehi:linkRole"] as string)
        : "RAW";
    return { contentUrl: url, role, original: e };
  });
}

function mediaEntry(row: MediaRow): Doc {
  return {
    "@type": "MediaObject",
    ...(row.original ?? {}),
    contentUrl: row.contentUrl,
    "jawafdehi:linkRole": row.role,
  };
}

// Create or edit a data-lake material (a schema.org JSON-LD document) through
// field editors bound to the doc's well-known keys; unknown keys ride along
// untouched, and a collapsible raw JSON-LD editor remains for the long tail.
// In create mode the backend upserts by @id and derives the schema.org @type
// from material_type. In edit mode (routed on the IRI's <source>/<ident> via a
// splat) the existing doc is loaded and PUT-replaced; @id is locked.
export default function MaterialForm() {
  const navigate = useNavigate();
  // The edit route's "*" splat is the material IRI tail (source/ident). Match
  // it explicitly rather than reading useParams()["*"]: this form also serves
  // the /new route, where the "*" of the ANCESTOR /admin/* route leaks through
  // the merged params and would put the create form into edit mode.
  const editMatch = useMatch("/admin/datalake/materials/edit/*");
  const refPath = editMatch?.params["*"] ?? "";
  const editing = refPath !== "";

  const [materialType, setMaterialType] = useState<string>("document");
  const [doc, setDoc] = useState<Doc>(NEW_DOC);
  // Raw JSON-LD editor state. Text is regenerated from `doc` after field
  // edits; typing in the raw editor parses back into `doc` when valid.
  const [rawText, setRawText] = useState(() => JSON.stringify(NEW_DOC, null, 2));
  const [rawError, setRawError] = useState<string | null>(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyDoc = (next: Doc) => {
    setDoc(next);
    setRawText(JSON.stringify(next, null, 2));
    setRawError(null);
  };

  const patchDoc = (patch: Doc) => {
    const next: Doc = { ...doc };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) delete next[k];
      else next[k] = v;
    }
    applyDoc(next);
  };

  const onRawChange = (text: string) => {
    setRawText(text);
    try {
      const p = JSON.parse(text);
      if (p && typeof p === "object" && !Array.isArray(p)) {
        setDoc(p as Doc);
        setRawError(null);
      } else {
        setRawError("Material must be a JSON object.");
      }
    } catch {
      setRawError("Invalid JSON.");
    }
  };

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
    getMaterialByPath<Doc>(source, ident)
      .then((loaded) => {
        if (!alive) return;
        applyDoc(loaded);
      })
      .catch((err) => {
        if (alive) setError(adminErrorMessage(err, "Failed to load material"));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [editing, refPath]);

  const iri = typeof doc["@id"] === "string" ? (doc["@id"] as string) : "";
  const iriValid = iri !== "" && isValidMaterialIri(iri);
  const nameNe = langValue(doc.name, "ne");
  const nameEn = langValue(doc.name, "en");
  const hasName = nameNe.trim() !== "" || nameEn.trim() !== "";
  const sourceType =
    typeof doc["jawafdehi:sourceType"] === "string"
      ? (doc["jawafdehi:sourceType"] as string)
      : "";
  const rows = mediaRows(doc);
  const canSave = !saving && !loading && !rawError && iriValid && hasName;

  const setMediaRows = (next: MediaRow[]) =>
    patchDoc({
      associatedMedia: next.length > 0 ? next.map(mediaEntry) : undefined,
    });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        // Replace at the material's own IRI path (parsed from its @id, so a
        // PUT to the canonical location even if the route ref differs).
        const parts = parseMaterialIri(iri);
        if (!parts) throw new Error("Material @id is not a valid IRI.");
        await replaceMaterial(parts.source, parts.ident, doc);
        toast({ title: "Material updated", description: iri });
      } else {
        const created = await createMaterial(doc, materialType);
        toast({
          title: "Material saved",
          description: (created as Doc)["@id"] as string,
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
      maxWidthClassName="max-w-3xl"
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
        {/* @id: the upsert key on create; locked once the doc exists. */}
        <div className="space-y-1">
          <Label htmlFor="material-iri">Material IRI (@id)</Label>
          <Input
            id="material-iri"
            value={iri}
            onChange={(e) => patchDoc({ "@id": e.target.value })}
            disabled={editing}
            className="font-mono text-xs"
            placeholder="https://jawafdehi.org/material/<source>/<ident>"
          />
          <FieldError
            message={
              iri !== "" &&
              !iriValid &&
              "Must be a material IRI (https://<base>/material/<source>/<ident>)."
            }
          />
        </div>

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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="name-ne">Name (नेपाली)</Label>
            <Input
              id="name-ne"
              value={nameNe}
              onChange={(e) =>
                patchDoc({ name: withLangValue(doc.name, "ne", e.target.value) })
              }
              placeholder="सामग्रीको शीर्षक"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="name-en">Name (English)</Label>
            <Input
              id="name-en"
              value={nameEn}
              onChange={(e) =>
                patchDoc({ name: withLangValue(doc.name, "en", e.target.value) })
              }
              placeholder="Material title"
            />
          </div>
        </div>
        <FieldError message={!hasName && "A name in at least one language is required."} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="desc-ne">Description (नेपाली)</Label>
            <Textarea
              id="desc-ne"
              value={langValue(doc.description, "ne")}
              onChange={(e) =>
                patchDoc({
                  description: withLangValue(doc.description, "ne", e.target.value),
                })
              }
              rows={3}
              placeholder="सामग्रीको विवरण (नेपालीमा)"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="desc-en">Description (English)</Label>
            <Textarea
              id="desc-en"
              value={langValue(doc.description, "en")}
              onChange={(e) =>
                patchDoc({
                  description: withLangValue(doc.description, "en", e.target.value),
                })
              }
              rows={3}
              placeholder="Material description (in English)"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Source type</Label>
            <Select
              value={sourceType || undefined}
              onValueChange={(v) => patchDoc({ "jawafdehi:sourceType": v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a source type" />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_SOURCE_TYPES.map((t) => (
                  <SelectItem key={t.token} value={t.token}>
                    {t.label}
                  </SelectItem>
                ))}
                {/* A doc may carry a value outside the known vocabulary; keep it
                    selectable so opening the form doesn't force a change. */}
                {sourceType &&
                  !MATERIAL_SOURCE_TYPES.some((t) => t.token === sourceType) && (
                    <SelectItem value={sourceType}>{sourceType}</SelectItem>
                  )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="date-published">Date published (YYYY-MM-DD)</Label>
            <Input
              id="date-published"
              value={typeof doc.datePublished === "string" ? doc.datePublished : ""}
              onChange={(e) =>
                patchDoc({ datePublished: e.target.value.trim() || undefined })
              }
              placeholder="2026-01-30"
            />
          </div>
        </div>

        {/* Roled links (associatedMedia). Unknown per-entry fields survive the
            row editor; file uploads below append entries server-side. */}
        <div className="space-y-2 rounded-md border bg-white p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Links</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setMediaRows([...rows, { contentUrl: "", role: "RAW", original: null }])
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Add link
            </Button>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No links yet.</p>
          ) : (
            rows.map((row, i) => (
              <div key={i} className="flex items-start gap-2">
                <Input
                  aria-label={`Link ${i + 1} URL`}
                  value={row.contentUrl}
                  onChange={(e) =>
                    setMediaRows(
                      rows.map((r, idx) =>
                        idx === i ? { ...r, contentUrl: e.target.value } : r,
                      ),
                    )
                  }
                  className="font-mono text-xs"
                  placeholder="https://…"
                />
                <Select
                  value={row.role}
                  onValueChange={(v) =>
                    setMediaRows(
                      rows.map((r, idx) => (idx === i ? { ...r, role: v } : r)),
                    )
                  }
                >
                  <SelectTrigger className="w-40 shrink-0" aria-label={`Link ${i + 1} role`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_LINK_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                    {!MATERIAL_LINK_ROLES.includes(
                      row.role as (typeof MATERIAL_LINK_ROLES)[number],
                    ) && <SelectItem value={row.role}>{row.role}</SelectItem>}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setMediaRows(rows.filter((_, idx) => idx !== i))}
                  title="Remove link"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* The full document remains editable for fields the form doesn't
            surface (about, additionalType, jawafdehi:* extensions, …). */}
        <details className="rounded-md border bg-slate-50">
          <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium">
            Advanced: raw JSON-LD
          </summary>
          <div className="space-y-1 p-4 pt-2">
            <Textarea
              id="jsonld"
              value={rawText}
              onChange={(e) => onRawChange(e.target.value)}
              rows={14}
              className="font-mono text-xs"
            />
            <FieldError message={rawError} />
          </div>
        </details>

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
                  applyDoc(res as Doc);
                }
              }}
            />
          );
        })()}
    </FormPageShell>
  );
}
