import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { formatArchiveCount, pickLocalized } from "@/lib/materials-landing";
import { cn } from "@/lib/utils";

import type { MaterialSeries } from "@/data/material-series";

/**
 * A series as a folder, in the redesign's card kit (the Customer.io / Canva
 * asset-library pattern): a white card on a hairline holding a grey well, a
 * quiet folder drawn in it, and the series name and count beneath — the same
 * 17px name and 14px grey line as every other card on the site.
 *
 * No colour per series any more. Nine pastel folders read as a toy box; one
 * grey folder repeated reads as a shelf, and the names do the telling apart.
 * The papers inside rise a few pixels on hover — the one moving part.
 */
interface FolderCardProps {
  series: MaterialSeries;
  /** Real document count from /api/statistics/ by_source; null while loading. */
  count: number | null;
  /** Kept for callers that still pass it; the folder has one rest pose now. */
  heroSheets?: boolean;
  /** Render as a non-interactive div with no text: scenery adds no tab stops. */
  decorative?: boolean;
  /** Kept for callers that still pass it; the card has no shadow now. */
  elevation?: "md" | "lg";
  className?: string;
}

/** The drawn folder: back panel, two sheets, front panel. Pure decoration. */
export function FolderGlyph({ className }: Readonly<{ className?: string }>) {
  return (
    <div aria-hidden="true" className={cn("relative aspect-[5/4] w-[46%]", className)}>
      {/* Back panel with its tab. */}
      <div className="absolute inset-x-0 bottom-0 top-[8%] rounded-[10px] bg-[hsl(215_16%_80%)]" />
      <div className="absolute left-0 top-0 h-[16%] w-[42%] rounded-t-[8px] bg-[hsl(215_16%_80%)]" />
      {/* Sheets: lift on hover, staggered. */}
      <div className="absolute inset-x-[10%] top-[16%] h-[60%] -rotate-2 rounded-[4px] bg-surface shadow-[0_1px_2px_rgba(14,31,59,0.08)] transition-transform duration-200 ease-out group-hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0" />
      <div className="absolute inset-x-[14%] top-[20%] h-[60%] rotate-1 rounded-[4px] bg-surface shadow-[0_1px_2px_rgba(14,31,59,0.08)] transition-transform delay-[40ms] duration-200 ease-out group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0" />
      {/* Front panel, a shade lighter so the folder has depth without a shadow. */}
      <div className="absolute inset-x-0 bottom-0 top-[38%] rounded-[10px] bg-[hsl(215_18%_87%)]" />
    </div>
  );
}

export function FolderCard({ series, count, decorative = false, className }: Readonly<FolderCardProps>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const name = pickLocalized(series.name, language);

  const body = (
    <>
      <div className="flex aspect-[16/10] items-center justify-center rounded-[18px] bg-muted">
        <FolderGlyph />
      </div>
      {decorative ? null : (
        <div className="px-2 pb-1.5 pt-3.5">
          <h3 className="text-[17px] font-normal leading-6 text-primary">{name}</h3>
          <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
            {count === null ? "—" : formatArchiveCount(count, language)}{" "}
            {t("materialsLanding.grid.documents", "documents")}
          </p>
        </div>
      )}
    </>
  );

  const shell =
    "group block h-full rounded-[24px] border border-border/70 bg-surface p-2 outline-none transition-colors duration-200 hover:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  if (decorative) {
    return (
      <div aria-hidden="true" className={cn(shell, className)}>
        {body}
      </div>
    );
  }
  return (
    <Link to={`/materials/?series=${series.slug}`} className={cn(shell, className)}>
      {body}
    </Link>
  );
}
