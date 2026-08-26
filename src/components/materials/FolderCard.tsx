import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  folderTintClass,
  formatArchiveCount,
  pickLocalized,
} from "@/lib/materials-landing";
import { cn } from "@/lib/utils";

import type { MaterialSeries } from "@/data/material-series";

/**
 * The fanned white sheets peeking out of the folder. Rest pose is authored
 * here; hover lifts each sheet 6px with a 40ms stagger. Sheets start well
 * below the folder's top edge (the tint must frame them) and run far behind
 * the frosted panel, so their lower halves read as paper through the blur.
 */
const SHEETS = [
  { className: "left-[16%] right-[20%] top-[16%] -rotate-2", delay: "delay-0" },
  { className: "left-[20%] right-[14%] top-[13%] rotate-1", delay: "delay-[40ms]" },
  { className: "left-[13%] right-[17%] top-[11%] -rotate-1", delay: "delay-[80ms]" },
  { className: "left-[18%] right-[12%] top-[9%] rotate-2", delay: "delay-[120ms]" },
];

interface FolderCardProps {
  series: MaterialSeries;
  /** Real document count from /api/statistics/ by_source; null while loading. */
  count: number | null;
  /** Hero shelf front folder: sheets settle upward once on load. */
  heroSheets?: boolean;
  /**
   * Render as a non-interactive div — the hero shelf's back folders are
   * scenery, and scenery must not add tab stops.
   */
  decorative?: boolean;
  /** Resting elevation; the hero shelf's front folder sits at `lg`. */
  elevation?: "md" | "lg";
  className?: string;
}

export function FolderCard({
  series,
  count,
  heroSheets = false,
  decorative = false,
  elevation = "md",
  className,
}: Readonly<FolderCardProps>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const tintClass = folderTintClass(series.tint);
  const name = pickLocalized(series.name, language);
  const typeLabel = pickLocalized(series.typeLabel, language);

  const shellClassName = cn(
    "relative block rounded-2xl outline-none",
    elevation === "lg" ? "shadow-elev-lg" : "shadow-elev-md",
    !decorative && [
      "transition-[transform,box-shadow] duration-200 ease-out-strong",
      "hover:-translate-y-1 hover:shadow-elev-lg active:scale-[0.99] active:duration-100",
      "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
    ],
  );

  const folder = (
    <>
      {/* Folder tab — part of the silhouette, so it moves with the card. */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute -top-[18px] left-0 h-[26px] w-[38%] rounded-t-[8px]",
          "[transform:skewX(-8deg)] [transform-origin:bottom_left]",
          tintClass,
        )}
      />
      {/* Folder body. isolate keeps the sheet/glass stack local. */}
      <div
        className={cn(
          "relative isolate aspect-[4/3] overflow-hidden rounded-2xl rounded-tl-none",
          tintClass,
        )}
      >
        {/* The one sanctioned tint gradient: a barely-there vertical light. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-surface/25 via-transparent to-primary/5"
        />
        {/* Fanned sheets. */}
        {SHEETS.map((sheet, index) => (
          <div
            key={sheet.className}
            aria-hidden="true"
            className={cn(
              "absolute rounded-[3px] border border-border/60 bg-surface shadow-elev-xs",
              "h-[40%] transition-transform duration-200 ease-out-strong",
              sheet.className,
              sheet.delay,
              "group-hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0",
              heroSheets && index === SHEETS.length - 1 && "animate-sheet-rise motion-reduce:animate-none",
            )}
          />
        ))}
        {/* Frosted front panel over the lower part of the folder. Decorative
            shelf folders keep the glass but carry no text — scenery stays
            quiet behind the one labelled folder. */}
        <div className="absolute inset-x-0 bottom-0 flex h-[58%] flex-col justify-between rounded-b-2xl rounded-t-md border border-surface/60 bg-surface/55 p-4 backdrop-blur-[12px]">
          {!decorative && (
            <>
              <div>
                <h3 className="font-semibold leading-snug text-foreground">{name}</h3>
                <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-primary">
                  {count === null ? "—" : formatArchiveCount(count, language)}
                  <span className="ml-1.5 align-baseline font-sans text-xs font-medium text-foreground/70">
                    {t("materialsLanding.grid.documents", "documents")}
                  </span>
                </p>
              </div>
              <p className="text-xs font-medium text-foreground/70">{typeLabel}</p>
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className={cn("group relative", className)} aria-hidden={decorative || undefined}>
      {decorative ? (
        <div className={shellClassName}>{folder}</div>
      ) : (
        <Link to={`/materials/?series=${series.slug}`} className={shellClassName}>
          {folder}
        </Link>
      )}
    </div>
  );
}
