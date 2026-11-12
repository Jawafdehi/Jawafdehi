import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

/**
 * The last tile on the series shelf: the way out to the whole archive. The
 * same tall tile as a FolderCard, so it sits in the grid as a peer; it holds
 * the arrow, which is what marks it as the action rather than one
 * more series. It wears the folder tiles' grey rather than navy, so the row
 * stays one weight and the arrow alone marks it.
 */
export function BrowseAllFolderCard() {
  const { t } = useTranslation();

  return (
    <Link
      to="/materials/?q="
      className="group block h-full rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
    >
      <div className="flex aspect-[4/5] items-center justify-center rounded-[20px] bg-muted transition-colors duration-200 group-hover:bg-[hsl(215_20%_93%)]">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-surface text-primary-foreground transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
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
