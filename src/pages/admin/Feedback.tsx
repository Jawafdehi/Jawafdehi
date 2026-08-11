import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { listFeedback, feedbackErrorMessage } from "@/services/feedback-api";
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

  const load = useCallback(async () => {
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
      if (!mountedRef.current) return;
      setRows(data.results ?? []);
      setCount(data.count ?? 0);
      setHasNext(Boolean(data.next));
    } catch (err) {
      if (!mountedRef.current) return;
      setError(
        feedbackErrorMessage(
          err,
          t("admin.feedback.loadFailed", "Could not load feedback."),
        ),
      );
      setRows([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [page, status, type, search, t]);

  useEffect(() => {
    if (allowed) load();
  }, [load, allowed]);

  // Any filter change invalidates the current page number — page 3 of "all"
  // is not page 3 of "corruption reports".
  const resetTo = useCallback((apply: () => void) => {
    apply();
    setPage(1);
  }, []);

  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count || page * PAGE_SIZE);

  // Replace one row in place after a save, so the list doesn't jump or refetch.
  const onSaved = useCallback((updated: FeedbackSubmissionRow) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  const statusOptions = useMemo(
    () => FEEDBACK_STATUSES.map((s) => ({ value: s, label: statusLabel(s, t) })),
    [t],
  );
  const typeOptions = useMemo(
    () => FEEDBACK_TYPES.map((ft) => ({ value: ft, label: typeLabel(ft, t) })),
    [t],
  );

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
          onValueChange={(v) => resetTo(() => setStatus(v))}
        >
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>
              {t("admin.feedback.allStatuses", "All statuses")}
            </SelectItem>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={(v) => resetTo(() => setType(v))}>
          <SelectTrigger className="h-9 w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>
              {t("admin.feedback.allTypes", "All types")}
            </SelectItem>
            {typeOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            resetTo(() => setSearch(query.trim()));
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
          {t("admin.feedback.itemCount", { count })}
        </span>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed bg-slate-50 px-3 py-6 text-center text-sm text-muted-foreground">
          {t("admin.feedback.empty", "Nothing to show.")}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <FeedbackCard key={row.id} row={row} onSaved={onSaved} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {from}–{to} of {count.toLocaleString()}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("admin.common.previous", "Previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("admin.common.next", "Next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
