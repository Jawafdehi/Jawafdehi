// The caseworker "case update proposal" review queue (master/detail).
// Presentational + self-contained (no auth/provider deps); the API-backed page
// at /admin/proposals (CaseworkProposals) supplies the data and decision handler.
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/casework-ui";
import type { CaseUpdateProposal, Intent, ProposalStatus, SignalSource } from "@/types/proposals";
import {
  applyEffect,
  confidenceBand,
  dateBoth,
  detectedByLabel,
  intentLabel,
  intentSummary,
  pct,
  queueSort,
  shortIri,
  sourceHost,
  sourceMeta,
  statusLabel,
  statusPill,
} from "@/lib/proposal-ui";
import {
  ArrowRight,
  Check,
  Clock,
  ExternalLink,
  FileJson,
  Hash,
  Inbox,
  Loader2,
  Pencil,
  Search,
  X,
} from "lucide-react";

type Decision = "approved" | "rejected";

export interface ProposalQueueProps {
  proposals: CaseUpdateProposal[];
  // May return a promise: approve/reject are non-idempotent writes, so the pane
  // awaits it to keep the buttons disabled until the request settles.
  onDecision?: (id: string, decision: Decision, notes: string) => void | Promise<void>;
  // Correct a pending proposal's change before approving. Omit to hide the editor
  // (e.g. for a read-only viewer). Should REJECT on failure so the pane can show why.
  onEditIntent?: (id: string, intent: Intent) => void | Promise<void>;
}

const STATUS_FILTERS: (ProposalStatus | "all")[] = ["all", "pending", "approved", "rejected"];

const SOURCE_OPTIONS: SignalSource[] = ["ngm_docket", "court_order", "ciaa_press", "news", "caseworker"];

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap", className)}>
      {children}
    </span>
  );
}

export default function ProposalQueue({ proposals, onDecision, onEditIntent }: ProposalQueueProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ProposalStatus | "all">("pending");
  const [source, setSource] = useState<SignalSource | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pendingCount = useMemo(() => proposals.filter((p) => p.status === "pending").length, [proposals]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return proposals
      .filter((p) => (status === "all" ? true : p.status === status))
      .filter((p) => (source === "all" ? true : p.source_kind === source))
      .filter((p) =>
        !q
          ? true
          : p.case_title.toLowerCase().includes(q) ||
            intentSummary(p.intent, t).toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q),
      )
      .sort(queueSort);
  }, [proposals, status, source, query, t]);

  const selected = useMemo(
    () => filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t("admin.proposals.title", "Update proposals")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "admin.proposals.subtitle",
              "Automation-drafted case updates awaiting review. Approve to apply the change to the case, reject to dismiss it.",
            )}
          </p>
        </div>
        <Pill className="bg-info/10 text-info border-info/25 text-sm">
          <Inbox className="h-3.5 w-3.5" />{" "}
          {t("admin.proposals.pendingCount", {
            defaultValue: "{{count}} pending",
            count: pendingCount,
          })}
        </Pill>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              status === s ? "bg-primary-surface/10 border-primary/30 text-primary font-medium" : "bg-white text-muted-foreground hover:bg-muted",
            )}
          >
            {s === "all"
              ? t("admin.proposals.filters.all", "All")
              : statusLabel(s, t)}
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-secondary" />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as SignalSource | "all")}
          aria-label={t("admin.proposals.filterBySource", "Filter by source")}
          className="rounded-md border bg-white px-2 py-1 text-xs text-foreground"
        >
          <option value="all">{t("admin.proposals.allSources", "All sources")}</option>
          {SOURCE_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {sourceMeta(k, t).label}
            </option>
          ))}
        </select>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.proposals.searchPlaceholder", "Search…")}
            aria-label={t("admin.proposals.searchLabel", "Search proposals")}
            className="rounded-md border bg-white py-1 pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Master / detail */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              {t("admin.proposals.noneMatch", "No proposals match.")}
            </p>
          ) : (
            filtered.map((p) => (
              <ProposalRow key={p.id} p={p} active={selected?.id === p.id} onClick={() => setSelectedId(p.id)} />
            ))
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          {selected ? <DetailPane key={selected.id} p={selected} onDecision={onDecision} onEditIntent={onEditIntent} /> : (
            <p className="rounded-xl border border-dashed bg-white px-4 py-12 text-center text-sm text-muted-foreground">
              {t("admin.proposals.selectPrompt", "Select a proposal to review.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProposalRow({ p, active, onClick }: { p: CaseUpdateProposal; active: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  const src = sourceMeta(p.source_kind, t);
  const SrcIcon = src.icon;
  const band = confidenceBand(p.confidence, t);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border bg-white px-3 py-3 text-left transition-colors",
        active ? "border-primary/40 ring-1 ring-primary/20" : "hover:bg-muted",
      )}
    >
      <div className="flex items-center gap-2">
        <Pill className={src.pill}>
          <SrcIcon className="h-3 w-3" /> {src.label}
        </Pill>
        <span className="ml-auto text-[11px] text-muted-foreground">{fmtDate(p.created_at)}</span>
      </div>
      <div className="mt-1.5 truncate text-sm font-medium text-foreground">{p.case_title}</div>
      <div className="truncate text-xs text-muted-foreground">
        <span className="text-muted-foreground">{intentLabel(p.intent.type, t)}:</span> {intentSummary(p.intent, t)}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Pill className={band.pill}>{band.label} · {pct(p.confidence)}</Pill>
        {p.status !== "pending" && <Pill className={statusPill(p.status)}>{statusLabel(p.status, t)}</Pill>}
      </div>
    </button>
  );
}

function DetailPane({
  p,
  onDecision,
  onEditIntent,
}: {
  p: CaseUpdateProposal;
  onDecision?: (id: string, d: Decision, notes: string) => void | Promise<void>;
  onEditIntent?: (id: string, intent: Intent) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState("");
  // Approve and reject are non-idempotent writes (approve also applies the intent
  // onto the case), so a double-click must not fire two requests. The pane is
  // remounted per proposal via `key`, so this resets on selection change.
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const band = confidenceBand(p.confidence, t);
  const src = sourceMeta(p.source_kind, t);
  const SrcIcon = src.icon;
  const isPending = p.status === "pending";

  const decide = async (decision: Decision) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onDecision?.(p.id, decision, notes);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = () => {
    setDraft(JSON.stringify(p.intent, null, 2));
    setEditError("");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (saving) return;
    // Parse locally first so a typo is a caught mistake rather than a 400 round-trip.
    // The backend re-validates the shape regardless — this only catches the obvious.
    let parsed: Intent;
    try {
      parsed = JSON.parse(draft) as Intent;
    } catch (e) {
      setEditError(
        t("admin.proposals.invalidJson", {
          defaultValue: "That isn't valid JSON: {{message}}",
          message: e instanceof Error ? e.message : String(e),
        }),
      );
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !("type" in parsed)) {
      setEditError(t("admin.proposals.intentNeedsType", "The change must be an object with a `type`."));
      return;
    }
    setEditError("");
    setSaving(true);
    try {
      await onEditIntent?.(p.id, parsed);
      setEditing(false);
    } catch (e) {
      // Server-side rejection (unknown type, missing entry.date, decided proposal).
      setEditError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("admin.proposals.caseLabel", "Case")}</div>
          <a
            href={`/admin/jawafdehi/cases/${p.case_slug}/edit`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {p.case_title || p.case_slug} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
          <div className="font-mono text-[11px] text-muted-foreground">{p.case_slug}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <Pill className={src.pill}>
              <SrcIcon className="h-3 w-3" /> {src.label}
            </Pill>
            <span className="text-xs font-medium text-muted-foreground">{intentLabel(p.intent.type, t)}</span>
          </div>
        </div>
        <Pill className={statusPill(p.status)}>{statusLabel(p.status, t)}</Pill>
      </div>

      {/* Confidence meter */}
      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("admin.proposals.confidence", "Confidence")}</span>
          <span className="font-medium" style={{ color: band.swatch }}>{band.label} · {pct(p.confidence)}</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full" style={{ width: pct(p.confidence), backgroundColor: band.swatch }} />
        </div>
      </div>

      {/* The proposed change — correctable while pending */}
      <div className="rounded-xl border bg-muted/60 p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("admin.proposals.proposedChange", "Proposed change")}</div>
          {isPending && onEditIntent && !editing && (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary-surface/10"
            >
              <Pencil className="h-3 w-3" /> {t("admin.proposals.edit", "Edit")}
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              aria-label={t("admin.proposals.editIntentLabel", "Proposed change as JSON")}
              className="min-h-[180px] w-full rounded-lg border bg-white p-2 font-mono text-[11px] leading-relaxed text-foreground"
            />
            <p className="text-[11px] text-muted-foreground">
              {t(
                "admin.proposals.editHint",
                "Only the proposed change is editable — provenance and confidence record where the fact came from and stay as filed.",
              )}
            </p>
            {editError && <p className="text-[11px] font-medium text-danger">{editError}</p>}
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={saving} onClick={saveEdit}>
                {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                {t("admin.proposals.saveEdit", "Save change")}
              </Button>
              <Button size="sm" variant="ghost" disabled={saving} onClick={() => setEditing(false)}>
                {t("admin.proposals.cancelEdit", "Cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <IntentBody intent={p.intent} />
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {applyEffect(p.intent, t)}
            </p>
          </>
        )}
      </div>

      {/* Provenance */}
      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <Field label={t("admin.proposals.detectedBy", "Detected by")}>{detectedByLabel(p.provenance.detected_by, t)}</Field>
        <Field label={t("admin.proposals.sourceLabel", "Source")}>
          {p.provenance.source === "caseworker" ? (
            t("admin.proposals.caseworkerManual", "Caseworker (manual)")
          ) : (
            <a href={p.provenance.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              {sourceHost(p.provenance.source)} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </Field>
        <Field label={t("admin.proposals.dedupKey", "Dedup key")} full>
          <code className="break-all font-mono text-[11px] text-foreground">{p.provenance.dedup_key}</code>
        </Field>
      </dl>

      {/* Linked records (subject_refs) */}
      <div>
        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Hash className="h-3 w-3" /> {t("admin.proposals.linkedRecords", "Linked records")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p.origin_event.subject_refs.map((ref) => (
            <code key={ref} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              {shortIri(ref)}
            </code>
          ))}
        </div>
      </div>

      {/* Review */}
      {isPending ? (
        <div className="space-y-2 border-t pt-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("admin.proposals.notesPlaceholder", "Review note (optional)…")}
            className="min-h-[64px] text-sm"
          />
          <div className="flex items-center gap-2">
            {/* Disabled while editing: approving with an unsaved draft would apply the
                ORIGINAL intent and silently discard the correction. */}
            <Button disabled={submitting || editing} className="bg-success-strong hover:bg-success-strong" onClick={() => decide("approved")}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              {submitting
                ? t("admin.proposals.deciding", "Working…")
                : t("admin.proposals.approve", "Approve & apply")}
            </Button>
            <Button disabled={submitting || editing} variant="outline" className="text-danger hover:bg-danger/10" onClick={() => decide("rejected")}>
              <X className="mr-1 h-4 w-4" /> {t("admin.proposals.reject", "Reject")}
            </Button>
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />{" "}
              {t("admin.proposals.filed", {
                defaultValue: "filed {{date}}",
                date: fmtDate(p.created_at),
              })}
            </span>
          </div>
        </div>
      ) : (
        <div className="border-t pt-3 text-xs text-muted-foreground">
          {p.review.reviewer ? (
            <p>
              {t("admin.proposals.decidedBy", {
                defaultValue: "{{status}} by {{who}}",
                status: statusLabel(p.status, t),
                who: detectedByLabel(p.review.reviewer, t),
              })}
              {p.review.reviewed_at ? ` · ${fmtDate(p.review.reviewed_at)}` : ""}
              {p.review.notes ? <span className="mt-1 block text-foreground">“{p.review.notes}”</span> : null}
            </p>
          ) : (
            <p>{statusLabel(p.status, t)}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{children}</dd>
    </div>
  );
}

function IntentBody({ intent }: { intent: Intent }) {
  const { t } = useTranslation();
  switch (intent.type) {
    case "append_timeline_entry": {
      const e = intent.entry;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {dateBoth(e.date, e.date_bs, e.date_ad_uncertain)}
          </div>
          <div className="text-sm font-medium text-foreground">{e.title}</div>
          {e.description && <p className="text-sm text-foreground">{e.description}</p>}
        </div>
      );
    }
    case "link_material":
      return (
        <div className="space-y-1 text-sm">
          <div className="text-foreground">
            {t("admin.proposals.relation", {
              defaultValue: "Relation: {{relation}}",
              relation: intent.relation,
            })}
          </div>
          <a href={intent.material} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-xs text-primary hover:underline">
            {shortIri(intent.material)} <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
      );
    case "raw_patch":
      return (
        <div>
          <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <FileJson className="h-3.5 w-3.5" /> {t("admin.proposals.rfcPatch", "RFC-6902 patch")}
          </div>
          <pre className="overflow-x-auto rounded-lg bg-code-surface p-2 font-mono text-[11px] leading-relaxed text-code-surface-foreground">
            {JSON.stringify(intent.patch, null, 2)}
          </pre>
        </div>
      );
  }
}
