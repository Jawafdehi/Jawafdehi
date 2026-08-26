import {
  Archive,
  ArrowLeft,
  ArrowRight,
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
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
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

/** Matches the `gap-5` between slides, in px — the step the buttons scroll by. */
const SLIDE_GAP = 20;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The "recently added" register as a scrollable row of tall document cards —
 * title, snippet, then icon-led source and date metadata anchored to the
 * card foot.
 *
 * A native CSS scroll-snap scroller, NOT a carousel library: four cards fit
 * the row outright at `lg`, so all a library would add over `overflow-x-auto`
 * is swipe physics the browser already has — and 10.8 KB gzip on the initial
 * payload of a pre-rendered page (scripts/bundle-budget.mjs). The scroller is
 * focusable so the region is keyboard-scrollable (WCAG 2.1.1), and the
 * arrow buttons move it one card at a time, disabling at each end.
 */
export function RecentMaterialsCarousel({
  materials,
  heading,
  descriptions = {},
}: Readonly<{
  materials: readonly RecentMaterial[];
  heading: ReactNode;
  /** Each document's OWN description (from its data-lake record), by hit id. */
  descriptions?: Record<string, { ne?: string | null; en?: string | null }>;
}>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const scrollerRef = useRef<HTMLUListElement>(null);
  // Both true is the "everything fits" case (desktop): neither button applies.
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const syncEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // 1px of slack: fractional layout widths never land on an exact equality.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncEdges();
    if (typeof ResizeObserver === "undefined") return;
    // Card widths are percentage-based, so a viewport change moves both edges.
    const observer = new ResizeObserver(syncEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncEdges, materials]);

  const scrollByCard = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.firstElementChild;
    const step = card ? card.getBoundingClientRect().width + SLIDE_GAP : el.clientWidth;
    el.scrollBy({
      left: direction * step,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  return (
    <div>
      {/* Section title and the scroll controls share one line. */}
      <div className="flex items-end justify-between gap-6 pb-10">
        {heading}
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full active:scale-[0.97]"
            aria-label={t("materialsLanding.recent.previous", "Previous documents")}
            disabled={atStart}
            onClick={() => scrollByCard(-1)}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full active:scale-[0.97]"
            aria-label={t("materialsLanding.recent.next", "Next documents")}
            disabled={atEnd}
            onClick={() => scrollByCard(1)}
          >
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ul
        ref={scrollerRef}
        onScroll={syncEdges}
        // Focusable so the row can be scrolled with the arrow keys; labelled
        // because a focusable region needs an accessible name.
        tabIndex={0}
        aria-label={t("materialsLanding.recent.title", "Recently added")}
        className={[
          // snap-proximity, NOT mandatory: the last card's snap point sits past
          // the scroller's maximum scrollLeft, and mandatory snapping bounces
          // any scroll that reaches the end back to the previous card — which
          // makes the last document unreachable on a phone.
          //
          // -mx-1/p-1 give the cards' focus ring and shadow room to render
          // inside the scrollport; scroll-px-1 matches that inset so a
          // snap-start slide still comes to rest at scrollLeft 0.
          "scrollbar-none -mx-1 flex list-none snap-x snap-proximity scroll-px-1 gap-5 overflow-x-auto p-1",
          "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        ].join(" ")}
      >
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
          // The document's OWN description first; search snippets are empty
          // outside a text query, and the series/institution lines only catch
          // the ~⅓ of documents whose records carry no description.
          const snippet =
            pickLocalized(descriptions[result.id], language) ||
            pickLocalized(result.snippet, language) ||
            (series
              ? pickLocalized(series.description, language)
              : t(`materialsLanding.sourceDescriptions.${sourceKey}`, ""));
          return (
            <li
              key={result.id}
              className="min-w-0 shrink-0 basis-[85%] snap-start sm:basis-[calc(50%-0.625rem)] lg:basis-[calc(25%-0.9375rem)]"
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
