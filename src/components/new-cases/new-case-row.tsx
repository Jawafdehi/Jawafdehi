import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CaseTagBadge, CaseTypeBadge } from "@/components/CaseBadge";
import { Scale } from "@/components/icons";
import { casePath } from "@/lib/case-links";
import { caseTagLabel } from "@/lib/case-tags";
import { cn } from "@/lib/utils";
import { caseTitleFor, courtChip, formatRowDate, publishDate, type CourtChip } from "@/lib/new-cases";
import type { Case } from "@/types/jds";
import { getCaseTypeLabelKey } from "@/utils/case-entities";

/**
 * One case on /new-cases: the publish date in a fixed column, then the title,
 * two lines of summary and the chips (offence, tags, court cases). A row, not
 * a card, so a week of seventy cases still reads as a list.
 */
export function NewCaseRow({ item, className }: Readonly<{ item: Case; className?: string }>) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "ne" ? "ne" : "en";

  const slug = item.slug?.trim() || null;
  const title = caseTitleFor(item, lang);
  const day = publishDate(item.case_publish_date);
  const offenceType = item.offence_type || item.case_type;
  const offenceKey = getCaseTypeLabelKey(offenceType);
  const offenceLabel = offenceKey
    ? t(offenceKey)
    : (offenceType || "").replaceAll("_", " ").replaceAll("-", " ").trim();
  // A tag that only repeats the offence ("Money Laundering" twice) is dropped.
  const tags = (item.tags ?? []).filter((tag) => caseTagLabel(tag, lang) !== offenceLabel);
  const courts = (item.court_cases ?? [])
    .map((ref) => courtChip(ref, lang))
    .filter((chip): chip is CourtChip => chip !== null);

  return (
    <li
      className={cn(
        "grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-4 border-b border-border/60 py-4 last:border-b-0 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-x-6",
        className,
      )}
    >
      <div className="pt-0.5 text-sm leading-6 text-muted-foreground">
        {day ? <time dateTime={day}>{formatRowDate(day, lang)}</time> : null}
      </div>
      <div className="min-w-0">
        <h3 className="break-words text-[17px] font-normal leading-6 text-primary">
          {slug ? (
            <Link
              to={casePath(slug)}
              className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        {item.short_description ? (
          <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
            {item.short_description}
          </p>
        ) : null}
        {offenceLabel || tags.length || courts.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {offenceLabel ? (
              <CaseTypeBadge caseType={offenceType} className="px-2.5 py-0.5 shadow-none">
                {offenceLabel}
              </CaseTypeBadge>
            ) : null}
            {tags.map((tag) => (
              <CaseTagBadge key={tag} className="px-2.5 py-0.5 shadow-none">
                {caseTagLabel(tag, lang)}
              </CaseTagBadge>
            ))}
            {courts.map((court) => (
              <Link
                key={court.key}
                to={court.href}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium leading-4 text-primary transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Scale className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{court.label}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}
