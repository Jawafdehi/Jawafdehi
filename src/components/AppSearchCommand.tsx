import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Building2,
  FileText,
  HeartHandshake,
  Home,
  Info,
  MessageCircle,
  Newspaper,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

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
  Building2,
  FileText,
  HeartHandshake,
  Home,
  Info,
  MessageCircle,
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
      <strong className="font-semibold text-foreground">{match}</strong>
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
          setSearchIndexEntries(entries);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[10%] w-[calc(100vw-2rem)] max-w-[640px] translate-y-0 overflow-hidden rounded-2xl border border-border/70 bg-background p-5 shadow-xl shadow-foreground/20 backdrop-blur-xl sm:p-6 data-[state=closed]:slide-out-to-top-4 data-[state=open]:slide-in-from-top-4 [&>button]:right-5 [&>button]:top-5 [&>button]:grid [&>button]:h-11 [&>button]:w-11 [&>button]:place-items-center [&>button]:rounded-full [&>button]:border [&>button]:border-border/60 [&>button]:bg-secondary/80 [&>button]:text-muted-foreground [&>button]:opacity-100 [&>button]:shadow-none [&>button]:transition-colors [&>button]:hover:bg-secondary [&>button]:hover:text-foreground sm:[&>button]:right-6 sm:[&>button]:top-6">
        <DialogTitle className="sr-only">{t("searchCommand.title")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("searchCommand.description")}
        </DialogDescription>
        <Command
          shouldFilter={false}
          className="rounded-none bg-transparent [&_[cmdk-input-wrapper]]:mb-7 [&_[cmdk-input-wrapper]]:mr-14 [&_[cmdk-input-wrapper]]:h-12 [&_[cmdk-input-wrapper]]:rounded-2xl [&_[cmdk-input-wrapper]]:!border [&_[cmdk-input-wrapper]]:!border-border/60 [&_[cmdk-input-wrapper]]:bg-secondary/45 [&_[cmdk-input-wrapper]]:px-4 [&_[cmdk-input-wrapper]]:shadow-inner [&_[cmdk-input-wrapper]]:shadow-foreground/[0.03] [&_[cmdk-input-wrapper]_svg]:mr-3 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input-wrapper]_svg]:text-muted-foreground [&_[cmdk-input-wrapper]_svg]:opacity-80"
        >
          <CommandInput
            autoFocus
            value={searchValue}
            onValueChange={setSearchValue}
            placeholder={t("searchCommand.placeholder")}
            className="font-input h-12 placeholder:text-muted-foreground/70"
          />
          <CommandList className="max-h-[min(460px,62vh)] space-y-2.5 overflow-y-auto rounded-xl bg-transparent pr-1 scroll-py-3">
            {visibleSearchItems.length === 0 ? (
              <CommandEmpty className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-10 text-center text-sm text-muted-foreground">
                {t("searchCommand.noResults")}
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
                  className="group mb-2.5 flex min-h-[82px] cursor-pointer items-center gap-4 overflow-hidden rounded-xl border border-border/55 bg-background px-4 py-3.5 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] transition-[background-color,border-color,box-shadow] last:mb-0 hover:border-border/80 hover:bg-secondary/25 data-[selected=true]:border-border/80 data-[selected=true]:bg-secondary/55 data-[selected=true]:text-foreground data-[selected=true]:shadow-[0_2px_8px_hsl(var(--foreground)/0.06)]"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 transition-colors dark:bg-slate-800/70 dark:text-slate-300 group-data-[selected=true]:bg-background/85">
                    <Icon className="h-[15px] w-[15px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-nav block truncate">
                      {item.title}
                    </span>
                    <span className="font-meta mt-1.5 block min-h-9 line-clamp-2 text-muted-foreground/85">
                      {previewText
                        ? renderHighlightedQuery(previewText, searchValue)
                        : "\u00A0"}
                    </span>
                  </span>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
