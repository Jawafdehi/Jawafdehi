import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { getCaseHistory, type CaseStateChange } from "@/services/admin-api";
import { fmtDate } from "@/lib/casework-ui";
import { Badge } from "@/components/ui/badge";
import { History, Loader2 } from "lucide-react";

// F7 — case workflow history / author feedback loop. Shows who moved the case
// between states, when, and (crucially) any reason a moderator left when
// sending a submission back to draft or closing it. This is how a caseworker
// learns "your case was returned because X" without the reason being buried in
// the shared internal-notes field.
//
// Degrades quietly: if the backend has no /history/ endpoint yet,
// getCaseHistory returns [] and the panel renders nothing (no error, no empty
// box) so it's safe to ship ahead of the backend.

// Human phrasing for a transition, from the reader's perspective.
function describe(change: CaseStateChange, t: TFunction): string {
  const to = change.to_state;
  if (to === "IN_REVIEW") return t("admin.history.submitted");
  if (to === "PUBLISHED") return t("admin.history.published");
  if (to === "CLOSED") return t("admin.history.closed");
  if (to === "DRAFT") {
    // A revert from IN_REVIEW/PUBLISHED reads as "sent back"; the initial
    // draft creation isn't logged, so any → DRAFT here is a return.
    return t("admin.history.sentBack");
  }
  return t("admin.history.movedTo", { state: to });
}

// A returned/closed transition is the one an author most needs to see, so we
// give it a little visual weight (and always surface its reason).
function isReturn(change: CaseStateChange): boolean {
  return change.to_state === "DRAFT" || change.to_state === "CLOSED";
}

interface Props {
  slug: string;
  // Bumping this (e.g. after a transition) forces a refetch.
  refreshKey?: number;
}

export default function CaseHistoryPanel({ slug, refreshKey = 0 }: Props) {
  const { t } = useTranslation();
  const [changes, setChanges] = useState<CaseStateChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCaseHistory(slug)
      .then((rows) => {
        if (!cancelled) setChanges(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, refreshKey]);

  // Nothing to show (no history, or an older backend without the endpoint):
  // render nothing so the panel is invisible until there's something to say.
  if (!loading && changes.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border bg-white p-4">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{t("admin.history.title")}</span>
        {loading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
      <ol className="space-y-2">
        {changes.map((c) => (
          <li
            key={c.id}
            className={`rounded-md border px-3 py-2 text-sm ${
              isReturn(c) ? "border-amber-200 bg-amber-50" : "border-slate-100"
            }`}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium">{describe(c, t)}</span>
              {c.actor_name && (
                <span className="text-xs text-muted-foreground">
                  {t("admin.history.by", { name: c.actor_name })}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                · {fmtDate(c.created_at)}
              </span>
            </div>
            {c.reason && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                <Badge variant="secondary" className="mr-1 align-middle">
                  {t("admin.history.reason")}
                </Badge>
                {c.reason}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
