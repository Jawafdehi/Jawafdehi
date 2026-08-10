import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  if (days > 7) return "text-danger font-medium";
  if (days > 3) return "text-alert-strong font-medium";
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
  const { t } = useTranslation();
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
      setError(adminErrorMessage(err, t("admin.moderation.loadFailed")));
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
  }, [t]);

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
    return <FormError message={t("admin.moderation.noPermission")} />;
  }

  // `verbKey` is one of approved | sentBack | dismissed — each has its own
  // complete success/failure sentence (`{verbKey}Success` / `{verbKey}Failure`)
  // rather than an interpolated verb, so both English and Nepali stay
  // grammatical (no "Failed to approved case").
  const act = async (slug: string, to: CaseState, verbKey: string) => {
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
      toast({
        title: t(`admin.moderation.${verbKey}Success`),
        description: slug,
      });
      // Drop the case from the queue (it left IN_REVIEW).
      setRows((prev) => prev.filter((r) => str(r.slug) !== slug));
      setReasons((prev) => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
    } catch (err) {
      setError(
        adminErrorMessage(err, t(`admin.moderation.${verbKey}Failure`)),
      );
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
  const actSafe = (slug: string, to: CaseState, verbKey: string) => {
    void act(slug, to, verbKey).catch(() => {});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("admin.moderation.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("admin.moderation.subtitle")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("admin.common.refresh")}
        </Button>
      </div>

      <FormError message={error} />

      {!loading && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder={t("admin.moderation.allTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">
                {t("admin.moderation.allTypes")}
              </SelectItem>
              {caseTypes.map((ct) => (
                <SelectItem key={ct} value={ct}>
                  {ct}
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
              <SelectItem value="oldest">
                {t("admin.moderation.oldestFirst")}
              </SelectItem>
              <SelectItem value="newest">
                {t("admin.moderation.newestFirst")}
              </SelectItem>
            </SelectContent>
          </Select>

          <span className="ml-auto text-xs text-muted-foreground">
            {total > rows.length
              ? t("admin.moderation.showingOf", {
                  count: rows.length,
                  total,
                })
              : t("admin.moderation.caseCount", { count: visibleRows.length })}
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
          {t("admin.moderation.nothingAwaiting")}
        </p>
      ) : visibleRows.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
          {t("admin.moderation.noneMatchFilter")}
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
                      className="mt-0.5 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={
                        isOpen
                          ? t("admin.moderation.collapsePreview")
                          : t("admin.moderation.expandPreview")
                      }
                      aria-expanded={isOpen}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-muted-foreground">{slug}</div>
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
                            title={t("admin.moderation.viewReview")}
                          >
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: scoreBand(review.score) }}
                            />
                            {review.score == null ? "—" : review.score}
                            {review.disposition ? ` · ${review.disposition}` : ""}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">
                            {t("admin.moderation.noReview")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/admin/jawafdehi/cases/${slug}/edit`}
                    className="shrink-0 text-sm underline underline-offset-2"
                  >
                    {t("admin.common.open")}
                  </Link>
                </div>

                {isOpen && (
                  <div className="mt-3 space-y-2 rounded-lg border bg-muted p-3 text-sm">
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        {t("admin.moderation.description")}
                      </div>
                      <p className="whitespace-pre-wrap text-foreground">
                        {description ? truncate(description) : "—"}
                      </p>
                    </div>
                    {allegations.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold uppercase text-muted-foreground">
                          {t("admin.moderation.keyAllegations")}
                        </div>
                        <ul className="list-disc pl-5 text-foreground">
                          {allegations.map((a, i) => (
                            <li key={i}>{str(a)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {entities.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold uppercase text-muted-foreground">
                          {t("admin.moderation.entities")}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {entities.map((e, i) => (
                            <span
                              key={i}
                              className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground ring-1 ring-border"
                            >
                              {str(e.name) || str(e.nes_id) || str(e.id) || "entity"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {t("admin.moderation.evidence", { count: evidence.length })}
                    </div>
                  </div>
                )}

                <Input
                  value={reasons[slug] ?? ""}
                  onChange={(e) =>
                    setReasons((prev) => ({ ...prev, [slug]: e.target.value }))
                  }
                  placeholder={t("admin.moderation.reasonPlaceholder")}
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
                    {t("admin.moderation.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || !isModerator}
                    onClick={() => actSafe(slug, "DRAFT", "sentBack")}
                  >
                    <Undo2 className="mr-1 h-4 w-4" />
                    {t("admin.moderation.sendBack")}
                  </Button>
                  <ConfirmButton
                    size="sm"
                    variant="destructive"
                    disabled={busy || !isModerator}
                    title={t("admin.moderation.dismissConfirmTitle")}
                    description={t("admin.moderation.dismissConfirmBody")}
                    confirmLabel={t("admin.moderation.dismiss")}
                    onConfirm={() => act(slug, "CLOSED", "dismissed")}
                  >
                    <X className="mr-1 h-4 w-4" />
                    {t("admin.moderation.dismiss")}
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
