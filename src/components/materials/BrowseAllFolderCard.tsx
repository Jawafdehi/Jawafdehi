import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

/**
 * The last card on the series shelf: the way out to the whole archive. Same
 * shell as a FolderCard, so it sits in the grid as a peer; its well is navy
 * and holds the arrow, which is what marks it as the action rather than one
 * more series.
 */
export function BrowseAllFolderCard() {
  const { t } = useTranslation();

  return (
    <Link
      to="/materials/?q="
      className="group block h-full rounded-[24px] border border-border/70 bg-surface p-2 outline-none transition-colors duration-200 hover:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex aspect-[16/10] items-center justify-center rounded-[18px] bg-primary-surface">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-primary transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
        >
          <ArrowRight className="h-5 w-5" />
        </span>
      </div>
      <div className="px-2 pb-1.5 pt-3.5">
        <h3 className="text-[17px] font-normal leading-6 text-primary">
          {t("materialsLanding.grid.browseAll", "Browse all series")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("materialsLanding.grid.browseAllLine", "Search every document")}
        </p>
      </div>
    </Link>
  );
}
