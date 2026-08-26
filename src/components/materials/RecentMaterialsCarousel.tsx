import {
  Archive,
  BookOpen,
  Calendar,
  ClipboardList,
  Database,
  File,
  FileText,
  Landmark,
  MapPin,
  MessageSquare,
  Newspaper,
  Scale,
  ScrollText,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { ReactNode } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { seriesBySource } from "@/data/material-series";
import { sourceKeyFor } from "@/lib/material-source-labels";
import {
  formatLedgerDate,
  pickLocalized,
  sourceFromMaterialUrl,
} from "@/lib/materials-landing";

import type { LucideIcon } from "lucide-react";
import type { RecentMaterial } from "@/lib/materials-landing";

/**
 * One icon per publishing institution, keyed by sourceKeyFor()'s i18n keys so
 * every source token — registry series or long-tail — resolves to something.
 */
const SOURCE_ICONS: Record<string, LucideIcon> = {
  ag: FileText,
  nkp: BookOpen,
  courts: Scale,
  ciaa: Landmark,
  dfmis: Database,
  jawafdehi: Archive,
  koshi: MapPin,
  ppmo: ClipboardList,
  auditorGeneral: ClipboardList,
  lawsOfNepal: ScrollText,
  news: Newspaper,
  socialMedia: MessageSquare,
  other: File,
};

/**
 * The "recently added" register as a carousel of tall document cards —
 * title, snippet, then icon-led source and date metadata anchored to the
 * card foot. shadcn/embla carries the interaction contract: arrow-key
 * scrolling on the region, swipe with button alternatives, slides announced
 * as such. Scroll snaps instantly under prefers-reduced-motion.
 */
export function RecentMaterialsCarousel({
  materials,
  heading,
}: Readonly<{ materials: readonly RecentMaterial[]; heading: ReactNode }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <Carousel
      opts={{ align: "start", duration: reduceMotion ? 0 : 20 }}
      aria-label={t("materialsLanding.recent.title", "Recently added")}
    >
      {/* Section title and the carousel controls share one line. */}
      <div className="flex items-end justify-between gap-6 pb-10">
        {heading}
        <div className="flex shrink-0 gap-2">
          <CarouselPrevious
            aria-label={t("materialsLanding.recent.previous", "Previous documents")}
            className="static h-10 w-10 translate-y-0 active:scale-[0.97]"
          />
          <CarouselNext
            aria-label={t("materialsLanding.recent.next", "Next documents")}
            className="static h-10 w-10 translate-y-0 active:scale-[0.97]"
          />
        </div>
      </div>
      <CarouselContent className="-ml-5">
        {materials.map(({ result, date }) => {
          const source = sourceFromMaterialUrl(result.url);
          const sourceKey = sourceKeyFor(source ?? "");
          const series = source ? seriesBySource(source) : undefined;
          const seriesLabel = series
            ? pickLocalized(series.name, language)
            : t(`dataQuality.materialsBySource.source.${sourceKey}`, source ?? "—");
          const SourceIcon = SOURCE_ICONS[sourceKey] ?? File;
          const title =
            pickLocalized(result.title, language) ||
            t("materialsLanding.recent.untitled", "Untitled document");
          // Search hits often carry no snippet outside a text query; fall
          // back to the series' authored description, then to a one-line
          // institution description — every card gets real context.
          const snippet =
            pickLocalized(result.snippet, language) ||
            (series
              ? pickLocalized(series.description, language)
              : t(`materialsLanding.sourceDescriptions.${sourceKey}`, ""));
          return (
            <CarouselItem
              key={result.id}
              className="basis-[85%] pl-5 sm:basis-1/2 lg:basis-1/4"
            >
              <Link
                to={result.url}
                className={[
                  "flex min-h-[320px] w-full flex-col rounded-xl border border-border bg-surface p-6 shadow-elev-sm",
                  "touch-manipulation transition-[transform,box-shadow] duration-200 ease-out-strong",
                  "hover:-translate-y-0.5 hover:shadow-elev-md active:scale-[0.99]",
                  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                ].join(" ")}
              >
                <h3 className="line-clamp-3 min-w-0 text-lg font-medium leading-snug text-foreground">
                  {title}
                </h3>
                {snippet && (
                  <p className="mt-3 line-clamp-4 min-w-0 text-sm leading-relaxed text-muted-foreground">
                    {snippet}
                  </p>
                )}
                <div className="mt-auto space-y-2 pt-6 text-xs font-medium text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <SourceIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{seriesLabel}</span>
                  </p>
                  <p className="flex items-center gap-2 font-mono text-sm tabular-nums">
                    <Calendar aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    {formatLedgerDate(date, language)}
                  </p>
                </div>
              </Link>
            </CarouselItem>
          );
        })}
      </CarouselContent>
    </Carousel>
  );
}
