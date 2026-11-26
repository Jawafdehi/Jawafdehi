import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";

import { ArrowLeft, ArrowRight, Files } from "@/components/icons";
import { casePath } from "@/lib/case-links";
import { localDigits, pickSeriesText, seriesNeighbours, seriesPath, validSeriesRefs } from "@/lib/case-series";
import { useSeries } from "@/queries/series";
import type { CaseSeriesRef } from "@/types/series";

const ghostPill =
  "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const darkPill =
  "inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Under a case's title: "this case is n of N in <series>", with links to the
 * previous and next member cases and to the series page. Prev/next need the
 * series' member list, fetched lazily; if that fails the banner keeps the
 * sentence and the series link only. Renders nothing when the case payload
 * has no `series` (the key is absent until the API deploys the change).
 */
export function CaseSeriesBanner({
  series,
  caseSlug,
}: Readonly<{ series: readonly CaseSeriesRef[] | null | undefined; caseSlug: string }>) {
  const refs = validSeriesRefs(series);
  if (!refs.length) return null;
  return (
    <div className="mt-5 space-y-2">
      {refs.map((ref) => (
        <SeriesBannerRow caseSlug={caseSlug} key={ref.slug} seriesRef={ref} />
      ))}
    </div>
  );
}

function SeriesBannerRow({ seriesRef, caseSlug }: Readonly<{ seriesRef: CaseSeriesRef; caseSlug: string }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data: detail } = useSeries(seriesRef.slug);
  const neighbours = detail ? seriesNeighbours(detail, caseSlug) : null;
  const title = pickSeriesText(seriesRef.title, language);
  const href = seriesPath(seriesRef.slug);
  const { prev, next } = neighbours ?? { prev: null, next: null };

  return (
    <nav
      aria-label={t("series.banner.label")}
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-tone-blue/[0.07] px-4 py-2.5 text-[14.5px] text-primary"
    >
      <p className="flex min-w-0 items-center gap-2">
        <Files aria-hidden="true" className="h-4 w-4 shrink-0 text-tone-blue" />
        <span>
          <Trans
            components={{ anchor: <Link className="font-semibold text-tone-blue hover:underline" to={href} /> }}
            i18nKey="series.banner.text"
            values={{
              title,
              ordinal: localDigits(seriesRef.ordinal, language),
              total: localDigits(seriesRef.member_count, language),
            }}
          />
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        {prev ? (
          <Link
            aria-label={t("series.banner.prevLabel", {
              ordinal: localDigits(prev.ordinal, language),
              title: prev.case.title,
            })}
            className={ghostPill}
            to={casePath(prev.case.slug)}
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            {t("series.banner.prev", { ordinal: localDigits(prev.ordinal, language) })}
          </Link>
        ) : null}
        <Link className={darkPill} to={href}>
          {t("series.banner.all")}
        </Link>
        {next ? (
          <Link
            aria-label={t("series.banner.nextLabel", {
              ordinal: localDigits(next.ordinal, language),
              title: next.case.title,
            })}
            className={ghostPill}
            to={casePath(next.case.slug)}
          >
            {t("series.banner.next", { ordinal: localDigits(next.ordinal, language) })}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
