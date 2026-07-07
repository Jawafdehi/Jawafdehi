import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getEntity,
  patchEntity,
  getEntityVersions,
  deleteEntity,
  adminErrorMessage,
  type EntityRecord,
} from "@/services/admin-api";
import { diffToPatchOps } from "@/lib/entity-jsonld";
import DeleteButton from "@/components/admin/DeleteButton";
import { FormError, FieldError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save } from "lucide-react";

// Identity / provenance keys the editor never lets you change (they map to the
// backend's blocked patch paths). Shown read-only; excluded from the editable
// "extra properties" JSON.
const READONLY_KEYS = new Set(["@id", "@type", "@context", "jawafdehi:version"]);

function nameField(name: EntityRecord["name"], lang: "en" | "ne"): string {
  if (!name) return "";
  if (typeof name === "string") return lang === "en" ? name : "";
  return name[lang] ?? "";
}

export default function EntityEdit() {
  // The ref is the IRI tail (prefix/slug), possibly multi-segment, captured by a
  // splat route. useParams gives us the "*" param.
  const params = useParams();
  const ref = params["*"] ?? "";
  const navigate = useNavigate();

  const [doc, setDoc] = useState<EntityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameEn, setNameEn] = useState("");
  const [nameNe, setNameNe] = useState("");
  const [extraJson, setExtraJson] = useState("");
  const [changeDescription, setChangeDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [versionCount, setVersionCount] = useState<number | null>(null);

  // Split a loaded doc into the edited fields. `name` is lifted into the two
  // inputs; everything except the read-only identity keys and name becomes the
  // editable extra-properties JSON.
  const hydrate = useCallback((d: EntityRecord) => {
    setNameEn(nameField(d.name, "en"));
    setNameNe(nameField(d.name, "ne"));
    const extra: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(d)) {
      if (READONLY_KEYS.has(k) || k === "name") continue;
      extra[k] = v;
    }
    setExtraJson(Object.keys(extra).length ? JSON.stringify(extra, null, 2) : "");
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getEntity(ref)
      .then((d) => {
        if (!alive) return;
        setDoc(d);
        hydrate(d);
      })
      .catch((err) => {
        if (alive) setError(adminErrorMessage(err, "Failed to load entity"));
      })
      .finally(() => alive && setLoading(false));
    getEntityVersions(ref)
      .then((v) => alive && setVersionCount(v.total))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ref, hydrate]);

  // The candidate "after" document: read-only identity keys preserved, name
  // rebuilt from the inputs, extra props merged from the JSON box.
  const { after, extraError } = useMemo(() => {
    if (!doc) return { after: null, extraError: null as string | null };
    let parsedExtra: Record<string, unknown> = {};
    let err: string | null = null;
    if (extraJson.trim()) {
      try {
        const parsed = JSON.parse(extraJson);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          parsedExtra = parsed as Record<string, unknown>;
        } else {
          err = "Extra properties must be a JSON object.";
        }
      } catch {
        err = "Extra properties must be valid JSON.";
      }
    }
    // Guard: the JSON box must not smuggle in read-only keys.
    for (const k of Object.keys(parsedExtra)) {
      if (READONLY_KEYS.has(k) || k === "name") {
        err = `"${k}" is managed separately and can't be set here.`;
      }
    }

    const name: Record<string, string> = {};
    if (nameEn.trim()) name.en = nameEn.trim();
    if (nameNe.trim()) name.ne = nameNe.trim();

    const next: Record<string, unknown> = {};
    // Preserve the identity keys exactly as loaded.
    for (const k of READONLY_KEYS) if (k in doc) next[k] = doc[k];
    next.name = name;
    Object.assign(next, parsedExtra);
    return { after: next, extraError: err };
  }, [doc, nameEn, nameNe, extraJson]);

  const patchOps = useMemo(() => {
    if (!doc || !after || extraError) return [];
    return diffToPatchOps(doc as Record<string, unknown>, after);
  }, [doc, after, extraError]);

  const nameValid = nameEn.trim() !== "" || nameNe.trim() !== "";
  const canSave =
    !saving && !extraError && nameValid && patchOps.length > 0;

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await patchEntity(
        ref,
        patchOps,
        changeDescription.trim() || "Updated via admin panel",
      );
      setDoc(updated);
      hydrate(updated);
      setChangeDescription("");
      toast({ title: "Entity updated", description: updated["@id"] });
      getEntityVersions(ref)
        .then((v) => setVersionCount(v.total))
        .catch(() => {});
    } catch (err) {
      setError(adminErrorMessage(err, "Failed to update entity"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !doc) {
    return (
      <div className="max-w-2xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/entities")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Entities
        </Button>
        <FormError message={error} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2"
          onClick={() => navigate("/admin/entities")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Entities
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Edit entity</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">
            {Array.isArray(doc?.["@type"])
              ? (doc?.["@type"] as string[]).join(", ")
              : String(doc?.["@type"] ?? "")}
          </Badge>
          <code className="text-xs">{doc?.["@id"]}</code>
          {versionCount != null && <span>· {versionCount} versions</span>}
        </div>
      </div>

      <FormError message={error} />

      <form onSubmit={onSave} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="name-en">Name (English)</Label>
            <Input id="name-en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="name-ne">Name (Nepali)</Label>
            <Input id="name-ne" value={nameNe} onChange={(e) => setNameNe(e.target.value)} />
          </div>
        </div>
        <FieldError
          message={
            !nameValid && "At least one of English / Nepali name is required."
          }
          className="-mt-3"
        />

        <div className="space-y-1">
          <Label htmlFor="extra">
            Properties (JSON) — identity fields (<code>@id</code>,{" "}
            <code>@type</code>) are immutable
          </Label>
          <Textarea
            id="extra"
            value={extraJson}
            onChange={(e) => setExtraJson(e.target.value)}
            rows={14}
            className="font-mono text-xs"
          />
          <FieldError message={extraError} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="change">Change description</Label>
          <Input
            id="change"
            value={changeDescription}
            onChange={(e) => setChangeDescription(e.target.value)}
            placeholder="Updated via admin panel"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!canSave}>
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Save changes
          </Button>
          <span className="text-xs text-muted-foreground">
            {patchOps.length === 0
              ? "No changes"
              : `${patchOps.length} change${patchOps.length === 1 ? "" : "s"} pending`}
          </span>
          <div className="ml-auto">
            <DeleteButton
              resourceLabel="entity"
              onDelete={() => deleteEntity(ref)}
              onDeleted={() => navigate("/admin/entities")}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
