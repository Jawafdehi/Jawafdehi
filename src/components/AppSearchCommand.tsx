import { useEffect, useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { normalizePath } from "@/data/route-patterns";
import { retiredBrowseType } from "@/lib/archive-redirect";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Bot,
  Building2,
  FileText,
  FileType,
  HeartHandshake,
  Home,
  Info,
  MessageCircle,
  MessagesSquare,
  Newspaper,
  Search,
  ShieldCheck,
  Users,
} from "@/components/icons";

import {
  buildFallbackSearchIndexEntries,
  type SearchIndexEntry,
  type SearchIndexFile,
  type SearchIndexGroup,
  type SearchIndexLine,
  type SearchIconName,
} from "@/data/site-routes";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type SearchItem = {
  title: string;
  description: string;
  to: string;
  keywords: string[];
  icon: typeof Search;
  group: SearchIndexGroup;
  lines: SearchIndexLine[];
  matchedLine?: SearchIndexLine;
  score?: number;
};

const MIN_DYNAMIC_SEARCH_TERM_LENGTH = 2;
const DEFAULT_VISIBLE_GROUPS = new Set<SearchIndexGroup>(["pages", "updates"]);
const MAX_VISIBLE_RESULTS = 24;

let cachedSearchIndexEntries: SearchIndexEntry[] | null = null;
let searchIndexRequest: Promise<SearchIndexEntry[]> | null = null;

const routeIcons: Record<SearchIconName, typeof Search> = {
  BookOpen,
  Bot,
  Building2,
  FileText,
  FileType,
  HeartHandshake,
  Home,
  Info,
  MessageCircle,
  MessagesSquare,
  Newspaper,
  Search,
  ShieldCheck,
  Users,
};

function isSearchIndexFile(value: unknown): value is SearchIndexFile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeIndex = value as Partial<SearchIndexFile>;
  return Array.isArray(maybeIndex.entries);
}

async function loadGeneratedSearchIndex(): Promise<SearchIndexEntry[]> {
  if (cachedSearchIndexEntries) {
    return cachedSearchIndexEntries;
  }

  searchIndexRequest ??= fetch("/search-index.json", {
    headers: { Accept: "application/json" },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Search index unavailable: ${response.status}`);
      }

      return response.json();
    })
    .then((data: unknown) => {
      if (!isSearchIndexFile(data)) {
        throw new Error("Search index response has an unexpected shape");
      }

      cachedSearchIndexEntries = data.entries;
      return data.entries;
    })
    .catch((error) => {
      searchIndexRequest = null;
      throw error;
    });

  return searchIndexRequest;
}

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase();
}

function getSearchTerms(value: string): string[] {
  return normalizeSearchText(value)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function textMatchesAllTerms(text: string, terms: string[]): boolean {
  const normalized = normalizeSearchText(text);
  return terms.every((term) => normalized.includes(term));
}

function findMatchedLine(lines: SearchIndexLine[], terms: string[]) {
  if (terms.length === 0) {
    return undefined;
  }

  return (
    lines.find((line) => textMatchesAllTerms(line.text, terms)) ??
    lines.find((line) =>
      terms.some((term) => normalizeSearchText(line.text).includes(term)),
    )
  );
}

function scoreSearchItem(item: SearchItem, terms: string[]): SearchItem | null {
  if (terms.length === 0) {
    return item;
  }

  const matchedLine = findMatchedLine(item.lines, terms);
  const searchableText = [
    item.title,
    item.description,
    item.to,
    item.keywords.join(" "),
    ...item.lines.map((line) => line.text),
  ].join(" ");

  if (!textMatchesAllTerms(searchableText, terms)) {
    return null;
  }

  let score = 0;
  if (textMatchesAllTerms(item.title, terms)) score += 80;
  if (textMatchesAllTerms(item.description, terms)) score += 35;
  if (textMatchesAllTerms(item.to, terms)) score += 25;
  if (textMatchesAllTerms(item.keywords.join(" "), terms)) score += 20;
  if (matchedLine) score += 50;

  return {
    ...item,
    matchedLine,
    score,
  };
}

function findQueryMatchIndex(text: string, query: string): number {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return -1;
  }

  return normalizeSearchText(text).indexOf(normalizeSearchText(normalizedQuery));
}

function buildMatchedSnippet(text: string, query: string, maxLength = 220): string {
  if (text.length <= maxLength) {
    return text;
  }

  const normalizedQuery = query.trim();
  const matchIndex = findQueryMatchIndex(text, normalizedQuery);

  if (matchIndex === -1) {
    return `${text.slice(0, maxLength - 1).trimEnd()}…`;
  }

  const contextLength = Math.max(0, Math.floor((maxLength - normalizedQuery.length) / 2));
  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(text.length, matchIndex + normalizedQuery.length + contextLength);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";

  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function renderHighlightedQuery(text: string, query: string) {
  const normalizedQuery = query.trim();
  const matchIndex = findQueryMatchIndex(text, normalizedQuery);

  if (!normalizedQuery || matchIndex === -1) {
    return text;
  }

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + normalizedQuery.length);
  const after = text.slice(matchIndex + normalizedQuery.length);

  return (
    <>
      {before}
      <strong className="font-medium text-primary">{match}</strong>
      {after}
    </>
  );
}

type AppSearchCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AppSearchCommand({ open, onOpenChange }: Readonly<AppSearchCommandProps>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fallbackEntries = useMemo(() => buildFallbackSearchIndexEntries(), []);
  const [searchIndexEntries, setSearchIndexEntries] =
    useState<SearchIndexEntry[]>(fallbackEntries);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let isMounted = true;

    loadGeneratedSearchIndex()
      .then((entries) => {
        if (isMounted) {
          // An index built (or cached at the edge) before /cases and
          // /courtcases folded into /search still lists them; offering a page
          // that only redirects is noise, so they never reach the list.
          setSearchIndexEntries(
            entries.filter((entry) => !retiredBrowseType(normalizePath(entry.path.split(/[?#]/)[0]))),
          );
        }
      })
      .catch(() => {
        if (isMounted) {
          setSearchIndexEntries(fallbackEntries);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fallbackEntries, open]);

  const searchItems = useMemo<SearchItem[]>(
    () =>
      searchIndexEntries.map((entry) => ({
        title: entry.titleKey ? t(entry.titleKey) : entry.title ?? entry.path,
        description: entry.descriptionKey
          ? t(entry.descriptionKey)
          : entry.description ?? "",
        to: entry.path,
        keywords: [...entry.keywords],
        icon: routeIcons[entry.icon] ?? Search,
        group: entry.group,
        lines: entry.lines ?? [],
      })),
    [searchIndexEntries, t],
  );

  const [searchValue, setSearchValue] = useState("");
  const searchTerms = useMemo(() => getSearchTerms(searchValue), [searchValue]);
  const isDynamicSearchEnabled = searchTerms.some(
    (term) => term.length >= MIN_DYNAMIC_SEARCH_TERM_LENGTH,
  );
  const visibleSearchItems = useMemo(
    () => {
      const searchableItems = isDynamicSearchEnabled
        ? searchItems
        : searchItems.filter((item) => DEFAULT_VISIBLE_GROUPS.has(item.group));
      const scoringTerms = searchTerms.length > 0 ? searchTerms : [];

      return searchableItems
        .map((item) => scoreSearchItem(item, scoringTerms))
        .filter((item): item is SearchItem => Boolean(item))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, MAX_VISIBLE_RESULTS);
    },
    [isDynamicSearchEnabled, searchItems, searchTerms],
  );

  const navigateTo = (item: SearchItem) => {
    onOpenChange(false);
    const sectionId = item.matchedLine?.sectionId;
    navigate(sectionId ? `${item.to}#${sectionId}` : item.to);
  };

  // The site search as a command palette, Raycast/Linear-style: one white
  // panel, a plain search line over a hairline, compact rows (icon, title, one
  // line) with the highlighted row in grey, keyboard hints at the foot. No
  // open/close animation: it is summoned many times a day, often from the
  // keyboard, and motion would only make it feel slower.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[10%] w-[calc(100vw-2rem)] max-w-[640px] translate-y-0 gap-0 overflow-hidden rounded-[24px] border border-border/70 bg-surface p-0 shadow-[0_24px_64px_-16px_hsl(var(--primary)/0.25)] data-[state=closed]:animate-none data-[state=open]:animate-none [&>button]:right-4 [&>button]:top-3.5 [&>button]:grid [&>button]:h-9 [&>button]:w-9 [&>button]:place-items-center [&>button]:rounded-full [&>button]:bg-muted [&>button]:text-muted-foreground [&>button]:opacity-100 [&>button]:transition-colors [&>button]:hover:bg-primary/[0.08] [&>button]:hover:text-primary">
        <DialogTitle className="sr-only">{t("searchCommand.title")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("searchCommand.description")}
        </DialogDescription>
        <Command
          shouldFilter={false}
          className="rounded-none bg-transparent [&_[cmdk-input-wrapper]]:h-16 [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-border/70 [&_[cmdk-input-wrapper]]:pl-5 [&_[cmdk-input-wrapper]]:pr-16 [&_[cmdk-input-wrapper]_svg]:mr-3 [&_[cmdk-input-wrapper]_svg]:h-[18px] [&_[cmdk-input-wrapper]_svg]:w-[18px] [&_[cmdk-input-wrapper]_svg]:text-muted-foreground [&_[cmdk-input-wrapper]_svg]:opacity-100"
        >
          <CommandInput
            autoFocus
            value={searchValue}
            onValueChange={setSearchValue}
            placeholder={t("searchCommand.placeholder")}
            className="font-input h-16 text-[17px] text-primary placeholder:text-muted-foreground"
          />
          <CommandList className="max-h-[min(440px,60vh)] overflow-y-auto p-2 scroll-py-2">
            {visibleSearchItems.length === 0 ? (
              <CommandEmpty className="p-0">
                <EmptyState compact kind="noResults" title={t("searchCommand.noResults")} />
              </CommandEmpty>
            ) : null}
            {visibleSearchItems.map((item) => {
              const Icon = item.icon;
              const matchedSnippet = item.matchedLine
                ? buildMatchedSnippet(item.matchedLine.text, searchValue)
                : undefined;
              const previewText = matchedSnippet ?? item.description;

              return (
                <CommandItem
                  key={item.to}
                  value={`${item.title} ${item.description} ${item.keywords.join(" ")}`}
                  onSelect={() => navigateTo(item)}
                  className="group flex min-h-14 cursor-pointer items-center gap-3.5 rounded-2xl px-3 py-2.5 text-primary data-[selected=true]:bg-muted data-[selected=true]:text-primary"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-primary group-data-[selected=true]:bg-surface">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] leading-6">{item.title}</span>
                    {previewText ? (
                      <span className="block truncate text-sm leading-5 text-muted-foreground">
                        {renderHighlightedQuery(previewText, searchValue)}
                      </span>
                    ) : null}
                  </span>
                </CommandItem>
              );
            })}
          </CommandList>
          {/* How to drive it from the keyboard; hidden on touch screens. */}
          <div className="hidden items-center gap-4 border-t border-border/70 px-5 py-3 text-[13px] text-muted-foreground sm:flex" aria-hidden="true">
            <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd>{t("searchCommand.hintMove", "to move")}</span>
            <span className="flex items-center gap-1.5"><Kbd>↵</Kbd>{t("searchCommand.hintOpen", "to open")}</span>
            <span className="flex items-center gap-1.5"><Kbd>esc</Kbd>{t("searchCommand.hintClose", "to close")}</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <kbd className="inline-grid h-5 min-w-5 place-items-center rounded-md border border-border/70 bg-muted px-1 font-sans text-xs leading-none text-primary">
      {children}
    </kbd>
  );
}
