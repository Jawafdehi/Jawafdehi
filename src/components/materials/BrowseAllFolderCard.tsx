import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

/**
 * The last tile on the series shelf: the way out to the whole archive. The
 * same tall tile as a FolderCard, so it sits in the grid as a peer; it is navy
 * and holds the arrow, which is what marks it as the action rather than one
 * more series.
 */
export function BrowseAllFolderCard() {
  const { t } = useTranslation();

  return (
    <Link
      to="/materials/?q="
      className="group block h-full rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
    >
      <div className="flex aspect-[4/5] items-center justify-center rounded-[20px] bg-primary-surface">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-primary transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
        >
          <ArrowRight className="h-5 w-5" />
        </span>
      </div>
      <div className="pt-3">
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
