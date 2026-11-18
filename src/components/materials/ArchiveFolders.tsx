import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  folderHref,
  leafHref,
  nodeCount,
  nodeName,
  resolvePath,
  withUnfiled,
  type ArchiveNode,
} from "@/data/archive-folders";
import { MATERIAL_SERIES } from "@/data/material-series";
import { documentSourcesQuery, type DocumentSourcesResponse } from "@/lib/document-sources";
import { folderTintClass, formatArchiveCount, pickLocalized } from "@/lib/materials-landing";
import { cn } from "@/lib/utils";

/** अभिलेख › न्यायपालिका › सर्वोच्च अदालत › नजिर: every step but the last is a link. */
export function ArchiveBreadcrumbs({ chain, path }: Readonly<{ chain: ArchiveNode[]; path: string[] }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  return (
    <nav aria-label="breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex list-none flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link to="/materials/#archive" className="hover:text-foreground">
            {t("materialsLanding.archive.root", "Archive")}
          </Link>
        </li>
        {chain.map((node, index) => {
          const last = index === chain.length - 1;
          return (
            <li key={node.slug} className="flex items-center gap-2">
              <span aria-hidden="true">›</span>
              {last ? (
                <span aria-current="page" className="text-foreground">
                  {nodeName(node, language)}
                </span>
              ) : (
                <Link to={folderHref(path.slice(0, index + 1))} className="hover:text-foreground">
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

function insideLine(node: ArchiveNode, language: string): string {
  if (node.type === "branch") return node.children.map((child) => nodeName(child, language)).join(" · ");
  const curated = MATERIAL_SERIES.find((series) => series.slug === node.slug);
  return curated ? pickLocalized(curated.description, language) : "";
}

function ArchiveFolderCard({
  node,
  href,
  tint,
  catalogue,
}: Readonly<{ node: ArchiveNode; href: string; tint: number; catalogue: DocumentSourcesResponse | undefined }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const count = nodeCount(node, catalogue);
  const line = insideLine(node, language);
  return (
    <Link
      to={href}
      data-node={node.slug}
      className={cn(
        "font-material-folder group relative block rounded-2xl outline-none shadow-elev-md",
        "transition-[transform,box-shadow] duration-200 ease-out-strong hover:-translate-y-1 hover:shadow-elev-lg",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute -top-[14px] left-0 h-[20px] w-[38%] rounded-t-[8px] [transform:skewX(-8deg)] [transform-origin:bottom_left]",
          folderTintClass(tint),
        )}
      />
      <div className={cn("relative overflow-hidden rounded-2xl rounded-tl-none p-1.5", folderTintClass(tint))}>
        <div className="flex min-h-[9.5rem] flex-col justify-between rounded-xl border border-surface/60 bg-surface/70 p-4 backdrop-blur-[12px]">
          <div>
            <h3 className="text-lg font-medium leading-snug text-primary">{nodeName(node, language)}</h3>
            {line && <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-foreground/70">{line}</p>}
          </div>
          <p className="mt-3 text-lg font-semibold tabular-nums text-primary">
            {count === null ? "—" : formatArchiveCount(count, language)}
            <span className="ml-1.5 text-xs font-medium text-foreground/70">
              {t("materialsLanding.grid.documents", "documents")}
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}

/**
 * One level of the archive folder tree: the top-level folders on /materials,
 * or a folder's / office's contents at /materials/?folder=<path>.
 */
export function ArchiveFolders({ path = [] }: Readonly<{ path?: string[] }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data: catalogue } = useQuery({ ...documentSourcesQuery(), staleTime: 5 * 60 * 1000 });
  const tree = withUnfiled(catalogue);
  const chain = path.length ? resolvePath(tree, path) : [];
  const here = chain?.[chain.length - 1];

  if (chain === null || (here && here.type !== "branch")) {
    return (
      <p className="font-page-lede">
        {t("materialsLanding.series.unknown", "This series does not exist. Browse the archive instead:")}{" "}
        <Link to="/materials/#archive" className="text-primary underline">
          {t("materialsLanding.archive.root", "Archive")}
        </Link>
      </p>
    );
  }

  const children = here?.type === "branch" ? here.children : tree;
  const total = here ? nodeCount(here, catalogue) : null;
  return (
    <div>
      {here ? (
        <>
          <ArchiveBreadcrumbs chain={chain} path={path} />
          <h1 className="font-archive-hero-title mt-8">{nodeName(here, language)}</h1>
          {total !== null && (
            <p className="mt-3 text-sm tabular-nums text-muted-foreground">
              {formatArchiveCount(total, language)} {t("materialsLanding.grid.documents", "documents")}
            </p>
          )}
        </>
      ) : (
        <>
          <h2 id="archive-heading" className="font-archive-section-title">
            {t("materialsLanding.archive.title", "Browse the archive")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {t("materialsLanding.archive.lede", "")}
          </p>
        </>
      )}
      <ul className="mt-12 grid list-none grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children.map((node) => (
          <li key={node.slug}>
            <ArchiveFolderCard
              node={node}
              catalogue={catalogue}
              tint={node.type === "branch" ? node.tint : here?.type === "branch" ? here.tint : 1}
              href={node.type === "branch" ? folderHref([...path, node.slug]) : leafHref(node)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
