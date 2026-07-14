import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CaseworkLayout from "@/components/CaseworkLayout";
import { listReviewsGrouped, regradeAll, apiErrorMessage } from "@/services/casework-api";
import type { GroupedCase, ReviewListItem } from "@/types/casework";
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CaseSearchCombobox } from "@/components/casework/CaseSearchCombobox";
import { dispositionColor, statusColor, fmtDate, scoreBand } from "@/lib/casework-ui";
import { Loader2, Repeat, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

// Merge freshly-fetched case groups into the accumulated list: replace existing
// cases in place (by slug) and add new ones, keeping most-recently-active first
// (latest id desc mirrors the backend's ordering). Used so polling can refresh
// page 1 without discarding cases already loaded via "Load more".
function mergeGroups(prev: GroupedCase[], fresh: GroupedCase[]): GroupedCase[] {
  const bySlug = new Map(prev.map((g) => [g.slug, g]));
  for (const g of fresh) bySlug.set(g.slug, g);
  return [...bySlug.values()].sort((a, b) => (b.latest?.id ?? 0) - (a.latest?.id ?? 0));
}

export default function CaseworkReviews() {
  const navigate = useNavigate();
  const { isModerator } = useCaseworkAuth();
  const [groups, setGroups] = useState<GroupedCase[]>([]);
  const [regrading, setRegrading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [nextPage, setNextPage] = useState(2);
  const [err, setErr] = useState("");
  const [regradeErr, setRegradeErr] = useState("");

  // Open a case's review page. A review is NEVER started from here — searching
  // or clicking a case just navigates; the "Run review" action lives on the case
  // page. Carry the title so a never-reviewed case shows it before its first run.
  const openCase = useCallback(
    (slug: string, title?: string) =>
      navigate(`/admin/reviews/case/${encodeURIComponent(slug)}`, { state: { title } }),
    [navigate]
  );

  // Load the first page of cases. When called by polling (isPoll), only merge the
  // fresh page-1 groups — don't touch pagination/loading/error state, so a
  // background refresh can't reset the user's "Load more" progress.
  const loadFirst = useCallback(async (isPoll = false) => {
    try {
      const page = await listReviewsGrouped({ page: 1, page_size: PAGE_SIZE });
      if (!isPoll) {
        setCount(page.count);
        setHasNext(Boolean(page.next));
        setNextPage(2);
      }
      setGroups((prev) => (prev.length ? mergeGroups(prev, page.results) : page.results));
    } catch {
      if (!isPoll) setErr("Failed to load reviews.");
    } finally {
      if (!isPoll) setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const page = await listReviewsGrouped({ page: nextPage, page_size: PAGE_SIZE });
      setCount(page.count);
      setHasNext(Boolean(page.next));
      setNextPage((p) => p + 1);
      setGroups((prev) => mergeGroups(prev, page.results));
    } catch {
      setErr("Failed to load more reviews.");
    } finally {
      setLoadingMore(false);
    }
  }, [nextPage]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  // Poll the first page while a case on it has an in-progress latest run. Scoped
  // to the newest PAGE_SIZE cases (where freshly submitted reviews land) since
  // polling only refreshes page 1.
  useEffect(() => {
    const anyRunning = groups
      .slice(0, PAGE_SIZE)
      .some((g) => g.latest?.status === "pending" || g.latest?.status === "running");
    if (!anyRunning) return;
    const t = setInterval(() => loadFirst(true), 3000);
    return () => clearInterval(t);
  }, [groups, loadFirst]);

  // F9 — regrade all reviewable cases against the current rules (admin/
  // moderator). POSTs /api/casework/reviews/regrade-all/; refresh page 1 so the
  // newly-queued runs appear.
  const onRegradeAll = async () => {
    setRegrading(true);
    setRegradeErr("");
    try {
      const res = await regradeAll();
      toast({
        title: "Regrade queued",
        description: `${res.regrading} case${res.regrading === 1 ? "" : "s"} queued for regrade.`,
      });
      await loadFirst(true);
    } catch (e: unknown) {
      setRegradeErr(apiErrorMessage(e, "Regrade-all failed."));
    } finally {
      setRegrading(false);
    }
  };

  return (
    <CaseworkLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Case reviews</h1>
            <p className="text-sm text-muted-foreground">
              Search a corruption case to open its review page.
            </p>
          </div>
          {isModerator && (
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={regrading}
                title="Queue a fresh review for every reviewable case against the current rules"
                onClick={onRegradeAll}
              >
                {regrading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Repeat className="mr-1 h-4 w-4" />
                )}
                Regrade all
              </Button>
              {regradeErr && <p className="text-sm text-red-600 text-right">{regradeErr}</p>}
            </div>
          )}
        </div>

        <div className="max-w-xl">
          <CaseSearchCombobox onPick={openCase} />
          {err && <p className="text-sm text-red-600 mt-1">{err}</p>}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reviews…
          </div>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reviews yet. Search a case above to open it and run one.
          </p>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <CaseRow
                key={g.slug}
                group={g}
                onOpen={() => openCase(g.slug, g.case_title)}
              />
            ))}

            {hasNext && (
              <div className="flex justify-center pt-1">
                <Button variant="outline" size="sm" disabled={loadingMore} onClick={loadMore}>
                  {loadingMore ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                  Load more
                </Button>
              </div>
            )}
            <p className="text-center text-xs text-slate-400">
              Showing {groups.length} of {count} case{count === 1 ? "" : "s"}
            </p>
          </div>
        )}
      </div>
    </CaseworkLayout>
  );
}

// One case as a single compact row: title/slug + its LATEST run's score,
// disposition, status and time. Clicking opens the per-case review page, which
// hosts the run history and the full breakdown.
function CaseRow({ group: g, onOpen }: { group: GroupedCase; onOpen: () => void }) {
  const latest: ReviewListItem | undefined = g.latest;
  const runs = g.executions?.length ?? 0;
  const inProgress = latest?.status === "pending" || latest?.status === "running";
  return (
    <div
      className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer"
      onClick={onOpen}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{g.case_title || g.slug}</div>
        <div className="font-mono text-xs text-slate-400 truncate">{g.slug}</div>
      </div>

      {latest && (
        <>
          <span className="text-xs text-slate-400 whitespace-nowrap hidden md:inline">
            🕓 {fmtDate(latest.completed_at || latest.created_at)}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(latest.status)}`}>
            {inProgress ? latest.stage || latest.status : latest.status}
          </span>
          {latest.overall_score != null && (
            <span
              className="text-base font-bold w-9 text-right"
              style={{ color: scoreBand(latest.overall_score) }}
            >
              {latest.overall_score}
            </span>
          )}
          {latest.disposition && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${dispositionColor(latest.disposition)}`}
            >
              {latest.disposition}
            </span>
          )}
        </>
      )}

      <span className="text-xs text-slate-400 whitespace-nowrap hidden lg:inline w-14 text-right">
        {runs} run{runs === 1 ? "" : "s"}
      </span>
      <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
    </div>
  );
}
