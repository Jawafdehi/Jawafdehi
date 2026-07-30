// PROTOTYPE — the caseworker "case update proposal" review queue (master/detail).
// Presentational + self-contained (no auth/provider deps) so it renders both in
// the admin panel (/admin/proposals) and the dev preview (/dev/proposals).
import { useMemo, useState } from "react";
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
  Layers,
  Search,
  X,
} from "lucide-react";

type Decision = "approved" | "rejected";

export interface ProposalQueueProps {
  proposals: CaseUpdateProposal[];
  onDecision?: (id: string, decision: Decision, notes: string) => void;
}

const STATUS_FILTERS: (ProposalStatus | "all")[] = ["all", "pending", "approved", "rejected", "superseded"];

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap", className)}>
      {children}
    </span>
  );
}

export default function ProposalQueue({ proposals, onDecision }: ProposalQueueProps) {
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
            intentSummary(p.intent).toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q),
      )
      .sort(queueSort);
  }, [proposals, status, source, query]);

  const selected = useMemo(
    () => filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Update proposals</h1>
          <p className="text-sm text-muted-foreground">
            Automation-drafted case updates awaiting review. Approve to apply, reject to dismiss.
          </p>
        </div>
        <Pill className="bg-blue-50 text-blue-700 border-blue-200 text-sm">
          <Inbox className="h-3.5 w-3.5" /> {pendingCount} pending
        </Pill>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
              status === s ? "bg-primary/10 border-primary/30 text-primary font-medium" : "bg-white text-muted-foreground hover:bg-slate-50",
            )}
          >
            {s}
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as SignalSource | "all")}
          className="rounded-md border bg-white px-2 py-1 text-xs text-slate-700"
        >
          <option value="all">All sources</option>
          <option value="ngm_docket">Court docket</option>
          <option value="court_order">Court order</option>
          <option value="ciaa_press">CIAA press</option>
          <option value="news">News</option>
          <option value="caseworker">Caseworker</option>
        </select>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="rounded-md border bg-white py-1 pl-7 pr-2 text-xs text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Master / detail */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              No proposals match.
            </p>
          ) : (
            filtered.map((p) => (
              <ProposalRow key={p.id} p={p} active={selected?.id === p.id} onClick={() => setSelectedId(p.id)} />
            ))
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          {selected ? <DetailPane key={selected.id} p={selected} onDecision={onDecision} /> : (
            <p className="rounded-xl border border-dashed bg-white px-4 py-12 text-center text-sm text-muted-foreground">
              Select a proposal to review.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProposalRow({ p, active, onClick }: { p: CaseUpdateProposal; active: boolean; onClick: () => void }) {
  const src = sourceMeta(p.source_kind);
  const SrcIcon = src.icon;
  const band = confidenceBand(p.confidence);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border bg-white px-3 py-3 text-left transition-colors",
        active ? "border-primary/40 ring-1 ring-primary/20" : "hover:bg-slate-50",
        p.status === "superseded" && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        <Pill className={src.pill}>
          <SrcIcon className="h-3 w-3" /> {src.label}
        </Pill>
        <span className="ml-auto text-[11px] text-slate-400">{fmtDate(p.created_at)}</span>
      </div>
      <div className="mt-1.5 truncate text-sm font-medium text-slate-800">{p.case_title}</div>
      <div className="truncate text-xs text-slate-500">
        <span className="text-slate-400">{intentLabel(p.intent.type)}:</span> {intentSummary(p.intent)}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Pill className={band.pill}>{band.label} · {pct(p.confidence)}</Pill>
        {p.status !== "pending" && <Pill className={statusPill(p.status)}>{p.status}</Pill>}
        {p.provenance.supersedes && (
          <Pill className="bg-slate-100 text-slate-500 border-slate-200">
            <Layers className="h-3 w-3" /> supersedes
          </Pill>
        )}
      </div>
    </button>
  );
}

function DetailPane({ p, onDecision }: { p: CaseUpdateProposal; onDecision?: (id: string, d: Decision, notes: string) => void }) {
  const [notes, setNotes] = useState("");
  const band = confidenceBand(p.confidence);
  const src = sourceMeta(p.source_kind);
  const SrcIcon = src.icon;
  const isPending = p.status === "pending";

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Case</div>
          <a
            href={`/admin/jawafdehi/cases/${p.case_slug}/edit`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {p.case_title || p.case_slug} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
          <div className="font-mono text-[11px] text-slate-400">{p.case_slug}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <Pill className={src.pill}>
              <SrcIcon className="h-3 w-3" /> {src.label}
            </Pill>
            <span className="text-xs font-medium text-slate-500">{intentLabel(p.intent.type)}</span>
          </div>
        </div>
        <Pill className={statusPill(p.status)}>{p.status}</Pill>
      </div>

      {/* Confidence meter */}
      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-medium" style={{ color: band.hex }}>{band.label} · {pct(p.confidence)}</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full" style={{ width: pct(p.confidence), backgroundColor: band.hex }} />
        </div>
      </div>

      {/* The proposed change */}
      <div className="rounded-xl border bg-slate-50/60 p-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Proposed change</div>
        <IntentBody intent={p.intent} />
        <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {applyEffect(p.intent)}
        </p>
      </div>

      {/* Provenance */}
      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <Field label="Detected by">{detectedByLabel(p.provenance.detected_by)}</Field>
        <Field label="Source">
          {p.provenance.source === "caseworker" ? (
            "Caseworker (manual)"
          ) : (
            <a href={p.provenance.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              {sourceHost(p.provenance.source)} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </Field>
        <Field label="Dedup key" full>
          <code className="break-all font-mono text-[11px] text-slate-600">{p.provenance.dedup_key}</code>
        </Field>
        {p.provenance.supersedes && (
          <Field label="Supersedes" full>
            <code className="font-mono text-[11px] text-slate-600">{p.provenance.supersedes}</code>
          </Field>
        )}
      </dl>

      {/* Linked records (subject_refs) */}
      <div>
        <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <Hash className="h-3 w-3" /> Linked records
        </div>
        <div className="flex flex-wrap gap-1.5">
          {p.origin_event.subject_refs.map((ref) => (
            <code key={ref} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
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
            placeholder="Review note (optional)…"
            className="min-h-[64px] text-sm"
          />
          <div className="flex items-center gap-2">
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => onDecision?.(p.id, "approved", notes)}>
              <Check className="mr-1 h-4 w-4" /> Approve &amp; apply
            </Button>
            <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => onDecision?.(p.id, "rejected", notes)}>
              <X className="mr-1 h-4 w-4" /> Reject
            </Button>
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="h-3 w-3" /> filed {fmtDate(p.created_at)}
            </span>
          </div>
        </div>
      ) : (
        <div className="border-t pt-3 text-xs text-slate-500">
          {p.review.reviewer ? (
            <p>
              <span className="font-medium capitalize">{p.status}</span> by {detectedByLabel(p.review.reviewer)}
              {p.review.reviewed_at ? ` · ${fmtDate(p.review.reviewed_at)}` : ""}
              {p.review.notes ? <span className="mt-1 block text-slate-600">“{p.review.notes}”</span> : null}
            </p>
          ) : (
            <p className="capitalize">{p.status}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-700">{children}</dd>
    </div>
  );
}

function IntentBody({ intent }: { intent: Intent }) {
  switch (intent.type) {
    case "append_timeline_entry": {
      const e = intent.entry;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" /> {dateBoth(e.date, e.date_bs, e.date_ad_uncertain)}
          </div>
          <div className="text-sm font-medium text-slate-800">{e.title}</div>
          {e.description && <p className="text-sm text-slate-600">{e.description}</p>}
        </div>
      );
    }
    case "set_status":
      return (
        <div className="flex items-center gap-2 text-sm">
          <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs">{intent.from ?? "—"}</code>
          <ArrowRight className="h-4 w-4 text-slate-400" />
          <code className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-xs text-green-800">{intent.to}</code>
          <span className="text-xs text-slate-400">({intent.field})</span>
        </div>
      );
    case "link_material":
      return (
        <div className="space-y-1 text-sm">
          <div className="text-slate-700">
            Relation: <span className="font-medium">{intent.relation}</span>
          </div>
          <a href={intent.material} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-xs text-primary hover:underline">
            {shortIri(intent.material)} <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
      );
    case "raw_patch":
      return (
        <div>
          <div className="mb-1 flex items-center gap-1 text-xs text-slate-500">
            <FileJson className="h-3.5 w-3.5" /> RFC-6902 patch
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-2 font-mono text-[11px] leading-relaxed text-slate-100">
            {JSON.stringify(intent.patch, null, 2)}
          </pre>
        </div>
      );
  }
}
