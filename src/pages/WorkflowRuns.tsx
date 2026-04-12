/**
 * WorkflowRuns — main page listing case workflow runs with filters.
 *
 * Route: /caseworker/workflow-runs
 * Auth:  requires caseworker JWT (redirects to login if unauthenticated)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCaseworkerAuth } from "@/context/CaseworkerAuthContext";
import { listWorkflowRuns } from "@/services/workflow-api";
import type { WorkflowRun, RunStatusFilter } from "@/types/workflow";
import { Header } from "@/components/Header";
import { WorkflowRunFilters } from "@/components/workflow/WorkflowRunFilters";
import { WorkflowRunCard } from "@/components/workflow/WorkflowRunCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, LogOut, RefreshCw } from "lucide-react";

const AUTO_REFRESH_MS = 30_000; // 30 seconds

const WorkflowRuns = () => {
  const { user, loading: authLoading, logout } = useCaseworkerAuth();
  const navigate = useNavigate();

  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [status, setStatus] = useState<RunStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/caseworker/login");
    }
  }, [authLoading, user, navigate]);

  // Fetch runs
  const fetchRuns = useCallback(async () => {
    try {
      setError(null);
      const data = await listWorkflowRuns(status, search);
      setRuns(data.results);
      setTotalCount(data.count);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load workflow runs");
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  // Initial load + refetch on filter change
  useEffect(() => {
    setLoading(true);
    fetchRuns();
  }, [fetchRuns]);

  // Auto-refresh
  useEffect(() => {
    timerRef.current = setInterval(() => {
      fetchRuns();
    }, AUTO_REFRESH_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchRuns]);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  // Actual search uses debounced value
  useEffect(() => {
    setLoading(true);
    listWorkflowRuns(status, debouncedSearch)
      .then((data) => {
        setRuns(data.results);
        setTotalCount(data.count);
        setError(null);
      })
      .catch((e: unknown) => {
        setError((e as Error).message ?? "Failed to load workflow runs");
      })
      .finally(() => setLoading(false));
  }, [status, debouncedSearch]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="sm" asChild className="p-1">
                <Link to="/caseworker/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="text-2xl font-bold text-foreground">
                Workflow Runs
              </h1>
            </div>
            <p className="text-sm text-muted-foreground ml-8">
              {totalCount} run{totalCount !== 1 ? "s" : ""} total
              {!loading && (
                <span className="text-xs ml-2 opacity-60">
                  (auto-refreshes every 30s)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchRuns();
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                navigate("/caseworker/login");
              }}
            >
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <WorkflowRunFilters
            status={status}
            search={search}
            onStatusChange={(s) => {
              setStatus(s);
              setLoading(true);
            }}
            onSearchChange={setSearch}
          />
        </div>

        {/* Content */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg font-medium text-muted-foreground">
              No workflow runs found
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {status !== "all"
                ? "Try changing the filter or clearing your search."
                : "Workflow runs will appear here once they are triggered from the backend."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <WorkflowRunCard key={run.run_id} run={run} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowRuns;
