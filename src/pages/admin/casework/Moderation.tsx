import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listCases,
  patchCase,
  adminErrorMessage,
  type PatchOp,
} from "@/services/admin-api";
import { replaceOp, type CaseState } from "@/lib/jawafdehi-forms";
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";
import { FormError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Check, Loader2, RefreshCw, Undo2, X } from "lucide-react";

type Row = Record<string, unknown>;
const str = (v: unknown): string => (v == null ? "" : String(v));

// F11 — moderation queue. The queue IS the set of cases in IN_REVIEW (plan §G;
// no intake model). Per-row: Approve → PUBLISHED, Reject → DRAFT, Dismiss →
// CLOSED, each via a state-transition PATCH; a reason is written to /notes in
// the same patch. Role-gated to admin/moderator (nav already scoped; the API is
// the authority regardless).
export default function Moderation() {
  const { isModerator } = useCaseworkAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listCases<Row>({ state: "IN_REVIEW", page_size: 100 });
      setRows(page.results ?? []);
    } catch (err) {
      setError(adminErrorMessage(err, "Failed to load the moderation queue"));
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch the queue for moderators. The nav link is already role-scoped and
  // the API re-checks on every transition, but a non-moderator who deep-links
  // here shouldn't even see the queue — so we gate the page below and skip load.
  useEffect(() => {
    if (isModerator) load();
  }, [load, isModerator]);

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
      // Write the reason to /notes in the same patch (plan §G2).
      if (reason) ops.push(replaceOp("/notes", reason));
      await patchCase(slug, ops);
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
    } finally {
      setBusySlug(null);
    }
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

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed bg-slate-50 px-3 py-6 text-center text-sm text-muted-foreground">
          Nothing awaiting review.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const slug = str(r.slug);
            const busy = busySlug === slug;
            return (
              <div key={slug} className="rounded-xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-slate-500">{slug}</div>
                    <div className="font-medium">{str(r.title) || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {str(r.case_type)}
                    </div>
                  </div>
                  <Link
                    to={`/admin/jawafdehi/cases/${slug}/edit`}
                    className="text-sm underline underline-offset-2"
                  >
                    Open
                  </Link>
                </div>

                <Input
                  value={reasons[slug] ?? ""}
                  onChange={(e) =>
                    setReasons((prev) => ({ ...prev, [slug]: e.target.value }))
                  }
                  placeholder="Reason (optional, saved to notes)"
                  className="mt-3"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy || !isModerator}
                    onClick={() => act(slug, "PUBLISHED", "approved")}
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
                    onClick={() => act(slug, "DRAFT", "sent back to draft")}
                  >
                    <Undo2 className="mr-1 h-4 w-4" />
                    Reject to draft
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy || !isModerator}
                    onClick={() => act(slug, "CLOSED", "dismissed")}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Dismiss
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
