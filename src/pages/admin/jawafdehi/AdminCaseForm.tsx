import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import {
  getCase,
  createCase,
  patchCase,
  adminErrorMessage,
  type CreateCasePayload,
  type PatchOp,
} from "@/services/admin-api";
import {
  CASE_TYPES,
  RELATIONSHIP_TYPES,
  isValidSlug,
  isValidDateField,
  isValidCourtCaseRef,
  isValidTimelineRow,
  isValidEntityRow,
  slugify,
  replaceOp,
  buildStringListPatch,
  buildEntitiesPatch,
  buildTimelinePatch,
  buildEvidencePatch,
  type EntityRelationshipRow,
  type TimelineEventRow,
  type EvidenceRow,
  type RelationshipType,
} from "@/lib/jawafdehi-forms";
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";
import EntityRelationshipsEditor from "@/components/admin/case/EntityRelationshipsEditor";
import TimelineEditor from "@/components/admin/case/TimelineEditor";
import EvidenceEditor from "@/components/admin/case/EvidenceEditor";
import ChipListEditor from "@/components/admin/case/ChipListEditor";
import CaseStateControl from "@/components/admin/case/CaseStateControl";
import DatePairInput from "@/components/admin/DatePairInput";
import { FormError, FieldError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Save } from "lucide-react";

const str = (v: unknown): string => (v == null ? "" : String(v));

// The mutable editor state. Sub-resource lists (entities/timeline/evidence) are
// edited by the F3/F4/F5 child editors; F6 field editors extend this shape.
interface CaseFormState {
  title: string;
  slug: string;
  case_type: string;
  description: string;
  notes: string;
  key_allegations: string[];
  entities: EntityRelationshipRow[];
  timeline: TimelineEventRow[];
  evidence: EvidenceRow[];
  // F6 first-class field editors.
  bigo: string; // kept as string in the input; sent as number|null
  thumbnail_url: string;
  banner_url: string;
  tags: string[];
  court_cases: string[];
  case_start_date: string; // AD
  case_start_date_bs: string; // BS
  case_end_date: string; // AD
  case_end_date_bs: string; // BS
}

const EMPTY: CaseFormState = {
  title: "",
  slug: "",
  case_type: "CORRUPTION",
  description: "",
  notes: "",
  key_allegations: [],
  entities: [],
  timeline: [],
  evidence: [],
  bigo: "",
  thumbnail_url: "",
  banner_url: "",
  tags: [],
  court_cases: [],
  case_start_date: "",
  case_start_date_bs: "",
  case_end_date: "",
  case_end_date_bs: "",
};

// Coerce a loaded relationship_type into the known enum (default ACCUSED).
function asRelType(v: unknown): RelationshipType {
  const s = str(v).toUpperCase();
  return (RELATIONSHIP_TYPES as readonly string[]).includes(s)
    ? (s as RelationshipType)
    : "ACCUSED";
}

// Parse a loaded case's entities array into editor rows. Tolerates the loose
// read-plane shape (nes_id may live under different keys).
function parseEntities(c: Record<string, unknown>): EntityRelationshipRow[] {
  const list = Array.isArray(c.entities) ? (c.entities as Record<string, unknown>[]) : [];
  return list.map((e) => ({
    nes_id: str(e.nes_id ?? e.entity ?? e["@id"]),
    relationship_type: asRelType(e.relationship_type ?? e.role),
    notes: str(e.notes),
  }));
}

function parseTimeline(c: Record<string, unknown>): TimelineEventRow[] {
  const list = Array.isArray(c.timeline) ? (c.timeline as Record<string, unknown>[]) : [];
  return list.map((t) => ({
    date: str(t.date),
    date_bs: str(t.date_bs),
    title: str(t.title),
    description: str(t.description),
  }));
}

function parseEvidence(c: Record<string, unknown>): EvidenceRow[] {
  const list = Array.isArray(c.evidence) ? (c.evidence as Record<string, unknown>[]) : [];
  return list
    .map((e) => ({
      material_iri: str(e.material_iri ?? e.material ?? e["@id"]),
      additional_details: str(e.additional_details ?? e.notes),
    }))
    .filter((e) => e.material_iri.trim());
}

// Parse a loaded case (loose read-plane shape) into the editor state.
function fromCase(c: Record<string, unknown>): CaseFormState {
  const allegations = Array.isArray(c.key_allegations)
    ? (c.key_allegations as unknown[]).map(str)
    : [];
  const strList = (v: unknown): string[] =>
    Array.isArray(v) ? (v as unknown[]).map(str) : [];
  return {
    title: str(c.title),
    slug: str(c.slug),
    case_type: str(c.case_type) || "CORRUPTION",
    description: str(c.description),
    notes: str(c.notes),
    key_allegations: allegations,
    entities: parseEntities(c),
    timeline: parseTimeline(c),
    evidence: parseEvidence(c),
    bigo: c.bigo == null ? "" : str(c.bigo),
    thumbnail_url: str(c.thumbnail_url),
    banner_url: str(c.banner_url),
    tags: strList(c.tags),
    court_cases: strList(c.court_cases),
    case_start_date: str(c.case_start_date),
    case_start_date_bs: str(c.case_start_date_bs),
    case_end_date: str(c.case_end_date),
    case_end_date_bs: str(c.case_end_date_bs),
  };
}

// Create + edit a Jawafdehi case. Create posts the authoring shape (backend
// forces state=DRAFT, A1); edit diffs the touched scalar/list fields into an
// RFC-6902 patch array (§3). description/notes are Markdown (A4).
export default function AdminCaseForm() {
  const params = useParams();
  const navigate = useNavigate();
  const { isModerator } = useCaseworkAuth();
  const slug = params.slug;
  const editing = Boolean(slug);

  const [form, setForm] = useState<CaseFormState>(EMPTY);
  const [original, setOriginal] = useState<CaseFormState>(EMPTY);
  const [caseState, setCaseState] = useState<string>("DRAFT");
  // Raw multiline text for key allegations (one per line) — parsed to a list.
  const [allegationsText, setAllegationsText] = useState("");
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // In create mode, track whether the user hand-edited the slug so we stop
  // auto-deriving it from the title.
  const [slugDirty, setSlugDirty] = useState(false);

  const set = <K extends keyof CaseFormState>(k: K, v: CaseFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const loadCase = useCallback(async () => {
    if (!editing || !slug) return;
    setLoading(true);
    try {
      const c = await getCase<Record<string, unknown>>(slug);
      const parsed = fromCase(c);
      setForm(parsed);
      setOriginal(parsed);
      setCaseState(str(c.state ?? c.status) || "DRAFT");
      setAllegationsText(parsed.key_allegations.join("\n"));
    } catch (err) {
      setError(adminErrorMessage(err, "Failed to load case"));
    } finally {
      setLoading(false);
    }
  }, [editing, slug]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  // Keep the parsed allegations list in sync with the textarea.
  useEffect(() => {
    const list = allegationsText
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s !== "");
    setForm((f) => ({ ...f, key_allegations: list }));
  }, [allegationsText]);

  const effectiveSlug = editing
    ? form.slug
    : slugDirty
      ? form.slug
      : slugify(form.title);

  const slugValid = effectiveSlug === "" || isValidSlug(effectiveSlug);
  const bigoValid = form.bigo.trim() === "" || Number.isFinite(Number(form.bigo));
  const datesValid =
    isValidDateField(form.case_start_date_bs) &&
    isValidDateField(form.case_end_date_bs);
  // A partially-filled timeline/entity row would serialize into the /timeline or
  // /entities replace and 422 the whole PATCH (title-less timeline row, IRI-less
  // entity row). Block save until every *populated* row is complete, so the user
  // fixes it here instead of losing the whole batch to a server rejection. A
  // fully-blank trailing add-row is fine — it's dropped by the patch builder.
  const timelineRowsValid = form.timeline.every(
    (r) =>
      (r.title.trim() === "" && r.date.trim() === "") || isValidTimelineRow(r),
  );
  const entityRowsValid = form.entities.every(
    (r) => r.nes_id.trim() === "" || isValidEntityRow(r),
  );
  const canSave =
    !saving &&
    form.title.trim() !== "" &&
    form.case_type.trim() !== "" &&
    slugValid &&
    bigoValid &&
    datesValid &&
    timelineRowsValid &&
    entityRowsValid;

  // Build the RFC-6902 patch, emitting an op only for fields that changed.
  // Scalars use replace; sub-resources (entities/timeline/evidence) use a
  // whole-list replace (§3). slug only differs when DRAFT — we send it and let
  // the API be the authority (it 422s a slug change once the case leaves DRAFT).
  const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
  const buildPatch = (): PatchOp[] => {
    const ops: PatchOp[] = [];
    if (form.title !== original.title) ops.push(replaceOp("/title", form.title));
    if (form.slug !== original.slug) ops.push(replaceOp("/slug", form.slug));
    if (form.case_type !== original.case_type)
      ops.push(replaceOp("/case_type", form.case_type));
    if (form.description !== original.description)
      ops.push(replaceOp("/description", form.description));
    if (form.notes !== original.notes) ops.push(replaceOp("/notes", form.notes));
    if (changed(form.key_allegations, original.key_allegations))
      ops.push(buildStringListPatch("/key_allegations", form.key_allegations));
    if (changed(form.entities, original.entities))
      ops.push(buildEntitiesPatch(form.entities));
    if (changed(form.timeline, original.timeline))
      ops.push(buildTimelinePatch(form.timeline));
    if (changed(form.evidence, original.evidence))
      ops.push(buildEvidencePatch(form.evidence));
    // F6 fields.
    if (form.bigo !== original.bigo) {
      const n = form.bigo.trim() === "" ? null : Number(form.bigo);
      ops.push(replaceOp("/bigo", n));
    }
    if (form.thumbnail_url !== original.thumbnail_url)
      ops.push(replaceOp("/thumbnail_url", form.thumbnail_url || null));
    if (form.banner_url !== original.banner_url)
      ops.push(replaceOp("/banner_url", form.banner_url || null));
    if (changed(form.tags, original.tags))
      ops.push(buildStringListPatch("/tags", form.tags));
    if (changed(form.court_cases, original.court_cases))
      ops.push(buildStringListPatch("/court_cases", form.court_cases));
    if (form.case_start_date !== original.case_start_date)
      ops.push(replaceOp("/case_start_date", form.case_start_date || null));
    if (form.case_start_date_bs !== original.case_start_date_bs)
      ops.push(replaceOp("/case_start_date_bs", form.case_start_date_bs || null));
    if (form.case_end_date !== original.case_end_date)
      ops.push(replaceOp("/case_end_date", form.case_end_date || null));
    if (form.case_end_date_bs !== original.case_end_date_bs)
      ops.push(replaceOp("/case_end_date_bs", form.case_end_date_bs || null));
    return ops;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (editing && slug) {
        const ops = buildPatch();
        if (ops.length === 0) {
          toast({ title: "No changes to save" });
          setSaving(false);
          return;
        }
        const updated = await patchCase<Record<string, unknown>>(slug, ops);
        const parsed = fromCase(updated);
        setForm(parsed);
        setOriginal(parsed);
        setCaseState(str(updated.state ?? updated.status) || caseState);
        toast({ title: "Case updated" });
      } else {
        const payload: CreateCasePayload = {
          title: form.title.trim(),
          case_type: form.case_type,
          description: form.description || undefined,
          notes: form.notes || undefined,
          key_allegations: form.key_allegations.length
            ? form.key_allegations
            : undefined,
        };
        if (effectiveSlug) payload.slug = effectiveSlug;
        const created = await createCase<Record<string, unknown>>(payload);
        toast({ title: "Case created (DRAFT)", description: str(created.slug) });
        // Land the user on the new case's edit page so they can add
        // entities/timeline/evidence and submit for review.
        const newSlug = str(created.slug) || effectiveSlug;
        navigate(newSlug ? `/admin/jawafdehi/cases/${newSlug}/edit` : "/admin/jawafdehi/cases");
      }
    } catch (err) {
      setError(adminErrorMessage(err, "Failed to save case"));
    } finally {
      setSaving(false);
    }
  };

  // MDEditor renders per data-color-mode; the admin panel is a light surface.
  const mdColorMode = useMemo(() => "light" as const, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6" data-color-mode={mdColorMode}>
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2"
          onClick={() => navigate("/admin/jawafdehi/cases")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Cases
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {editing ? "Edit Case" : "New Case"}
        </h1>
        {editing && (
          <p className="text-sm text-muted-foreground">
            Editing <span className="font-mono">{form.slug}</span>. New cases are
            created as DRAFT.
          </p>
        )}
      </div>

      <FormError message={error} />

      {/* F2 — state transitions. Edit mode only (a persisted case has a state).
          Privileged targets are gated to admin/moderator in the UI; the API is
          the authority. Transitioning reloads the case to reflect the new state. */}
      {editing && slug && (
        <CaseStateControl
          slug={slug}
          state={caseState}
          isModerator={isModerator}
          onTransitioned={() => loadCase()}
        />
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-1">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Descriptive case title"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugDirty(true);
                set("slug", e.target.value);
              }}
              className="font-mono text-xs"
              placeholder="auto-derived from title"
            />
            <FieldError
              message={!slugValid && "Lowercase alphanumeric, hyphen-separated."}
            />
            {editing && (
              <p className="text-xs text-muted-foreground">
                Slug is immutable once the case leaves DRAFT (API enforces).
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Case type</Label>
            <Select
              value={form.case_type}
              onValueChange={(v) => set("case_type", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Description</Label>
          <p className="text-xs text-muted-foreground">
            Markdown. Publicly rendered on the case page.
          </p>
          <MDEditor
            value={form.description}
            onChange={(v) => set("description", v ?? "")}
            height={280}
            preview="edit"
            textareaProps={{ placeholder: "## Summary\n\nWhat happened…" }}
          />
        </div>

        <div className="space-y-1">
          <Label>Notes (internal)</Label>
          <p className="text-xs text-muted-foreground">
            Markdown. Internal casework notes (not shown publicly).
          </p>
          <MDEditor
            value={form.notes}
            onChange={(v) => set("notes", v ?? "")}
            height={200}
            preview="edit"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="allegations">Key allegations (one per line)</Label>
          <textarea
            id="allegations"
            value={allegationsText}
            onChange={(e) => setAllegationsText(e.target.value)}
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder={"Misappropriation of public funds\nFalsification of records"}
          />
        </div>

        {/* F6 — first-class field editors (replacing raw-JSON entry). */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="bigo">Bigo (embezzlement amount)</Label>
            <Input
              id="bigo"
              type="number"
              value={form.bigo}
              onChange={(e) => set("bigo", e.target.value)}
              placeholder="e.g. 1250000"
            />
            <FieldError message={!bigoValid && "Must be a number."} />
          </div>
          <ChipListEditor
            label="Tags"
            items={form.tags}
            onChange={(items) => set("tags", items)}
            placeholder="Add a tag and press Enter"
            normalize={(v) => v.trim().toLowerCase()}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
            <Input
              id="thumbnail_url"
              value={form.thumbnail_url}
              onChange={(e) => set("thumbnail_url", e.target.value)}
              className="text-xs"
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="banner_url">Banner URL</Label>
            <Input
              id="banner_url"
              value={form.banner_url}
              onChange={(e) => set("banner_url", e.target.value)}
              className="text-xs"
              placeholder="https://…"
            />
          </div>
        </div>

        <ChipListEditor
          label="Court-case references"
          items={form.court_cases}
          onChange={(items) => set("court_cases", items)}
          placeholder="court:case_number (e.g. special:081-CR-0136)"
          help="Link related court cases as <court>:<case_number>."
          validate={isValidCourtCaseRef}
          invalidHint="Use the form <court>:<case_number>."
        />

        <DatePairInput
          label="Case start"
          idBase="case-start"
          adValue={form.case_start_date}
          bsValue={form.case_start_date_bs}
          onAdChange={(v) => set("case_start_date", v)}
          onBsChange={(v) => set("case_start_date_bs", v)}
        />
        <DatePairInput
          label="Case end"
          idBase="case-end"
          adValue={form.case_end_date}
          bsValue={form.case_end_date_bs}
          onAdChange={(v) => set("case_end_date", v)}
          onBsChange={(v) => set("case_end_date_bs", v)}
        />
        <FieldError message={!datesValid && "BS dates must be YYYY-MM-DD."} />

        {/* Sub-resource editors (F3/F4/F5). Shown only in edit mode: a case
            must exist (have a slug) before entities/evidence can be linked. On
            create, the user saves the DRAFT first, then lands on this edit page. */}
        {editing ? (
          <div className="space-y-4">
            <EntityRelationshipsEditor
              rows={form.entities}
              onChange={(rows) => set("entities", rows)}
            />
            <TimelineEditor
              rows={form.timeline}
              onChange={(rows) => set("timeline", rows)}
            />
            <EvidenceEditor
              rows={form.evidence}
              onChange={(rows) => set("evidence", rows)}
            />
          </div>
        ) : (
          <p className="rounded-md border border-dashed bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
            Entities, timeline, and evidence can be added after the DRAFT is
            created.
          </p>
        )}

        <FieldError
          message={
            editing &&
            !timelineRowsValid &&
            "Every timeline event needs a title and a valid date (YYYY-MM-DD)."
          }
        />
        <FieldError
          message={
            editing &&
            !entityRowsValid &&
            "Every entity row needs a valid entity IRI and a relationship type."
          }
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={!canSave}>
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            {editing ? "Save changes" : "Create case"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/jawafdehi/cases")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
