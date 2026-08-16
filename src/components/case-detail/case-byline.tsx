import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import type { CaseAuthorCredit, CaseEditHistoryEntry } from "@/types/jds";
import { formatDateForLanguage } from "@/utils/date";
import { AuthorCard } from "@/components/case-detail/author-card";

interface CaseBylineProps {
  authors?: CaseAuthorCredit[] | null;
  publishDate?: string | null;
  editHistory?: CaseEditHistoryEntry[] | null;
  /** DEPRECATED free-text byline, rendered only when there are no authors. */
  markdown?: string | null;
}

// The public byline: who documented the case (as cards), when it first went
// live, and the caseworker-curated list of edits since.
//
// A case with no structured authors falls back to the DEPRECATED free-text
// `public_notes`, which is how the cases written before this existed keep their
// byline until they are backfilled. That path stays markdown-only (no raw HTML)
// so a hand-written byline can't inject markup.
export function CaseByline({
  authors,
  publishDate,
  editHistory,
  markdown,
}: Readonly<CaseBylineProps>) {
  const { t, i18n } = useTranslation();

  const credits = (authors ?? []).filter((author) => author.display_name?.trim());
  const history = (editHistory ?? []).filter((entry) => entry.remarks?.trim());

  if (credits.length === 0) {
    const text = markdown?.trim();
    if (!text) return null;

    return (
      <div
        className="case-byline text-sm text-muted-foreground [&_a]:text-primary [&_a]:hover:underline [&_p]:m-0 [&_p+p]:mt-1"
        data-testid="case-byline"
      >
        <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
      </div>
    );
  }

  const published = publishDate
    ? formatDateForLanguage(publishDate, "PP", null, i18n.language)
    : null;

  return (
    <div className="case-byline text-sm text-muted-foreground" data-testid="case-byline">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary/60">
        {t("caseDetail.byline.documentedByLabel")}
      </p>

      <div
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
        data-testid="case-byline-authors"
      >
        {credits.map((author) => (
          <AuthorCard
            key={author.slug || author.display_name}
            author={author}
            className="sm:min-w-[14rem] sm:flex-1"
          />
        ))}
      </div>

      {published && (
        <p className="m-0 mt-2" data-testid="case-byline-published">
          {t("caseDetail.byline.firstPublished", { date: published.primary })}
          {published.secondary ? ` (${published.secondary})` : ""}
        </p>
      )}

      {history.length > 0 && (
        <details className="mt-1" data-testid="case-byline-history">
          <summary className="cursor-pointer text-primary hover:underline">
            {t("caseDetail.byline.editHistory", { count: history.length })}
          </summary>
          <ul className="mt-1 list-none space-y-1 pl-0">
            {history.map((entry) => {
              const when = formatDateForLanguage(entry.date, "PP", null, i18n.language);
              return (
                <li key={`${entry.date}-${entry.remarks}`}>
                  <span className="font-medium">{when.primary}</span>
                  {" — "}
                  {entry.remarks}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
