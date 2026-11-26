import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Files } from "@/components/icons";
import { localDigits, pickSeriesText, seriesPath, validSeriesRefs } from "@/lib/case-series";
import { cn } from "@/lib/utils";
import type { CaseSeriesRef } from "@/types/series";

/**
 * "<series title>को भाग · 3/5": a case card's link to the series it belongs to.
 * Renders nothing when the payload carries no series (the API has not
 * deployed the series change, or the case is in none).
 */
export function SeriesPartOfChips({
  series,
  className,
}: Readonly<{ series: readonly CaseSeriesRef[] | null | undefined; className?: string }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const refs = validSeriesRefs(series);
  if (!refs.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {refs.map((ref) => (
        <Link
          className="relative z-10 inline-flex max-w-full items-center gap-1.5 rounded-full bg-tone-blue/10 px-2.5 py-0.5 text-[13px] text-tone-blue transition-colors hover:bg-tone-blue/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          key={ref.slug}
          onClick={(event) => event.stopPropagation()}
          to={seriesPath(ref.slug)}
        >
          <Files aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {t("series.partOf", {
              title: pickSeriesText(ref.title, language),
              ordinal: localDigits(ref.ordinal, language),
              total: localDigits(ref.member_count, language),
            })}
          </span>
        </Link>
      ))}
    </div>
  );
}
