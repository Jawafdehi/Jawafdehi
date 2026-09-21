import { Archive } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

/** The final folder on the series shelf leads to the full materials search. */
export function BrowseAllFolderCard() {
  const { t } = useTranslation();

  return (
    <Link
      to="/materials/?q="
      className="font-material-folder group relative block rounded-2xl outline-none shadow-elev-md transition-[transform,box-shadow] duration-200 ease-out-strong hover:-translate-y-1 hover:shadow-elev-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div
        aria-hidden="true"
        className="absolute -top-[18px] left-0 h-[26px] w-[38%] rounded-t-[8px] bg-card [transform:skewX(-8deg)] [transform-origin:bottom_left]"
      />
      <div className="relative flex aspect-[11/10] flex-col items-center justify-center gap-7 overflow-hidden rounded-2xl rounded-tl-none border border-border/60 bg-card p-5 text-center">
        <div
          aria-hidden="true"
          className="flex h-20 w-20 items-center justify-center rounded-full bg-surface text-muted-foreground"
        >
          <Archive className="h-9 w-9 stroke-[1.35]" />
        </div>
        <h3 className="text-2xl font-medium leading-tight text-primary">
          {t("materialsLanding.grid.browseAll", "Browse all series")}
        </h3>
      </div>
    </Link>
  );
}
