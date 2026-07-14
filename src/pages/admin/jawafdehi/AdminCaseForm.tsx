import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import {
  getCaseWithEtag,
  createCase,
  patchCaseWithEtag,
  adminErrorMessage,
  CaseConflictError,
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
  OUTCOME_TYPES,
  type EntityRelationshipRow,
  type TimelineEventRow,
  type EvidenceRow,
  type RelationshipType,
  type OutcomeType,
} from "@/lib/jawafdehi-forms";
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { formatAmountInput, stripAmountFormatting } from "@/utils/number";
import EntityRelationshipsEditor from "@/components/admin/case/EntityRelationshipsEditor";
import TimelineEditor from "@/components/admin/case/TimelineEditor";
import EvidenceEditor from "@/components/admin/case/EvidenceEditor";
import ChipListEditor from "@/components/admin/case/ChipListEditor";
import CaseStateControl from "@/components/admin/case/CaseStateControl";
import CaseReviewScoreBadge from "@/components/admin/case/CaseReviewScoreBadge";
import CaseHistoryPanel from "@/components/admin/case/CaseHistoryPanel";
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
import { ArrowLeft, ExternalLink, Loader2, Save } from "lucide-react";

const str = (v: unknown): string => (v == null ? "" : String(v));

// The mutable editor state. Sub-resource lists (entities/timeline/evidence) are
// edited by the F3/F4/F5 child editors; F6 field editors extend this shape.
interface CaseFormState {
  title: string;
  slug: string;
  case_type: string;
  description: string;
  notes: string;
  missing_details: string;
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
  // AD (Gregorian) is the single source of truth. Bikram Sambat is DERIVED from
  // the AD date at display time (public pages and the admin BS picker), never
  // stored — the backend has no BS columns.
  case_start_date: string; // AD
  case_end_date: string; // AD
}

const EMPTY: CaseFormState = {
  title: "",
  slug: "",
  case_type: "CORRUPTION",
  description: "",
  notes: "",
  missing_details: "",
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
  case_end_date: "",
};

// Coerce a loaded relationship_type into the known enum (default ACCUSED).
function asRelType(v: unknown): RelationshipType {
  const s = str(v).toUpperCase();
  return (RELATIONSHIP_TYPES as readonly string[]).includes(s)
    ? (s as RelationshipType)
    : "ACCUSED";
}

// Coerce a loaded outcome into the known enum (default CHARGED).
function asOutcome(v: unknown): OutcomeType {
  const s = str(v).toUpperCase();
  return (OUTCOME_TYPES as readonly string[]).includes(s)
    ? (s as OutcomeType)
    : "CHARGED";
}

// Parse a loaded case's entities array into editor rows. Tolerates the loose
// read-plane shape (nes_id may live under different keys).
function parseEntities(c: Record<string, unknown>): EntityRelationshipRow[] {
  const list = Array.isArray(c.entities) ? (c.entities as Record<string, unknown>[]) : [];
  return list.map((e) => {
    // The case-read API emits the role under `type`; keep `relationship_type`/
    // `role` as fallbacks. Reading only the latter two coerced every loaded row
    // to ACCUSED, so a whole-list save silently rewrote all non-accused roles.
    const relationship_type = asRelType(e.type ?? e.relationship_type ?? e.role);
    // The case-read API resolves each entity's name into `display_name`; keep it
    // for display only (like evidence's `title`). Empty when NES can't resolve.
    const display_name = str(e.display_name) || undefined;
    return {
      nes_id: str(e.nes_id ?? e.entity ?? e["@id"]),
      relationship_type,
      // A verdict is meaningful only for ACCUSED; every other role is null.
      outcome: relationship_type === "ACCUSED" ? asOutcome(e.outcome) : null,
      notes: str(e.notes),
      display_name,
    };
  });
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
    .map((e) => {
      // CaseDetailSerializer enriches each evidence entry with a resolved
      // `material` object ({display_name, material_type, urls}); capture the
      // human title for display so linked rows aren't shown as a raw IRI (BB-20).
      const mat = e.material;
      const title =
        mat && typeof mat === "object"
          ? str((mat as Record<string, unknown>).display_name)
          : "";
      return {
        // `e.material` is now the resolved object (used for `title`); only fall
        // back to it for the IRI when it's still a bare string, else `String()`
        // would yield "[object Object]".
        material_iri: str(
          e.material_iri ?? (typeof mat === "string" ? mat : undefined) ?? e["@id"],
        ),
        additional_details: str(e.additional_details ?? e.notes),
        title,
      };
    })
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
    missing_details: str(c.missing_details),
    key_allegations: allegations,
    entities: parseEntities(c),
    timeline: parseTimeline(c),
    evidence: parseEvidence(c),
    bigo: c.bigo == null ? "" : str(c.bigo),
    thumbnail_url: str(c.thumbnail_url),
    banner_url: str(c.banner_url),
    tags: strList(c.tags),
    // Canonical @id IRIs — the only court-case reference format.
    court_cases: strList(c.court_cases),
    case_start_date: str(c.case_start_date),
    case_end_date: str(c.case_end_date),
  };
}

// Create + edit a Jawafdehi case. Create posts the authoring shape (backend
// forces state=DRAFT, A1); edit diffs the touched scalar/list fields into an
// RFC-6902 patch array (§3). description/notes are Markdown (A4).
export default function AdminCaseForm() {
  const params = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isModerator } = useCaseworkAuth();
  const slug = params.slug;
  const editing = Boolean(slug);
  // Ties the disabled "View on website" button to its "not public yet" hint via
  // aria-describedby so the reason reaches screen readers (a disabled button
  // isn't focusable, so a hover-only title alone would exclude keyboard/AT users).
  const notPublicHintId = useId();

  const [form, setForm] = useState<CaseFormState>(EMPTY);
  const [original, setOriginal] = useState<CaseFormState>(EMPTY);
  const [caseState, setCaseState] = useState<string>("DRAFT");
  // Raw multiline text for key allegations (one per line) — parsed to a list.
  const [allegationsText, setAllegationsText] = useState("");
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True when the case failed to LOAD (bad slug / network) — as opposed to a
  // save error. Drives a dedicated error view instead of a blank editable form.
  const [loadFailed, setLoadFailed] = useState(false);
  // In create mode, track whether the user hand-edited the slug so we stop
  // auto-deriving it from the title.
  const [slugDirty, setSlugDirty] = useState(false);
  // Optimistic-concurrency token from the last load/save. Echoed back as
  // If-Match on save so a concurrent edit is rejected instead of clobbered.
  const [etag, setEtag] = useState<string | null>(null);
  // True after a save was rejected because the case changed underneath us; we
  // steer the user to reload rather than retry a stale write.
  const [conflict, setConflict] = useState(false);
  // Bumped to force the history panel to refetch (after a transition/save).
  const [historyKey, setHistoryKey] = useState(0);

  const set = <K extends keyof CaseFormState>(k: K, v: CaseFormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const loadCase = useCallback(async () => {
    if (!editing || !slug) return;
    setLoading(true);
    setLoadFailed(false);
    setConflict(false);
    try {
      const { data: c, etag: tok } = await getCaseWithEtag<
        Record<string, unknown>
      >(slug);
      const parsed = fromCase(c);
      setForm(parsed);
      setOriginal(parsed);
      setCaseState(str(c.state ?? c.status) || "DRAFT");
      setAllegationsText(parsed.key_allegations.join("\n"));
      setEtag(tok);
      // A fresh load resolves any prior conflict and refreshes the history.
      setHistoryKey((k) => k + 1);
    } catch (err) {
      setError(adminErrorMessage(err, t("admin.caseForm.loadFailed")));
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [editing, slug, t]);

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
  // AD is the stored source of truth (BS is derived for display only), so
  // validate the AD fields.
  const datesValid =
    isValidDateField(form.case_start_date) &&
    isValidDateField(form.case_end_date);
  // A partially-filled timeline row (title without a date, etc.) would serialize into the /timeline replace and 422 the whole PATCH, so block save until every *populated* timeline row is complete — a fully-blank trailing timeline add-row is fine, the patch builder drops it.
  const timelineRowsValid = form.timeline.every(
    (r) =>
      (r.title.trim() === "" && r.date.trim() === "") || isValidTimelineRow(r),
  );
  // Entities are stricter than timeline: an "Add row" starts blank and buildEntitiesPatch silently drops blank-IRI rows, so a blank row would vanish on save with no feedback ("Add row appears to do nothing", BB-27). Require every entity row to carry a valid IRI so save is blocked with an inline hint instead — the author fills the IRI (search or paste) or removes the row, never loses it silently.
  const entityRowsValid = form.entities.every((r) => isValidEntityRow(r));
  // An invalid court-case chip would 422 the whole PATCH (they are sent
  // verbatim rather than silently dropped) — block save until fixed.
  const courtCaseRowsValid = form.court_cases.every(
    (c) => c.trim() === "" || isValidCourtCaseRef(c),
  );
  const canSave =
    !saving &&
    form.title.trim() !== "" &&
    form.case_type.trim() !== "" &&
    slugValid &&
    bigoValid &&
    datesValid &&
    timelineRowsValid &&
    entityRowsValid &&
    courtCaseRowsValid;

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
    if (form.missing_details !== original.missing_details)
      ops.push(replaceOp("/missing_details", form.missing_details));
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
    // Only AD dates are stored; BS is derived from them at display time, so no
    // /case_*_date_bs ops are emitted (those columns don't exist on the backend).
    if (form.case_start_date !== original.case_start_date)
      ops.push(replaceOp("/case_start_date", form.case_start_date || null));
    if (form.case_end_date !== original.case_end_date)
      ops.push(replaceOp("/case_end_date", form.case_end_date || null));
    return ops;
  };

  // Dirty when there are unsaved edits: in edit mode, any diff op; in create
  // mode, any non-empty field the create form exposes (all fields render
  // regardless of `editing`, so the guard must cover them all — not just the
  // core four — or filling e.g. a thumbnail URL would be silently discarded).
  const dirty = editing
    ? buildPatch().length > 0
    : form.title.trim() !== "" ||
      form.description.trim() !== "" ||
      form.notes.trim() !== "" ||
      form.missing_details.trim() !== "" ||
      form.key_allegations.length > 0 ||
      form.bigo.trim() !== "" ||
      form.thumbnail_url.trim() !== "" ||
      form.banner_url.trim() !== "" ||
      form.tags.length > 0 ||
      form.court_cases.length > 0 ||
      form.case_start_date.trim() !== "" ||
      form.case_end_date.trim() !== "";
  const { confirmDiscard } = useUnsavedChanges(dirty);

  const onCancel = () => {
    if (confirmDiscard()) navigate("/admin/jawafdehi/cases");
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
          toast({ title: t("admin.caseForm.noChanges") });
          setSaving(false);
          return;
        }
        const { data: updated, etag: tok } = await patchCaseWithEtag<
          Record<string, unknown>
        >(slug, ops, { ifMatch: etag });
        const parsed = fromCase(updated);
        setForm(parsed);
        setOriginal(parsed);
        setCaseState(str(updated.state ?? updated.status) || caseState);
        setEtag(tok);
        toast({ title: t("admin.caseForm.updated") });
      } else {
        const payload: CreateCasePayload = {
          title: form.title.trim(),
          case_type: form.case_type,
          description: form.description || undefined,
          notes: form.notes || undefined,
          missing_details: form.missing_details || undefined,
          key_allegations: form.key_allegations.length
            ? form.key_allegations
            : undefined,
        };
        if (effectiveSlug) payload.slug = effectiveSlug;
        const created = await createCase<Record<string, unknown>>(payload);
        toast({ title: t("admin.caseForm.created"), description: str(created.slug) });
        // Land the user on the new case's edit page so they can add
        // entities/timeline/evidence and submit for review.
        const newSlug = str(created.slug) || effectiveSlug;
        navigate(newSlug ? `/admin/jawafdehi/cases/${newSlug}/edit` : "/admin/jawafdehi/cases");
      }
    } catch (err) {
      if (err instanceof CaseConflictError) {
        // The case changed under us — a stale save was refused. Steer the user
        // to reload (which pulls the latest + a fresh token) rather than letting
        // them retry a write that would keep failing or clobber the new edit.
        setConflict(true);
        setError(err.message);
      } else {
        setError(adminErrorMessage(err, t("admin.caseForm.saveFailed")));
      }
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

  // Bad slug / load failure: show a dedicated error view, not a blank editable
  // form under an error banner (which read as a half-broken "New case").
  if (editing && loadFailed) {
    return (
      <div className="max-w-3xl space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => navigate("/admin/jawafdehi/cases")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> {t("admin.caseForm.backToCases")}
        </Button>
        <FormError message={error || t("admin.caseForm.notFound")} />
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
          onClick={onCancel}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> {t("admin.caseForm.backToCases")}
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {editing ? t("admin.caseForm.editTitle") : t("admin.caseForm.newTitle")}
        </h1>
        {editing && (
          <p className="text-sm text-muted-foreground">
            {t("admin.caseForm.editingHint", { slug: form.slug })}
          </p>
        )}
        {/* "View on website" — the public case page lives at /case/<slug> on the
            shared origin, so a relative link opens it in a new tab. Only a
            PUBLISHED case is public; DRAFT/IN_REVIEW/CLOSED 404 publicly, so the
            control is disabled instead of linking to a 404. The reason is exposed
            three ways so no user is left guessing: a hover `title` on the wrapping
            span (sighted mouse users, since the disabled button's
            pointer-events-none forwards the hover to the span), plus an sr-only
            hint wired to the button via aria-describedby (keyboard / screen-reader
            users, who can't focus a disabled button to see a title). The button
            keeps only its native `disabled` — no redundant aria-disabled — and
            nothing here is focusable, so it is not a focus trap. */}
        {editing && form.slug && (
          <div className="mt-2">
            {caseState === "PUBLISHED" ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`/case/${form.slug}`}
                  target="_blank"
                  rel="noopener"
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  {t("admin.caseForm.viewOnWebsite")}
                </a>
              </Button>
            ) : (
              <span
                className="inline-block"
                title={t("admin.caseForm.viewOnWebsiteNotPublic")}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  aria-describedby={notPublicHintId}
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  {t("admin.caseForm.viewOnWebsite")}
                </Button>
                <span id={notPublicHintId} className="sr-only">
                  {t("admin.caseForm.viewOnWebsiteNotPublic")}
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      <FormError message={error} />

      {/* Optimistic-lock conflict: a save was refused because the case changed
          since it was opened. Offer a one-click reload (discards local edits,
          pulls the latest + a fresh token). Distinct from a generic save error
          so the user knows retrying as-is won't help. */}
      {conflict && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span>{t("admin.caseForm.conflictBanner")}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadCase()}
          >
            {t("admin.caseForm.reloadCase")}
          </Button>
        </div>
      )}

      {/* F2 — state transitions. Edit mode only (a persisted case has a state).
          Privileged targets are gated to admin/moderator in the UI; the API is
          the authority. Transitioning reloads the case to reflect the new state. */}
      {editing && slug && (
        <CaseStateControl
          slug={slug}
          state={caseState}
          isModerator={isModerator}
          onTransitioned={() => loadCase()}
          rightSlot={<CaseReviewScoreBadge slug={slug} />}
        />
      )}

      {/* F7 — workflow history / author feedback. Renders nothing until there's
          a transition to show (and is a no-op on an older backend). */}
      {editing && slug && (
        <CaseHistoryPanel slug={slug} refreshKey={historyKey} />
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-1">
          <Label htmlFor="title">{t("admin.caseForm.labelTitle")}</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={t("admin.caseForm.titlePlaceholder")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="slug">{t("admin.caseForm.labelSlug")}</Label>
            <Input
              id="slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugDirty(true);
                set("slug", e.target.value);
              }}
              className="font-mono text-xs"
              placeholder={t("admin.caseForm.slugPlaceholder")}
            />
            <FieldError
              message={!slugValid && t("admin.caseForm.slugInvalid")}
            />
            {editing && (
              <p className="text-xs text-muted-foreground">
                {t("admin.caseForm.slugImmutable")}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>{t("admin.caseForm.labelCaseType")}</Label>
            <Select
              value={form.case_type}
              onValueChange={(v) => set("case_type", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASE_TYPES.map((ct) => (
                  <SelectItem key={ct} value={ct}>
                    {ct}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label>{t("admin.caseForm.labelDescription")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("admin.caseForm.descriptionHelp")}
          </p>
          <MDEditor
            value={form.description}
            onChange={(v) => set("description", v ?? "")}
            height={280}
            preview="edit"
            textareaProps={{ placeholder: t("admin.caseForm.descriptionPlaceholder") }}
          />
        </div>

        <div className="space-y-1">
          <Label>{t("admin.caseForm.labelNotes")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("admin.caseForm.notesHelp")}
          </p>
          <MDEditor
            value={form.notes}
            onChange={(v) => set("notes", v ?? "")}
            height={200}
            preview="edit"
          />
        </div>

        <div className="space-y-1">
          <Label>{t("admin.caseForm.labelMissingDetails")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("admin.caseForm.missingDetailsHelp")}
          </p>
          <MDEditor
            value={form.missing_details}
            onChange={(v) => set("missing_details", v ?? "")}
            height={200}
            preview="edit"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="allegations">
            {t("admin.caseForm.labelAllegations")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("admin.caseForm.allegationsHelp")}
          </p>
          <textarea
            id="allegations"
            value={allegationsText}
            onChange={(e) => setAllegationsText(e.target.value)}
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder={t("admin.caseForm.allegationsPlaceholder")}
          />
        </div>

        {/* F6 — first-class field editors (replacing raw-JSON entry). */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="bigo">{t("admin.caseForm.labelBigo")}</Label>
            {/* type="text": a native number input rejects the grouping commas.
                The state (and the PATCH) stays the plain digit string. */}
            <Input
              id="bigo"
              type="text"
              inputMode="numeric"
              value={formatAmountInput(form.bigo)}
              onChange={(e) => set("bigo", stripAmountFormatting(e.target.value))}
              placeholder={t("admin.caseForm.bigoPlaceholder")}
            />
            <FieldError message={!bigoValid && t("admin.caseForm.bigoInvalid")} />
          </div>
          <ChipListEditor
            label={t("admin.caseForm.labelTags")}
            items={form.tags}
            onChange={(items) => set("tags", items)}
            placeholder={t("admin.caseForm.tagsPlaceholder")}
            normalize={(v) => v.trim().toLowerCase()}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="thumbnail_url">
              {t("admin.caseForm.labelThumbnail")}
            </Label>
            <Input
              id="thumbnail_url"
              value={form.thumbnail_url}
              onChange={(e) => set("thumbnail_url", e.target.value)}
              className="text-xs"
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="banner_url">{t("admin.caseForm.labelBanner")}</Label>
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
          label={t("admin.caseForm.labelCourtCases")}
          items={form.court_cases}
          onChange={(items) => set("court_cases", items)}
          placeholder="https://jawafdehi.org/courtcase/special/081-cr-0136"
          help={t("admin.caseForm.courtCasesHelp")}
          validate={isValidCourtCaseRef}
          invalidHint={t("admin.caseForm.courtCaseInvalid")}
        />

        {/* BS is derived from AD for display and never stored (the backend has
            no BS columns). Authors may still pick in the Nepali calendar — that
            selection sets the AD date, and the shown BS re-derives from it. */}
        <DatePairInput
          label={t("admin.caseForm.caseStart")}
          idBase="case-start"
          deriveBs
          adValue={form.case_start_date}
          onAdChange={(ad) => set("case_start_date", ad)}
        />
        <DatePairInput
          label={t("admin.caseForm.caseEnd")}
          idBase="case-end"
          deriveBs
          adValue={form.case_end_date}
          onAdChange={(ad) => set("case_end_date", ad)}
        />
        <FieldError message={!datesValid && t("admin.caseForm.datesInvalid")} />

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
            {t("admin.caseForm.subResourcesHint")}
          </p>
        )}

        <FieldError
          message={
            editing &&
            !timelineRowsValid &&
            t("admin.caseForm.timelineRowsInvalid")
          }
        />
        <FieldError
          message={
            editing && !entityRowsValid && t("admin.caseForm.entityRowsInvalid")
          }
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={!canSave}>
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            {editing
              ? t("admin.caseForm.saveChanges")
              : t("admin.caseForm.createCase")}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("admin.common.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
