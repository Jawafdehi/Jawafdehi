import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { listCaseAuthorCandidates } from "@/services/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ADDatePicker from "@/components/admin/ADDatePicker";

export interface AuthorRow {
  user_id: number;
  /** Display only — resolved from the author's profile, never written here. */
  display_name: string;
}

export interface EditHistoryRow {
  date: string;
  remarks: string;
}

interface Props {
  authors: AuthorRow[];
  onAuthorsChange: (rows: AuthorRow[]) => void;
  publishDate: string;
  onPublishDateChange: (value: string) => void;
  editHistory: EditHistoryRow[];
  onEditHistoryChange: (rows: EditHistoryRow[]) => void;
}

// The public byline editor: who is credited, when the case first went live, and
// the curated edit history. Replaces the free-text `public_notes`, which drifted
// into four spellings of "summarized" and a mix of BS and AD dates.
//
// Author order is meaningful (it is the order the byline reads), so rows move
// with explicit up/down controls rather than sorting themselves.
export default function CaseBylineEditor({
  authors,
  onAuthorsChange,
  publishDate,
  onPublishDateChange,
  editHistory,
  onEditHistoryChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // The roster is server state, so it goes through React Query like every other
  // read in the app (mutations here are still hand-rolled — see Moderation.tsx).
  const { data: candidates = [], isError: loadError } = useQuery({
    queryKey: ["case-author-candidates"],
    queryFn: () => listCaseAuthorCandidates(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // An account already credited on this case must not be offered again — the
  // backend enforces one credit per user per case.
  const credited = useMemo(
    () => new Set(authors.map((a) => a.user_id)),
    [authors],
  );
  const selectable = candidates.filter((c) => !credited.has(c.id));

  const addAuthor = (id: string) => {
    const picked = candidates.find((c) => String(c.id) === id);
    if (!picked || credited.has(picked.id)) return;
    onAuthorsChange([
      ...authors,
      { user_id: picked.id, display_name: picked.display_name },
    ]);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= authors.length) return;
    const next = [...authors];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    onAuthorsChange(next);
  };

  const setHistory = (i: number, patch: Partial<EditHistoryRow>) =>
    onEditHistoryChange(
      editHistory.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );

  return (
    <div className="space-y-6 rounded-md border p-4">
      <div>
        <h3 className="text-sm font-semibold">{t("admin.caseForm.bylineHeading")}</h3>
        <p className="text-xs text-muted-foreground">
          {t("admin.caseForm.bylineHelp")}
        </p>
      </div>

      {/* Authors */}
      <div className="space-y-2">
        <Label>{t("admin.caseForm.labelAuthors")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("admin.caseForm.authorsHelp")}
        </p>

        {authors.length > 0 && (
          <div className="space-y-2">
            {authors.map((author, i) => (
              <div key={author.user_id} className="flex items-center gap-2">
                <span
                  className="w-6 shrink-0 select-none text-right text-sm tabular-nums text-muted-foreground"
                  aria-hidden
                >
                  {i + 1}.
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {author.display_name}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  title={t("admin.caseForm.authorMoveUp")}
                  aria-label={t("admin.caseForm.authorMoveUp")}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={i === authors.length - 1}
                  onClick={() => move(i, i + 1)}
                  title={t("admin.caseForm.authorMoveDown")}
                  aria-label={t("admin.caseForm.authorMoveDown")}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    onAuthorsChange(authors.filter((_, idx) => idx !== i))
                  }
                  title={t("admin.caseForm.authorRemove")}
                  aria-label={t("admin.caseForm.authorRemove")}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {loadError ? (
          <p className="text-xs text-danger">{t("admin.caseForm.authorsLoadFailed")}</p>
        ) : (
          <Select value="" onValueChange={addAuthor}>
            <SelectTrigger
              className="max-w-sm"
              aria-label={t("admin.caseForm.authorAdd")}
              disabled={selectable.length === 0}
            >
              <SelectValue placeholder={t("admin.caseForm.authorAdd")} />
            </SelectTrigger>
            <SelectContent>
              {selectable.map((candidate) => (
                <SelectItem key={candidate.id} value={String(candidate.id)}>
                  {candidate.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* First published */}
      <div className="space-y-1">
        <Label>{t("admin.caseForm.labelPublishDate")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("admin.caseForm.publishDateHelp")}
        </p>
        <ADDatePicker
          value={publishDate}
          onChange={onPublishDateChange}
          ariaLabel={t("admin.caseForm.labelPublishDate")}
        />
      </div>

      {/* Edit history */}
      <div className="space-y-2">
        <Label>{t("admin.caseForm.labelEditHistory")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("admin.caseForm.editHistoryHelp")}
        </p>

        {editHistory.length > 0 && (
          <div className="space-y-2">
            {editHistory.map((row, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-40 shrink-0">
                  <ADDatePicker
                    value={row.date}
                    onChange={(v) => setHistory(i, { date: v })}
                    ariaLabel={t("admin.caseForm.editHistoryDateLabel", {
                      number: i + 1,
                    })}
                  />
                </div>
                <Input
                  value={row.remarks}
                  onChange={(e) => setHistory(i, { remarks: e.target.value })}
                  aria-label={t("admin.caseForm.editHistoryRemarksLabel", {
                    number: i + 1,
                  })}
                  placeholder={t("admin.caseForm.editHistoryRemarksPlaceholder")}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    onEditHistoryChange(editHistory.filter((_, idx) => idx !== i))
                  }
                  title={t("admin.caseForm.editHistoryRemove")}
                  aria-label={t("admin.caseForm.editHistoryRemove")}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onEditHistoryChange([...editHistory, { date: "", remarks: "" }])}
        >
          <Plus className="mr-1 h-4 w-4" /> {t("admin.caseForm.editHistoryAdd")}
        </Button>
      </div>
    </div>
  );
}
