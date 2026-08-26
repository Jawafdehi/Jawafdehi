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
 * The "recently added" register as a grid of raised document cards: title
 * first, then the source and date as icon-led metadata. Every figure is real
 * API data; documents without a resolvable date never reach this component
 * (lib/materials-landing drops them).
 */
export function RecentMaterialsCards({
  materials,
}: Readonly<{ materials: readonly RecentMaterial[] }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  return (
    <ul className="grid list-none grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
        return (
          <li key={result.id}>
            <Link
              to={result.url}
              className={[
                "flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-elev-sm",
                "transition-[transform,box-shadow] duration-200 ease-out-strong",
                "hover:-translate-y-0.5 hover:shadow-elev-md active:scale-[0.99]",
                "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
              ].join(" ")}
            >
              <h3 className="line-clamp-3 font-medium leading-snug text-foreground">
                {title}
              </h3>
              <div className="mt-auto space-y-2 pt-5 text-xs font-medium text-muted-foreground">
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
          </li>
        );
      })}
    </ul>
  );
}
