import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronRight, Columns3, FileText, Folder, LayoutGrid, List } from "@/components/icons";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  childrenAt,
  leafHref,
  nodeCount,
  nodeName,
  resolvePath,
  validPath,
  withUnfiled,
  type ArchiveBranch,
  type ArchiveNode,
} from "@/data/archive-folders";
import { MATERIAL_SERIES } from "@/data/material-series";
import { useIsMobile } from "@/hooks/use-mobile";
import { documentSourcesQuery, type DocumentSourcesResponse } from "@/lib/document-sources";
import { formatArchiveCount, pickLocalized } from "@/lib/materials-landing";
import { lazyChunk } from "@/lib/chunk-reload";
import { cn } from "@/lib/utils";

/**
 * The archive as a Finder-style browser on /materials (JAW-65): one folder
 * tree (folder › office › series) shown as icons, a list or columns. Everything happens in place; the URL carries `?view=&path=` so a
 * link, back/forward or a refresh restores the state. Only a series' "see
 * documents" leaves the page, for its listing.
 *
 * `path` always names the SELECTED node. Icons and list show inside it when it
 * is a folder; columns show it selected among its siblings.
 */

const ListView = lazy(lazyChunk(() => import("./ArchiveViews"), (m) => m.ListView));
const ColumnsView = lazy(lazyChunk(() => import("./ArchiveViews"), (m) => m.ColumnsView));

export const ARCHIVE_VIEWS = ["icons", "list", "columns"] as const;
export type ArchiveView = (typeof ARCHIVE_VIEWS)[number];
const VIEW_KEY = "jawafdehi.archiveView";

const isView = (value: string | null | undefined): value is ArchiveView =>
  Boolean(value) && (ARCHIVE_VIEWS as readonly string[]).includes(value as string);

export const key = (path: readonly string[]) => path.join("/");

export interface Ctx {
  tree: readonly ArchiveBranch[];
  path: string[];
  catalogue: DocumentSourcesResponse | undefined;
  language: string;
  /** Move the selection; `push` adds a history entry (opening a folder). */
  select: (path: string[], push?: boolean) => void;
  openLeaf: (path: string[]) => void;
}

export function describe(node: ArchiveNode, language: string): string {
  if (node.type === "branch") return node.children.map((child) => nodeName(child, language)).join(" · ");
  const curated = MATERIAL_SERIES.find((series) => series.slug === node.slug);
  return curated ? pickLocalized(curated.description, language) : "";
}

export function CountLabel({
  node,
  ctx,
  className,
  compact = false,
}: Readonly<{ node: ArchiveNode; ctx: Ctx; className?: string; compact?: boolean }>) {
  const { t } = useTranslation();
  const count = nodeCount(node, ctx.catalogue);
  return (
    <span className={cn("tabular-nums", className)}>
      {count === null ? "—" : formatArchiveCount(count, ctx.language)}{" "}
      {/* On a phone the List rows drop the word so long names have room. */}
      <span className={cn("text-xs font-normal opacity-70", compact && "hidden sm:inline")}>
        {t("materialsLanding.grid.documents", "documents")}
      </span>
    </span>
  );
}

export function SeeDocuments({ node, className }: Readonly<{ node: ArchiveNode; className?: string }>) {
  const { t } = useTranslation();
  if (node.type !== "leaf") return null;
  return (
    <Link
      to={leafHref(node)}
      className={cn("group inline-flex items-center gap-1.5 text-[15px] font-medium text-primary transition-colors hover:text-accent", className)}
    >
      {t("materialsLanding.archive.seeDocuments", "View all")}
      <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Move focus between `[data-item]` children of a container. */
function focusItem(container: HTMLElement | null, index: number) {
  const items = container ? [...container.querySelectorAll<HTMLElement>("[data-item]")] : [];
  if (!items.length) return;
  items[Math.max(0, Math.min(items.length - 1, index))].focus();
}

// ── Icons ──────────────────────────────────────────────────────────────────

function IconsView({ ctx }: Readonly<{ ctx: Ctx }>) {
  const { tree, path, language } = ctx;
  const chain = resolvePath(tree, path) ?? [];
  const last = chain[chain.length - 1];
  const folderPath = last?.type === "leaf" ? path.slice(0, -1) : path;
  const items = childrenAt(tree, folderPath);
  const gridRef = useRef<HTMLUListElement>(null);
  // Opening a folder (or going up) replaces the focused tile: put focus on the
  // first tile of the folder now shown, so the keyboard keeps working.
  const refocus = useRef(false);
  const folderKey = key(folderPath);
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    focusItem(gridRef.current, 0);
  }, [folderKey]);
  const open = (next: string[]) => {
    refocus.current = true;
    ctx.select(next, true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const items = [...(gridRef.current?.querySelectorAll<HTMLElement>("[data-item]") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    const top = items[0].offsetTop;
    const perRow = Math.max(1, items.filter((item) => item.offsetTop === top).length);
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: perRow, ArrowUp: -perRow };
    if (event.key in moves) {
      event.preventDefault();
      focusItem(gridRef.current, index + moves[event.key]);
    } else if (event.key === "Backspace" && folderPath.length) {
      event.preventDefault();
      open(folderPath.slice(0, -1));
    }
  };

  return (
    <ul
      ref={gridRef}
      onKeyDown={onKeyDown}
      className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {items.map((node) => {
        const nodePath = [...folderPath, node.slug];
        const Glyph = node.type === "branch" ? Folder : FileText;
        // A hairline card, the site's card: a grey glyph tile, the name, what
        // is inside, and the count pinned to the foot so a row of tiles lines
        // up. The arrow slides in on hover to say the tile opens.
        const body = (
          <div className="flex h-full flex-col rounded-[20px] border border-border/70 bg-background p-5 text-left sm:min-h-[11rem] transition-[border-color] duration-200 ease-out group-hover:border-primary/25">
            <div className="flex items-start justify-between">
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary">
                <Glyph className="h-5 w-5" />
              </span>
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none"
              />
            </div>
            <h3 className="mt-4 text-lg leading-snug text-primary sm:mt-5">{nodeName(node, language)}</h3>
            <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">{describe(node, language)}</p>
            <CountLabel node={node} ctx={ctx} className="mt-auto pt-4 text-[15px] text-primary" />
          </div>
        );
        const tile = cn(
          "group block h-full w-full rounded-[20px] outline-none transition-transform duration-150 ease-out active:scale-[0.99]",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "motion-reduce:transition-none motion-reduce:active:scale-100",
        );
        return (
          <li key={node.slug}>
            {node.type === "branch" ? (
              <button type="button" data-item data-node={node.slug} className={tile} onClick={() => open(nodePath)}>
                {body}
              </button>
            ) : (
              <Link to={leafHref(node)} data-item data-node={node.slug} className={tile}>
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── The browser ────────────────────────────────────────────────────────────

const VIEW_ICONS: Record<ArchiveView, typeof LayoutGrid> = {
  icons: LayoutGrid,
  list: List,
  columns: Columns3,
};

function Breadcrumbs({ ctx }: Readonly<{ ctx: Ctx }>): ReactNode {
  const { t } = useTranslation();
  const chain = resolvePath(ctx.tree, ctx.path) ?? [];
  return (
    <nav aria-label="breadcrumb" className="min-w-0 text-[15px] text-muted-foreground">
      <ol className="flex list-none flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <button type="button" onClick={() => ctx.select([], true)} className={cn("transition-colors hover:text-primary", !chain.length && "text-primary")}>
            {t("materialsLanding.archive.root", "Archive")}
          </button>
        </li>
        {chain.map((node, index) => (
          <li key={node.slug} className="flex items-center gap-2">
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground/70" />
            {index === chain.length - 1 ? (
              <span aria-current="page" className="text-primary">
                {nodeName(node, ctx.language)}
              </span>
            ) : (
              <button type="button" onClick={() => ctx.select(ctx.path.slice(0, index + 1), true)} className="transition-colors hover:text-primary">
                {nodeName(node, ctx.language)}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ArchiveBrowser() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const navigate = useNavigate();
  const { data: catalogue } = useQuery({ ...documentSourcesQuery(), staleTime: 5 * 60 * 1000 });
  const tree = useMemo(() => withUnfiled(catalogue, language), [catalogue, language]);
  const [params] = useSearchParams();
  const isMobile = useIsMobile();

  // The last chosen view, read after mount so the pre-rendered HTML (columns)
  // and the first client render agree.
  const [storedView, setStoredView] = useState<ArchiveView | null>(null);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_KEY);
      if (isView(saved)) setStoredView(saved);
    } catch {
      /* storage blocked: fall back to the default */
    }
  }, []);

  const urlView = params.get("view");
  const view: ArchiveView = isView(urlView) ? urlView : (storedView ?? (isMobile ? "list" : "columns"));
  const rawPath = (params.get("path") ?? "").split("/").filter(Boolean);
  const path = validPath(tree, rawPath);
  const pathKey = key(path);

  const update = (changes: { view?: ArchiveView; path?: string[] }, push: boolean) => {
    const next = new URLSearchParams(params);
    if (changes.view) next.set("view", changes.view);
    if (changes.path) {
      if (changes.path.length) next.set("path", key(changes.path));
      else next.delete("path");
    }
    // Slashes stay readable in the path (`judiciary/supreme-court`).
    const search = next.toString().replace(/%2F/gi, "/");
    navigate(
      { search: search ? `?${search}` : "", hash: "archive" },
      { replace: !push, preventScrollReset: true, state: { keepScroll: true } },
    );
  };

  const ctx: Ctx = {
    tree,
    path,
    catalogue,
    language,
    select: (next, push = false) => {
      if (key(next) !== pathKey) update({ path: next }, push);
    },
    openLeaf: (leafPath) => {
      const chain = resolvePath(tree, leafPath);
      const leaf = chain?.[chain.length - 1];
      if (leaf?.type === "leaf") navigate(leafHref(leaf));
    },
  };

  const chooseView = (next: ArchiveView) => {
    setStoredView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* not remembered; still applied */
    }
    update({ view: next }, false);
  };

  return (
    <div>
      <h2 id="archive-heading" className="font-archive-section-title">
        {t("materialsLanding.archive.title", "Browse the archive")}
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{t("materialsLanding.archive.lede", "")}</p>

      <div className="sticky top-16 z-10 -mx-2 mt-8 flex flex-wrap items-center justify-between gap-3 bg-background/90 px-2 py-2 backdrop-blur">
        <Breadcrumbs ctx={ctx} />
        <div role="group" aria-label={t("materialsLanding.archive.viewAs", "View as")} className="flex shrink-0 rounded-full bg-muted p-1">
          {ARCHIVE_VIEWS.map((option) => {
            const Icon = VIEW_ICONS[option];
            const label = t(`materialsLanding.archive.views.${option}`, option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                aria-label={label}
                title={label}
                data-view={option}
                onClick={() => chooseView(option)}
                className={cn(
                  "flex h-8 w-10 items-center justify-center rounded-full outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                  view === option ? "bg-background text-primary shadow-[0_1px_2px_rgba(14,31,59,0.08)]" : "text-muted-foreground hover:text-primary",
                )}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6" data-archive-view={view}>
        {view === "icons" ? (
          <IconsView ctx={ctx} />
        ) : (
          // The other three views are their own chunk: icons is what the page
          // pre-renders, and the initial bundle is at its budget.
          <Suspense fallback={<p className="text-sm text-muted-foreground">{t("materialsLanding.series.loading", "Loading…")}</p>}>
            {view === "list" && <ListView ctx={ctx} />}
            {view === "columns" && <ColumnsView ctx={ctx} compact={isMobile} />}
          </Suspense>
        )}
      </div>
    </div>
  );
}
