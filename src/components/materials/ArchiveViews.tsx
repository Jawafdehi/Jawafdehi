import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileText, Folder } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  childrenAt,
  leafHref,
  leafSeries,
  leavesUnder,
  nodeCount,
  nodeName,
  resolvePath,
  type ArchiveNode,
} from "@/data/archive-folders";
import { seriesScope } from "@/data/material-series";
import { folderTintClass, formatArchiveCount, pickLocalized } from "@/lib/materials-landing";
import { cn } from "@/lib/utils";
import { searchArchive } from "@/services/search-api";

import { CountLabel, describe, key, SeeDocuments, tintOf, type Ctx } from "./ArchiveBrowser";

/** The list and columns views of the archive browser (lazy chunk). */

// ── List ───────────────────────────────────────────────────────────────────

interface Row {
  node: ArchiveNode;
  path: string[];
  level: number;
}

export function ListView({ ctx }: Readonly<{ ctx: Ctx }>) {
  const { tree, path, language } = ctx;
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const open = new Set<string>();
    for (let i = 1; i <= path.length; i += 1) open.add(key(path.slice(0, i)));
    return open;
  });
  // A selection made elsewhere (columns, a link) opens its ancestors here.
  useEffect(() => {
    setExpanded((current) => {
      const next = new Set(current);
      for (let i = 1; i < path.length; i += 1) next.add(key(path.slice(0, i)));
      return next.size === current.size ? current : next;
    });
  }, [path]);

  const rows: Row[] = [];
  const walk = (nodes: readonly ArchiveNode[], above: string[], level: number) => {
    for (const node of nodes) {
      const nodePath = [...above, node.slug];
      rows.push({ node, path: nodePath, level });
      if (node.type === "branch" && expanded.has(key(nodePath))) walk(node.children, nodePath, level + 1);
    }
  };
  walk(tree, [], 1);

  const treeRef = useRef<HTMLUListElement>(null);
  const selectedKey = key(path);
  const focusKey = rows.some((row) => key(row.path) === selectedKey) ? selectedKey : key(rows[0]?.path ?? []);
  const focusRequested = useRef(false);
  useEffect(() => {
    if (!focusRequested.current) return;
    focusRequested.current = false;
    treeRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusKey)}"]`)?.focus();
  });

  const toggle = (rowPath: string[], open?: boolean) =>
    setExpanded((current) => {
      const next = new Set(current);
      const id = key(rowPath);
      const willOpen = open ?? !next.has(id);
      if (willOpen) next.add(id);
      else next.delete(id);
      return next;
    });

  const move = (rowPath: string[]) => {
    focusRequested.current = true;
    ctx.select(rowPath);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLLIElement>, row: Row, index: number) => {
    const id = key(row.path);
    const isOpen = row.node.type === "branch" && expanded.has(id);
    switch (event.key) {
      case "ArrowDown":
        if (rows[index + 1]) move(rows[index + 1].path);
        break;
      case "ArrowUp":
        if (rows[index - 1]) move(rows[index - 1].path);
        break;
      case "ArrowRight":
        if (row.node.type !== "branch") return;
        if (!isOpen) toggle(row.path, true);
        else if (rows[index + 1]) move(rows[index + 1].path);
        break;
      case "ArrowLeft":
        if (isOpen) toggle(row.path, false);
        else if (row.path.length > 1) move(row.path.slice(0, -1));
        break;
      case "Enter":
      case " ":
        if (row.node.type === "branch") toggle(row.path);
        else if (event.key === "Enter") ctx.openLeaf(row.path);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <ul ref={treeRef} role="tree" aria-label={t("materialsLanding.archive.title", "Browse the archive")} className="list-none border-y border-border">
      {rows.map((row, index) => {
        const id = key(row.path);
        const isBranch = row.node.type === "branch";
        const isOpen = isBranch && expanded.has(id);
        return (
          <li
            key={id}
            role="treeitem"
            data-key={id}
            data-node={row.node.slug}
            aria-level={row.level}
            aria-expanded={isBranch ? isOpen : undefined}
            aria-selected={id === selectedKey}
            tabIndex={id === focusKey ? 0 : -1}
            onKeyDown={(event) => onKeyDown(event, row, index)}
            onClick={(event) => {
              event.stopPropagation();
              ctx.select(row.path);
              if (isBranch) toggle(row.path);
            }}
            className={cn(
              "flex cursor-pointer items-center gap-2 border-b border-border/60 py-2 pr-2 text-sm outline-none last:border-b-0",
              "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
              id === selectedKey && "bg-muted/70",
            )}
            style={{ paddingLeft: `${(row.level - 1) * 1.5 + 0.5}rem` }}
          >
            <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
              {isBranch ? (
                <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
              ) : null}
            </span>
            {isBranch ? (
              <Folder aria-hidden="true" className={cn("h-4 w-4 shrink-0", row.level === 1 ? "text-primary" : "text-muted-foreground")} />
            ) : (
              <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span title={nodeName(row.node, language)} className={cn("min-w-0 flex-1 truncate", row.level === 1 ? "font-semibold text-foreground" : "text-foreground")}>
              {nodeName(row.node, language)}
            </span>
            {!isBranch && (
              <Link
                to={leafHref(row.node as never)}
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
                className="shrink-0 text-xs font-semibold text-primary hover:text-accent"
              >
                {t("materialsLanding.archive.seeDocuments", "View all")} →
              </Link>
            )}
            <CountLabel node={row.node} ctx={ctx} className="w-32 shrink-0 text-right text-muted-foreground" />
          </li>
        );
      })}
    </ul>
  );
}

// ── Preview (columns' last pane) ───────────────────────────

function RecentDocuments({ node }: Readonly<{ node: ArchiveNode }>) {
  const { t, i18n } = useTranslation();
  const scope =
    node.type === "leaf"
      ? seriesScope(leafSeries(node))
      : { source: [...new Set(leavesUnder(node).map((leaf) => leaf.source))].slice(0, 20) };
  const { data, isPending } = useQuery({
    queryKey: ["archive-preview", node.type, node.slug] as const,
    queryFn: () => searchArchive({ type: "material", sort: "newest", page_size: 3, ...scope }),
    staleTime: 5 * 60 * 1000,
  });
  if (isPending) return <p className="mt-4 text-sm text-muted-foreground">{t("materialsLanding.series.loading", "Loading…")}</p>;
  if (!data?.results.length) return null;
  return (
    <div className="mt-6">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("materialsLanding.archive.recent", "Recent documents")}
      </h4>
      <ul className="mt-2 list-none space-y-1.5">
        {data.results.map((result) => (
          <li key={result.id} className="flex items-start gap-2 text-sm">
            <FileText aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <Link to={result.url} className="line-clamp-2 text-foreground hover:text-primary">
              {pickLocalized(result.title, i18n.language) || t("materialsLanding.recent.untitled", "Untitled document")}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Preview({ node, nodePath, ctx, large = false }: Readonly<{ node: ArchiveNode; nodePath: string[]; ctx: Ctx; large?: boolean }>) {
  const { t } = useTranslation();
  const chain = resolvePath(ctx.tree, nodePath) ?? [];
  const trail = chain.slice(0, -1).map((step) => nodeName(step, ctx.language)).join(" › ");
  return (
    <div data-preview={node.slug} className={cn("rounded-2xl p-1.5", folderTintClass(node.type === "branch" ? node.tint : tintOf(ctx.tree, nodePath)))}>
      <div className={cn("rounded-xl bg-surface/80 backdrop-blur-[12px]", large ? "p-6 md:p-8" : "p-5")}>
        {trail && <p className="text-xs text-muted-foreground">{trail}</p>}
        <h3 className={cn("mt-1 font-medium leading-tight text-primary", large ? "text-3xl" : "text-xl")}>
          {nodeName(node, ctx.language)}
        </h3>
        <CountLabel node={node} ctx={ctx} className={cn("mt-2 block font-semibold text-primary", large ? "text-2xl" : "text-lg")} />
        {describe(node, ctx.language) && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/80">{describe(node, ctx.language)}</p>
        )}
        <RecentDocuments node={node} />
        <div className="mt-6">
          {node.type === "leaf" ? (
            <SeeDocuments node={node} />
          ) : (
            <button
              type="button"
              onClick={() => ctx.select([...nodePath, node.children[0].slug], true)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-accent"
            >
              {t("materialsLanding.archive.open", "Open")}
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Columns ────────────────────────────────────────────────────────────────

export function ColumnsView({ ctx, compact }: Readonly<{ ctx: Ctx; compact: boolean }>) {
  const { tree, path, language } = ctx;
  const { t } = useTranslation();
  const chain = resolvePath(tree, path) ?? [];
  const last = chain[chain.length - 1];
  const columns: { at: string[]; items: readonly ArchiveNode[] }[] = [{ at: [], items: tree }];
  chain.forEach((node, index) => {
    if (node.type === "branch") columns.push({ at: path.slice(0, index + 1), items: node.children });
  });
  const wrapRef = useRef<HTMLDivElement>(null);
  const focusRequested = useRef(false);
  useEffect(() => {
    if (!focusRequested.current) return;
    focusRequested.current = false;
    const selected = wrapRef.current?.querySelectorAll<HTMLElement>('[aria-selected="true"]');
    // After a drill-down (phone) the selected folder is no longer on screen:
    // focus the first row of the column now shown instead of losing focus.
    const target =
      selected?.[selected.length - 1] ?? wrapRef.current?.querySelector<HTMLElement>('[role="option"]');
    target?.focus();
  });
  useEffect(() => {
    // Keep the newest column in view as the selection moves right.
    const el = wrapRef.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, [path.length]);

  const move = (next: string[]) => {
    focusRequested.current = true;
    ctx.select(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, column: (typeof columns)[number], index: number) => {
    const node = column.items[index];
    const nodePath = [...column.at, node.slug];
    if (compact) {
      // Phone: one column at a time, so arrows only move focus; selecting a
      // folder would drill into it and take the focused row off screen.
      const rows = [...(wrapRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
      switch (event.key) {
        case "ArrowDown":
          rows[index + 1]?.focus();
          break;
        case "ArrowUp":
          rows[index - 1]?.focus();
          break;
        case "ArrowRight":
        case "Enter":
          focusRequested.current = true;
          ctx.select(nodePath, true);
          break;
        case "ArrowLeft":
          if (column.at.length) {
            focusRequested.current = true;
            ctx.select(column.at.slice(0, -1), true);
          }
          break;
        default:
          return;
      }
      event.preventDefault();
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        if (column.items[index + 1]) move([...column.at, column.items[index + 1].slug]);
        break;
      case "ArrowUp":
        if (column.items[index - 1]) move([...column.at, column.items[index - 1].slug]);
        break;
      case "ArrowRight":
        if (node.type === "branch") move([...nodePath, node.children[0].slug]);
        break;
      case "ArrowLeft":
        if (column.at.length) move(column.at);
        break;
      case "Enter":
        if (node.type === "branch") move([...nodePath, node.children[0].slug]);
        else ctx.openLeaf(nodePath);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const renderColumn = (column: (typeof columns)[number], ci: number) => {
    const selectedSlug = path[column.at.length];
    const focusSlug = selectedSlug ?? column.items[0]?.slug;
    return (
      <ul
        key={key(column.at) || "root"}
        role="listbox"
        aria-label={column.at.length ? nodeName(chain[column.at.length - 1], language) : t("materialsLanding.archive.root", "Archive")}
        data-col={ci}
        className={cn("list-none py-1", compact ? "w-full" : "w-64 shrink-0 border-r border-border")}
      >
        {column.items.map((node, index) => {
          const selected = node.slug === selectedSlug;
          return (
            <li
              key={node.slug}
              role="option"
              title={nodeName(node, language)}
              data-node={node.slug}
              aria-selected={selected}
              tabIndex={node.slug === focusSlug ? 0 : -1}
              onClick={() => ctx.select([...column.at, node.slug], true)}
              onKeyDown={(event) => onKeyDown(event, column, index)}
              className={cn(
                "mx-1 flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm outline-none",
                "focus-visible:ring-2 focus-visible:ring-accent",
                selected ? "bg-primary text-primary-foreground" : "hover:bg-muted/60",
              )}
            >
              {node.type === "branch" ? (
                <Folder aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
              ) : (
                <FileText aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
              )}
              <span className="min-w-0 flex-1 break-words leading-snug">{nodeName(node, language)}</span>
              <span className={cn("shrink-0 text-xs tabular-nums", selected ? "opacity-80" : "text-muted-foreground")}>
                {nodeCount(node, ctx.catalogue) === null ? "—" : formatArchiveCount(nodeCount(node, ctx.catalogue) ?? 0, language)}
              </span>
              {node.type === "branch" && <ChevronRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />}
            </li>
          );
        })}
      </ul>
    );
  };

  if (compact) {
    // Phone: one column at a time, drilling down; a series shows its preview.
    const parentPath = last?.type === "leaf" ? path.slice(0, -1) : path;
    // Back from a series preview returns to the list it was picked from (its
    // office); back from a folder's list goes up one folder.
    const backTo = last?.type === "leaf" ? parentPath : parentPath.slice(0, -1);
    const column = columns[columns.length - 1];
    return (
      <div ref={wrapRef} className="rounded-xl border border-border">
        {(last?.type === "leaf" || parentPath.length > 0) && (
          <button
            type="button"
            onClick={() => ctx.select(backTo, true)}
            className="flex w-full items-center gap-1 border-b border-border px-3 py-2 text-sm text-primary"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            {backTo.length ? nodeName(chain[backTo.length - 1], language) : t("materialsLanding.archive.root", "Archive")}
          </button>
        )}
        {last?.type === "leaf" ? (
          <div className="p-2">
            <Preview node={last} nodePath={path} ctx={ctx} />
          </div>
        ) : (
          renderColumn(column, columns.length - 1)
        )}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="flex min-h-[24rem] overflow-x-auto rounded-xl border border-border">
      {columns.map(renderColumn)}
      {last?.type === "leaf" && (
        <div className="min-w-[16rem] flex-1 p-3">
          <Preview node={last} nodePath={path} ctx={ctx} />
        </div>
      )}
    </div>
  );
}
