import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight, FileText, Folder } from "@/components/icons";
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
import { formatArchiveCount, pickLocalized } from "@/lib/materials-landing";
import { cn } from "@/lib/utils";
import { searchArchive } from "@/services/search-api";

import { CountLabel, describe, key, SeeDocuments, type Ctx } from "./ArchiveBrowser";

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
    <ul ref={treeRef} role="tree" aria-label={t("materialsLanding.archive.title", "Browse the archive")} className="list-none border-t border-border/70">
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
              "flex min-h-14 cursor-pointer items-center gap-3 border-b border-border/70 py-3 pr-3 text-base outline-none transition-colors duration-150",
              "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              id === selectedKey && "bg-muted/60",
            )}
            style={{ paddingLeft: `${(row.level - 1) * 1.5 + 0.5}rem` }}
          >
            <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
              {isBranch ? (
                <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
              ) : null}
            </span>
            {isBranch ? (
              <Folder aria-hidden="true" className={cn("h-[18px] w-[18px] shrink-0", row.level === 1 ? "text-primary" : "text-muted-foreground")} />
            ) : (
              <FileText aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            )}
            <span title={nodeName(row.node, language)} className="min-w-0 flex-1 break-words leading-snug text-primary">
              {nodeName(row.node, language)}
            </span>
            {!isBranch && (
              <Link
                to={leafHref(row.node as never)}
                tabIndex={-1}
                onClick={(event) => event.stopPropagation()}
                className="group inline-flex shrink-0 items-center gap-1 text-[15px] text-muted-foreground transition-colors hover:text-primary"
              >
                {t("materialsLanding.archive.seeDocuments", "View all")}
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
              </Link>
            )}
            <CountLabel node={row.node} ctx={ctx} compact className="shrink-0 text-right text-muted-foreground sm:w-32" />
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
      <h4 className="px-3 text-sm text-muted-foreground">
        {t("materialsLanding.archive.recent", "Recent documents")}
      </h4>
      {/* The documents as rows, in the same shape as the folder rows beside
          them: file icon, the title, the same rounded hover. */}
      <ul className="mt-1.5 list-none">
        {data.results.map((result) => (
          <li key={result.id}>
            <Link
              to={result.url}
              className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-base leading-6 text-primary transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileText aria-hidden="true" className="mt-[3px] h-[18px] w-[18px] shrink-0 text-muted-foreground" />
              <span className="line-clamp-2 min-w-0">
                {pickLocalized(result.title, i18n.language) || t("materialsLanding.recent.untitled", "Untitled document")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Preview({ node, nodePath, ctx, large = false }: Readonly<{ node: ArchiveNode; nodePath: string[]; ctx: Ctx; large?: boolean }>) {
  const { t } = useTranslation();
  return (
    // No card of its own: the preview is one more column of the browser, set
    // straight on the page like the folder lists beside it.
    <div data-preview={node.slug} className={large ? "py-2" : "py-1.5"}>
      <div className="px-3">
        <h3 className={cn("font-home-display leading-[1.15] text-primary", large ? "text-3xl" : "text-2xl")}>
          {nodeName(node, ctx.language)}
        </h3>
        <CountLabel node={node} ctx={ctx} className="mt-1.5 block text-base text-muted-foreground" />
        {describe(node, ctx.language) && (
          <p className="mt-3 max-w-2xl text-base leading-7 text-foreground/75">{describe(node, ctx.language)}</p>
        )}
      </div>
      <RecentDocuments node={node} />
      <div className="mt-5 px-3">
          {node.type === "leaf" ? (
            <SeeDocuments node={node} />
          ) : (
            <button
              type="button"
              onClick={() => ctx.select([...nodePath, node.children[0].slug], true)}
              className="group inline-flex items-center gap-1.5 text-base font-medium text-primary transition-colors hover:text-accent"
            >
              {t("materialsLanding.archive.open", "Open")}
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
            </button>
          )}
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
    // A series' preview on a phone has no rows at all: focus its View all link
    // (or the Back button), so the keyboard can carry on from there.
    const target =
      selected?.[selected.length - 1] ??
      wrapRef.current?.querySelector<HTMLElement>('[role="option"]') ??
      wrapRef.current?.querySelector<HTMLElement>("[data-preview] a") ??
      wrapRef.current?.querySelector<HTMLElement>("[data-back]");
    target?.focus();
  });
  useEffect(() => {
    // Keep the newest column in view as the selection moves right.
    const el = wrapRef.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, [path.length]);

  // Up/Down replace the history entry (moving within a column); drilling in or
  // out pushes one, like clicking a folder does, so Back retraces the levels.
  const move = (next: string[], push = false) => {
    focusRequested.current = true;
    ctx.select(next, push);
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
        if (node.type === "branch") move([...nodePath, node.children[0].slug], true);
        break;
      case "ArrowLeft":
        if (column.at.length) move(column.at, true);
        break;
      case "Enter":
        if (node.type === "branch") move([...nodePath, node.children[0].slug], true);
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
        className={cn("list-none p-1.5", compact ? "w-full" : "w-80 shrink-0 border-r border-border/70")}
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
                "flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-base leading-6 text-primary outline-none transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "bg-muted" : "hover:bg-muted/50",
              )}
            >
              {node.type === "branch" ? (
                <Folder aria-hidden="true" className="mt-[3px] h-[18px] w-[18px] shrink-0 text-muted-foreground" />
              ) : (
                <FileText aria-hidden="true" className="mt-[3px] h-[18px] w-[18px] shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 break-words">{nodeName(node, language)}</span>
              <span className="mt-px shrink-0 text-[15px] tabular-nums text-muted-foreground">
                {nodeCount(node, ctx.catalogue) === null ? "—" : formatArchiveCount(nodeCount(node, ctx.catalogue) ?? 0, language)}
              </span>
              {node.type === "branch" && <ChevronRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/70" />}
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
      <div
        ref={wrapRef}
        className="overflow-hidden rounded-[20px] border border-border/70"
        onKeyDown={(event) => {
          // Left from anywhere outside the rows (the preview, the Back button)
          // goes back, like Left on a row does.
          if (event.key !== "ArrowLeft" || (event.target as HTMLElement).getAttribute("role") === "option") return;
          if (!backTo.length && last?.type !== "leaf" && !parentPath.length) return;
          event.preventDefault();
          focusRequested.current = true;
          ctx.select(backTo, true);
        }}
      >
        {(last?.type === "leaf" || parentPath.length > 0) && (
          <button
            type="button"
            data-back
            onClick={() => {
              focusRequested.current = true;
              ctx.select(backTo, true);
            }}
            className="flex min-h-11 w-full items-center gap-1.5 border-b border-border/70 px-4 py-2 text-[15px] text-primary transition-colors hover:bg-muted/50"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            {backTo.length ? nodeName(chain[backTo.length - 1], language) : t("materialsLanding.archive.root", "Archive")}
          </button>
        )}
        {last?.type === "leaf" ? (
          <div className="p-1.5">
            <Preview node={last} nodePath={path} ctx={ctx} />
          </div>
        ) : (
          renderColumn(column, columns.length - 1)
        )}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="flex min-h-[28rem] overflow-x-auto rounded-[20px] border border-border/70">
      {columns.map(renderColumn)}
      {last?.type === "leaf" && (
        <div className="min-w-[18rem] flex-1 p-1.5">
          <Preview node={last} nodePath={path} ctx={ctx} />
        </div>
      )}
    </div>
  );
}
