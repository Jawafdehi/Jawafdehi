import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ChevronRight } from "@/components/icons";

import { folderHref, nodeName, type ArchiveNode } from "@/data/archive-folders";

/** अभिलेख › न्यायपालिका › सर्वोच्च अदालत › नजिर: every step but the last is a link. */
export function ArchiveBreadcrumbs({ chain, path }: Readonly<{ chain: ArchiveNode[]; path: string[] }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  return (
    <nav aria-label="breadcrumb" className="text-[15px] text-muted-foreground">
      <ol className="flex list-none flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link to="/materials/#archive" className="transition-colors hover:text-primary">
            {t("materialsLanding.archive.root", "Archive")}
          </Link>
        </li>
        {chain.map((node, index) => {
          const last = index === chain.length - 1;
          return (
            <li key={node.slug} className="flex items-center gap-2">
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground/70" />
              {last ? (
                <span aria-current="page" className="text-primary">
                  {nodeName(node, language)}
                </span>
              ) : (
                <Link to={folderHref(path.slice(0, index + 1))} className="transition-colors hover:text-primary">
                  {nodeName(node, language)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
