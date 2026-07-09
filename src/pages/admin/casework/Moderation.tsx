import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  listCases,
  patchCase,
  adminErrorMessage,
  type PatchOp,
} from "@/services/admin-api";
import { listReviewsGrouped } from "@/services/casework-api";
import type { Disposition } from "@/types/casework";
import { replaceOp, type CaseState } from "@/lib/jawafdehi-forms";
import { scoreBand, dispositionColor } from "@/lib/casework-ui";
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";
import { FormError } from "@/components/admin/FormError";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  Undo2,
  X,
} from "lucide-react";

type Row = Record<string, unknown>;
const str = (v: unknown): string => (v == null ? "" : String(v));

type ReviewBadge = { score: number | null; disposition: Disposition | null };
type SortDir = "oldest" | "newest";

// Compact relative age from an ISO timestamp: "just now", "3h", "5d", "2mo".
function relativeAge(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  if (diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

// The timestamp a case entered its current (IN_REVIEW) state. Prefer the
// versionInfo stamp (the moment it was submitted/reverted), then updated_at,
// then created_at.
function ageTimestamp(r: Row): string {
  const vi = r.versionInfo;
  if (vi && typeof vi === "object") {
    const dt = (vi as Record<string, unknown>).datetime;
    if (dt) return str(dt);
  }
  return str(r.updated_at) || str(r.created_at);
}

const MS_PER_DAY = 86400000;

// Age color: neutral < 3d, amber 3–7d, red > 7d.
function ageColor(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "text-muted-foreground";
  const days = (Date.now() - then) / MS_PER_DAY;
  if (days > 7) return "text-red-600 font-medium";
  if (days > 3) return "text-amber-600 font-medium";
  return "text-muted-foreground";
}

function truncate(s: string, n = 300): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

// F11 — moderation queue. The queue IS the set of cases in IN_REVIEW (plan §G;
// no intake model). Per-row: Approve → PUBLISHED, Reject → DRAFT, Dismiss →
// CLOSED, each via a state-transition PATCH; the moderator's reason rides the
// X-Transition-Reason header so it lands in the case history (author feedback,
// F7) instead of the shared internal notes. Role-gated to admin/moderator (nav
// already scoped; the API is the authority regardless). Triage affordances
// (age, sort, type filter, inline preview, AI-review badge) sit around that core.
export default function Moderation() {
  const { isModerator } = useCaseworkAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<Map<string, ReviewBadge>>(new Map());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortDir, setSortDir] = useState<SortDir>("oldest");
  const [typeFilter, setTypeFilter] = useState<string>("__all__");

  // load() is called from an effect AND the Refresh button, so a component-
  // lifetime ref (not an effect-scoped flag) guards its async setState against a
  // resolve-after-unmount when the moderator navigates away mid-request.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listCases<Row>({ state: "IN_REVIEW", page_size: 100 });
      if (!mountedRef.current) return;
      setRows(page.results ?? []);
      setTotal(page.count ?? (page.results?.length ?? 0));
    } catch (err) {
      if (!mountedRef.current) return;
      setError(adminErrorMessage(err, "Failed to load the moderation queue"));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // AI-review badges are best-effort: a failure just means no badges.
    try {
      const grouped = await listReviewsGrouped({ page_size: 200 });
      if (!mountedRef.current) return;
      const map = new Map<string, ReviewBadge>();
      for (const g of grouped.results ?? []) {
        if (!g.slug || !g.latest) continue;
        map.set(g.slug, {
          score: g.latest.overall_score,
          disposition: g.latest.disposition,
        });
      }
      setReviews(map);
    } catch {
      if (!mountedRef.current) return;
      // non-fatal — leave the badge map empty
      setReviews(new Map());
    }
  }, []);

  // Only fetch the queue for moderators. The nav link is already role-scoped and
  // the API re-checks on every transition, but a non-moderator who deep-links
  // here shouldn't even see the queue — so we gate the page below and skip load.
  useEffect(() => {
    if (isModerator) load();
  }, [load, isModerator]);

  // Distinct case types present in the loaded rows (for the type filter).
  const caseTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const t = str(r.case_type);
      if (t) set.add(t);
    }
    return Array.from(set).sort();
  }, [rows]);

  // Client-side filter + sort over the already-loaded rows.
  const visibleRows = useMemo(() => {
    const filtered =
      typeFilter === "__all__"
        ? rows
        : rows.filter((r) => str(r.case_type) === typeFilter);
    const withTs = filtered.map((r) => ({
      r,
      ts: new Date(ageTimestamp(r)).getTime(),
    }));
    withTs.sort((a, b) => {
      const av = Number.isNaN(a.ts) ? 0 : a.ts;
      const bv = Number.isNaN(b.ts) ? 0 : b.ts;
      return sortDir === "oldest" ? av - bv : bv - av;
    });
    return withTs.map((x) => x.r);
  }, [rows, typeFilter, sortDir]);

  if (!isModerator) {
    return (
      <FormError message="You don't have permission to access the moderation queue." />
    );
  }

  const act = async (slug: string, to: CaseState, verb: string) => {
    setBusySlug(slug);
    setError(null);
    try {
      const ops: PatchOp[] = [replaceOp("/state", to)];
      const reason = (reasons[slug] ?? "").trim();
      // The moderator's reason travels via X-Transition-Reason so it's recorded
      // in the case's workflow history and shown to the author (F7 feedback
      // loop) — rather than being overloaded into the shared internal /notes
      // field, which mixed return reasons with authoring notes.
      await patchCase(slug, ops, { transitionReason: reason || undefined });
      toast({ title: `Case ${verb}`, description: slug });
      // Drop the case from the queue (it left IN_REVIEW).
      setRows((prev) => prev.filter((r) => str(r.slug) !== slug));
      setReasons((prev) => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
    } catch (err) {
      setError(adminErrorMessage(err, `Failed to ${verb.toLowerCase()} case`));
      // Rethrow so a ConfirmButton-wrapped action (Dismiss) keeps its dialog
      // open on failure. Plain-button callers (Approve / Send back) use
      // actSafe() to avoid an unhandled rejection.
      throw err;
    } finally {
      setBusySlug(null);
    }
  };

  // Fire-and-forget wrapper for the non-confirmed buttons: the error is already
  // surfaced via setError inside act(), so we just swallow the rejection here.
  const actSafe = (slug: string, to: CaseState, verb: string) => {
    void act(slug, to, verb).catch(() => {});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Moderation</h1>
          <p className="text-sm text-muted-foreground">
            Cases submitted for review (IN_REVIEW). Approve to publish, send back
            to draft, or dismiss (close). Optionally record a reason.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <FormError message={error} />

      {!loading && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All types</SelectItem>
              {caseTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortDir}
            onValueChange={(v) => setSortDir(v as SortDir)}
          >
            <SelectTrigger className="h-9 w-[190px]">
              <ArrowUpDown className="mr-1 h-4 w-4 opacity-60" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
            </SelectContent>
          </Select>

          <span className="ml-auto text-xs text-muted-foreground">
            {total > rows.length
              ? `Showing ${rows.length} of ${total}`
              : `${visibleRows.length} case${visibleRows.length === 1 ? "" : "s"}`}
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed bg-slate-50 px-3 py-6 text-center text-sm text-muted-foreground">
          Nothing awaiting review.
        </p>
      ) : visibleRows.length === 0 ? (
        <p className="rounded-md border border-dashed bg-slate-50 px-3 py-6 text-center text-sm text-muted-foreground">
          No cases match the current filter.
        </p>
      ) : (
        <div className="space-y-3">
          {visibleRows.map((r) => {
            const slug = str(r.slug);
            const busy = busySlug === slug;
            const ts = ageTimestamp(r);
            const review = reviews.get(slug);
            const isOpen = !!expanded[slug];
            const allegations = Array.isArray(r.key_allegations)
              ? (r.key_allegations as unknown[])
              : [];
            const entities = Array.isArray(r.entities)
              ? (r.entities as Record<string, unknown>[])
              : [];
            const evidence = Array.isArray(r.evidence)
              ? (r.evidence as unknown[])
              : [];
            const description = str(r.description);
            return (
              <div key={slug} className="rounded-xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [slug]: !prev[slug] }))
                      }
                      className="mt-0.5 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label={isOpen ? "Collapse preview" : "Expand preview"}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-slate-500">{slug}</div>
                      <div className="font-medium">{str(r.title) || "—"}</div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{str(r.case_type)}</span>
                        {ts && (
                          <span className={`inline-flex items-center gap-1 ${ageColor(ts)}`}>
                            <Clock className="h-3 w-3" />
                            {relativeAge(ts)}
                          </span>
                        )}
                        {review ? (
                          <Link
                            to="/admin/reviews"
                            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${dispositionColor(review.disposition)}`}
                            title="View AI review"
                          >
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: scoreBand(review.score) }}
                            />
                            {review.score == null ? "—" : review.score}
                            {review.disposition ? ` · ${review.disposition}` : ""}
                          </Link>
                        ) : (
                          <span className="text-slate-400">no review</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/admin/jawafdehi/cases/${slug}/edit`}
                    className="shrink-0 text-sm underline underline-offset-2"
                  >
                    Open
                  </Link>
                </div>

                {isOpen && (
                  <div className="mt-3 space-y-2 rounded-lg border bg-slate-50 p-3 text-sm">
                    <div>
                      <div className="text-xs font-semibold uppercase text-slate-500">
                        Description
                      </div>
                      <p className="whitespace-pre-wrap text-slate-700">
                        {description ? truncate(description) : "—"}
                      </p>
                    </div>
                    {allegations.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold uppercase text-slate-500">
                          Key allegations
                        </div>
                        <ul className="list-disc pl-5 text-slate-700">
                          {allegations.map((a, i) => (
                            <li key={i}>{str(a)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {entities.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold uppercase text-slate-500">
                          Entities
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {entities.map((e, i) => (
                            <span
                              key={i}
                              className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-slate-600 ring-1 ring-slate-200"
                            >
                              {str(e.name) || str(e.nes_id) || str(e.id) || "entity"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-slate-500">
                      Evidence: {evidence.length}
                    </div>
                  </div>
                )}

                <Input
                  value={reasons[slug] ?? ""}
                  onChange={(e) =>
                    setReasons((prev) => ({ ...prev, [slug]: e.target.value }))
                  }
                  placeholder="Reason (optional — shown to the author in history)"
                  className="mt-3"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy || !isModerator}
                    onClick={() => actSafe(slug, "PUBLISHED", "approved")}
                  >
                    {busy ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-4 w-4" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || !isModerator}
                    onClick={() => actSafe(slug, "DRAFT", "sent back to draft")}
                  >
                    <Undo2 className="mr-1 h-4 w-4" />
                    Send back to draft
                  </Button>
                  <ConfirmButton
                    size="sm"
                    variant="destructive"
                    disabled={busy || !isModerator}
                    title="Dismiss this submission?"
                    description="Dismissing closes the case and removes it from the moderation queue. You can reopen it as a draft later. The reason you entered (if any) is recorded in the case history."
                    confirmLabel="Dismiss"
                    onConfirm={() => act(slug, "CLOSED", "dismissed")}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Dismiss
                  </ConfirmButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
