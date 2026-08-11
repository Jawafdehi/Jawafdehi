import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { listFeedback } from "@/services/feedback-api";
import { extractErrorMessage } from "@/services/http";
import {
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  type FeedbackSubmissionRow,
} from "@/types/feedback";
import { statusLabel, typeLabel } from "@/lib/feedback-ui";
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";
import { FormError } from "@/components/admin/FormError";
import FeedbackCard from "@/components/admin/feedback/FeedbackCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, Search } from "lucide-react";

const ALL = "__all__";
const PAGE_SIZE = 20;

// The staff queue for everything submitted through the public feedback form and
// the /report corruption-report form. Replaces Django admin as the place triage
// happens (that page is now view-only).
//
// Server-side filter/search/pagination rather than the client-side filtering the
// moderation queue uses: that one loads at most 100 in-review cases, while this
// grows without bound — every visitor who ever filled in the form is a row here.
export default function Feedback() {
  const { t } = useTranslation();
  // `isModerator` is the context's precomputed content-staff check (the same
  // lib/roles predicate the sidebar uses), which mirrors the backend's
  // IsFeedbackTriager. The API is the authority; this only keeps the UI honest.
  const { isModerator: allowed } = useCaseworkAuth();

  const [rows, setRows] = useState<FeedbackSubmissionRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  // `query` is what's typed; `search` is what's been submitted. Keeping them
  // apart means each keystroke isn't a request.
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Monotonic request id. The filter Selects stay enabled while a fetch is in
  // flight (disabling them makes the page feel stuck), so two requests can
  // overlap and the slower one can land last — applying a result set that
  // doesn't match the controls the user is now looking at. Only the newest
  // request may write state.
  const reqIdRef = useRef(0);

  // `t` is deliberately NOT a dependency. react-i18next hands out a new `t`
  // identity on every language change, which would make this callback — and so
  // the effect below — re-run and refetch the whole queue just because someone
  // toggled EN/NE. Read the translation through a ref instead.
  const tRef = useRef(t);
  tRef.current = t;

  const load = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await listFeedback({
        page,
        page_size: PAGE_SIZE,
        ...(status !== ALL ? { status } : {}),
        ...(type !== ALL ? { feedback_type: type } : {}),
        ...(search ? { search } : {}),
      });
      if (!mountedRef.current || reqId !== reqIdRef.current) return;
      setRows(data.results ?? []);
      setCount(data.count ?? 0);
      setHasNext(Boolean(data.next));
    } catch (err) {
      if (!mountedRef.current || reqId !== reqIdRef.current) return;
      setError(
        extractErrorMessage(
          err,
          tRef.current("admin.feedback.loadFailed", "Could not load feedback."),
        ),
      );
      // Clear the counters too — leaving them would render "1–20 of 137" and an
      // enabled Next button under an empty list and an error banner.
      setRows([]);
      setCount(0);
      setHasNext(false);
    } finally {
      if (mountedRef.current && reqId === reqIdRef.current) setLoading(false);
    }
  }, [page, status, type, search]);

  useEffect(() => {
    if (allowed) load();
  }, [load, allowed]);

  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  // NOT `count || page * PAGE_SIZE` — count is legitimately 0 on an empty
  // queue, and the falsy fallback rendered "0–20 of 0" under "Nothing to show."
  const to = Math.min(page * PAGE_SIZE, count);

  // Replace one row in place after a save, so the list doesn't jump or refetch.
  const onSaved = useCallback((updated: FeedbackSubmissionRow) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  if (!allowed) {
    return (
      <FormError
        message={t(
          "admin.feedback.noPermission",
          "Feedback is available to caseworkers and administrators.",
        )}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("admin.feedback.title", "Feedback")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "admin.feedback.subtitle",
              "Messages and corruption reports submitted through the website.",
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("admin.common.refresh", "Refresh")}
        </Button>
      </div>

      <FormError message={error} />

      <p className="rounded-md border border-dashed bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
        {t(
          "admin.feedback.privacyNotice",
          "Reporters' contact details, IP addresses and attachments are not shown here. An administrator can retrieve them if a report needs following up.",
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>
              {t("admin.feedback.allStatuses", "All statuses")}
            </SelectItem>
            {FEEDBACK_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={type}
          onValueChange={(v) => {
            setType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>
              {t("admin.feedback.allTypes", "All types")}
            </SelectItem>
            {FEEDBACK_TYPES.map((ft) => (
              <SelectItem key={ft} value={ft}>
                {typeLabel(ft, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(query.trim());
            setPage(1);
          }}
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.feedback.searchPlaceholder", "Search")}
            className="h-9 w-[220px]"
            aria-label={t("admin.feedback.searchPlaceholder", "Search")}
          />
          <Button type="submit" variant="outline" size="sm" disabled={loading}>
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <span className="ml-auto text-xs text-muted-foreground">
          {t("admin.feedback.itemCount", {
            count,
            defaultValue: "{{count}} submissions",
            defaultValue_one: "{{count}} submission",
          })}
        </span>
      </div>

      {/* Only blank the list on the FIRST load. Swapping the rows for a spinner
          on every refetch would unmount each FeedbackCard, discarding any triage
          note typed but not yet saved. */}
      {loading && rows.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed bg-slate-50 px-3 py-6 text-center text-sm text-muted-foreground">
          {t("admin.feedback.empty", "Nothing to show.")}
        </p>
      ) : (
        <div className={loading ? "space-y-3 opacity-60" : "space-y-3"}>
          {rows.map((row) => (
            <FeedbackCard key={row.id} row={row} onSaved={onSaved} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {t("admin.feedback.range", "{{from}}–{{to}} of {{total}}", {
            from,
            to,
            total: count,
          })}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("pagination.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("pagination.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
