import { useEffect, useState } from "react";
import { useMatch, useNavigate } from "react-router-dom";
import {
  createMaterial,
  replaceMaterial,
  getMaterialByPath,
  deleteMaterial,
  uploadMaterialFile,
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
import type { StagedMaterialFile } from "@/components/admin/datalake/MaterialFileUpload";
import MaterialVisibilityControl from "@/components/admin/datalake/MaterialVisibilityControl";
import FormPageShell from "@/components/admin/FormPageShell";
import AdminFormActions from "@/components/admin/AdminFormActions";
import { FieldError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Paperclip, Plus, Trash2, Upload } from "lucide-react";

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
  // Create mode: a file picked before the material exists, uploaded by onSubmit
  // once the create has returned an @id. See MaterialFileUpload's `mode` prop.
  const [staged, setStaged] = useState<StagedMaterialFile | null>(null);
  // Edit mode: bytes in flight, so Save can't race an upload (a PUT replaces
  // `data` wholesale and would drop the MediaObject the upload is appending).
  const [uploadPending, setUploadPending] = useState(false);
  // Which composer tab is open in the Links card ("link" | "file"). Switching
  // it never clears a staged file — the staged row stays visible in the list
  // above, so nothing the next Save acts on is hidden.
  const [composer, setComposer] = useState("link");
  // Bumped to remount MaterialFileUpload, so removing the staged row from the
  // list also clears the picker's own filename display.
  const [stagedKey, setStagedKey] = useState(0);

  const clearStaged = () => {
    setStaged(null);
    setStagedKey((k) => k + 1);
  };

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
  const canSave =
    !saving && !loading && !uploadPending && !rawError && iriValid && hasName;
  // Caseworker visibility policy + its derived visibility, surfaced only on an
  // authed read (jawafdehi:visibility[Policy]). Presence gates the out-of-band
  // control below; the values seed it.
  const visibilityPolicy =
    typeof doc["jawafdehi:visibilityPolicy"] === "string"
      ? (doc["jawafdehi:visibilityPolicy"] as string)
      : "";
  const visibility =
    typeof doc["jawafdehi:visibility"] === "string"
      ? (doc["jawafdehi:visibility"] as string)
      : "";

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
        const createdDoc = (created ?? {}) as Doc;
        // Fall back on EMPTINESS, not just type: a response carrying "@id": ""
        // would otherwise defeat the fallback and lose the staged file, even
        // though `iri` is right there and already validated.
        const returnedIri = createdDoc["@id"];
        const createdIri =
          typeof returnedIri === "string" && returnedIri !== "" ? returnedIri : iri;

        // Only now does the material exist, so its {source}/{ident} — the
        // upload route's key — is finally known. The order matters: the create
        // above writes `data` wholesale, so uploading first would have its
        // MediaObject erased by this save. Uploading last lets the endpoint's
        // read-modify-write keep the typed document AND the file.
        if (staged) {
          const parts = parseMaterialIri(createdIri);
          try {
            if (!parts) {
              throw new Error("Saved material's @id is not a valid material IRI.");
            }
            // Always RAW: an upload is the primary document, and the role of
            // the resulting entry stays editable on its row in the Links list.
            await uploadMaterialFile(parts.source, parts.ident, staged.file, "RAW");
            clearStaged();
            // ONE toast describes the whole action. A "Material saved" fired
            // before the upload would contradict the failure toast below.
            toast({
              title: "Material saved",
              description: `${createdIri} — ${staged.file.name} attached`,
            });
          } catch (err) {
            // The material saved and only the attachment failed, so reporting a
            // failed save would be a lie and dropping the file silently would be
            // worse. Send the caseworker to the edit page, where the immediate
            // upload control can retry against the material that now exists.
            // Clear the staging: both routes render this same element, so React
            // Router reconciles them as one instance and a surviving `staged`
            // would be unreachable state that no longer matches any control.
            clearStaged();
            toast({
              title: "Material saved, but the file was not attached",
              description: adminErrorMessage(err, "Upload failed"),
              variant: "destructive",
            });
            navigate(
              parts
                ? `/admin/datalake/materials/edit/${parts.source}/${parts.ident}`
                : "/admin/datalake/materials",
            );
            return;
          }
        } else {
          toast({ title: "Material saved", description: createdIri });
        }
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

        {/* Roled links (associatedMedia): the single list of everything
            attached to this material. A pasted URL and an uploaded file both
            become entries here, so the list stays visible and only the COMPOSER
            below it switches between the two ways of adding one. */}
        <div className="space-y-3 rounded-md border bg-white p-4">
          <Label className="text-sm font-semibold">Links</Label>

          {rows.length === 0 && !staged ? (
            <p className="text-sm text-muted-foreground">No links yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((row, i) => (
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
                    <SelectTrigger
                      className="w-40 shrink-0"
                      aria-label={`Link ${i + 1} role`}
                    >
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
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}

              {/* A staged upload is shown in the SAME list, so a file waiting to
                  be attached is never invisible state the next Save would act on
                  without the caseworker seeing it. */}
              {staged && (
                <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2">
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono text-xs">{staged.file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    attaches on save
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="ml-auto shrink-0"
                    onClick={clearStaged}
                    title="Remove staged file"
                    aria-label="Remove staged file"
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* The composer. Tabs switch how you add an entry; they never hide
              the list above, and an uploaded file lands in that same list. */}
          <Tabs value={composer} onValueChange={setComposer} className="pt-1">
            <TabsList className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0">
              <TabsTrigger
                value="link"
                className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Plus className="mr-1 h-4 w-4" /> Add link
              </TabsTrigger>
              <TabsTrigger
                value="file"
                className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <Upload className="mr-1 h-4 w-4" /> Upload file
              </TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="mt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setMediaRows([
                    ...rows,
                    { contentUrl: "", role: "RAW", original: null },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Add a link row
              </Button>
            </TabsContent>

            <TabsContent value="file" className="mt-3">
              {!editing ? (
                <MaterialFileUpload
                  key={stagedKey}
                  mode="deferred"
                  disabled={saving}
                  onStagedChange={setStaged}
                />
              ) : (
                (() => {
                  // Prefer the components parsed from the doc's @id (the
                  // canonical location); fall back to the route ref. Only split
                  // refPath when it actually contains a slash — slice(0, -1)
                  // would otherwise truncate and make ident the whole string.
                  const parts = iri ? parseMaterialIri(iri) : null;
                  const lastSlash = refPath.lastIndexOf("/");
                  const fallback =
                    lastSlash > 0
                      ? {
                          source: refPath.slice(0, lastSlash),
                          ident: refPath.slice(lastSlash + 1),
                        }
                      : { source: "", ident: "" };
                  const source = parts?.source ?? fallback.source;
                  const ident = parts?.ident ?? fallback.ident;
                  if (!source || !ident) return null;
                  return (
                    <MaterialFileUpload
                      source={source}
                      ident={ident}
                      disabled={saving}
                      onUploadingChange={setUploadPending}
                      onUploaded={(res) => {
                        if (!res || typeof res !== "object") return;
                        // The upload returns the stored document as the WRITE
                        // plane sees it — without the annotations an authed read
                        // adds. Applying it verbatim would blank
                        // jawafdehi:visibilityPolicy and make the visibility
                        // control disappear, so carry those two keys across.
                        const merged = { ...(res as Doc) };
                        for (const k of [
                          "jawafdehi:visibilityPolicy",
                          "jawafdehi:visibility",
                        ]) {
                          if (merged[k] === undefined && doc[k] !== undefined) {
                            merged[k] = doc[k];
                          }
                        }
                        applyDoc(merged);
                      }}
                    />
                  );
                })()
              )}
            </TabsContent>
          </Tabs>
        </div>


        {/* The full document remains editable for fields the form doesn't
            surface (about, additionalType, jawafdehi:* extensions, …). */}
        <details className="rounded-md border bg-muted">
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

      {/* Visibility policy — an out-of-band caseworker control (immediate PATCH,
          NOT part of Save). Edit-mode only, and only once an authed read has
          surfaced jawafdehi:visibilityPolicy. Keyed on the (locked) IRI so it
          reseeds if the loaded material changes. */}
      {editing && visibilityPolicy && (
        <MaterialVisibilityControl
          key={iri}
          iri={iri}
          policy={visibilityPolicy}
          visibility={visibility}
        />
      )}
    </FormPageShell>
  );
}
