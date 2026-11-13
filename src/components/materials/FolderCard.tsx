import { seriesSearchPath } from "@/data/material-series";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { formatArchiveCount, pickLocalized } from "@/lib/materials-landing";
import { cn } from "@/lib/utils";

import type { MaterialSeries } from "@/data/material-series";

/**
 * A series as a folder: a tall grey tile holding a portrait folder with the
 * series' real cover inside, and the name and count beneath — the same 17px
 * name and 14px grey line as every other card on the site. No card around
 * it: the tile is the object (the Givingli collections pattern).
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

/**
 * The drawn folder: a back panel with its tab, a real page inside, and a front
 * panel. Pure decoration.
 *
 * The page is the series' own cover: page one of a real document from it
 * (public/assets/materials/covers/, made by
 * scripts/make-series-covers.py), so the folder shows what is
 * in it rather than standing for "a folder". It rests muted (35% saturation)
 * so nine covers read as one shelf. On hover the page is pulled out of the
 * folder (Codrops' "Folder Preview Ideas"): it slides up and to the right,
 * turns 4° and takes a shadow, its colour comes up, and the front panel tips
 * forward 18° on its bottom edge. Under reduced motion only the colour
 * changes.
 */
export function FolderGlyph({ cover, className }: Readonly<{ cover?: string; className?: string }>) {
  return (
    <div aria-hidden="true" className={cn("relative aspect-[4/5] w-[66%] [perspective:600px]", className)}>
      {/* Back panel with its tab. */}
      <div className="absolute inset-x-0 bottom-0 top-[6%] rounded-[10px] bg-[hsl(215_16%_80%)]" />
      <div className="absolute left-0 top-0 h-[12%] w-[42%] rounded-t-[8px] bg-[hsl(215_16%_80%)]" />
      {cover ? (
        <img
          src={cover}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-x-[8%] top-[3%] h-[88%] w-[84%] origin-bottom-left -rotate-2 rounded-[3px] bg-surface object-cover object-top shadow-[0_1px_3px_rgba(14,31,59,0.18)] saturate-[.35] transition-[transform,filter,box-shadow] duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:[transform:translate(10%,-18%)_rotate(4deg)] group-hover:shadow-[0_10px_24px_-8px_rgba(14,31,59,0.35)] group-hover:saturate-100 motion-reduce:transition-[filter] motion-reduce:group-hover:[transform:rotate(-2deg)]"
        />
      ) : (
        <div className="absolute inset-x-[10%] top-[16%] h-[60%] -rotate-2 rounded-[4px] bg-surface shadow-[0_1px_2px_rgba(14,31,59,0.08)] transition-transform duration-200 ease-out group-hover:[transform:translate(10%,-18%)_rotate(4deg)] motion-reduce:transition-none motion-reduce:group-hover:[transform:rotate(-2deg)]" />
      )}
      {/* Front panel, a shade lighter so the folder has depth without a
          shadow. It tips toward the reader on hover, hinged at the bottom. */}
      <div className="absolute inset-x-0 bottom-0 top-[60%] origin-bottom rounded-[10px] bg-[hsl(215_18%_87%)] transition-transform duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:[transform:rotateX(-18deg)] motion-reduce:transition-none motion-reduce:group-hover:[transform:none]" />
    </div>
  );
}

export function FolderCard({ series, count, decorative = false, className }: Readonly<FolderCardProps>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const name = pickLocalized(series.name, language);

  const body = (
    <>
      {/* A tall tile with no card around it (the Givingli pattern): the tile
          is the object, and the name and count sit under it. */}
      <div className="flex aspect-[4/5] items-center justify-center rounded-[20px] bg-muted transition-colors duration-200 group-hover:bg-[hsl(215_20%_93%)]">
        <FolderGlyph cover={`/assets/materials/covers/${series.slug}.webp`} />
      </div>
      {decorative ? null : (
        <div className="pt-3">
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
    "group block h-full rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4";

  if (decorative) {
    return (
      <div aria-hidden="true" className={cn(shell, className)}>
        {body}
      </div>
    );
  }
  return (
    <Link to={seriesSearchPath(series.slug)} className={cn(shell, className)}>
      {body}
    </Link>
  );
}
