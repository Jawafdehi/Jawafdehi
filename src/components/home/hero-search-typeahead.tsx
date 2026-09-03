// SPDX-License-Identifier: Hippocratic-3.0
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FileSearch } from "lucide-react";

import { SearchBar } from "@/components/ui/search-bar";
import { searchArchive } from "@/services/search-api";
import { cn } from "@/lib/utils";
import type { ArchiveSearchResult, BilingualText } from "@/types/search";

// Auto-language, same policy as SearchResultCard: prefer English, fall back to
// Nepali, strip the <em> highlight tags the search service embeds in snippets.
function pickLang(text: BilingualText | undefined): string {
  const value = text?.en || text?.ne || "";
  return value.replace(/<\/?em>/g, "");
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;
const SUGGESTION_COUNT = 5;

/**
 * The hero's search pill, upgraded to a WAI-ARIA combobox with inline case
 * suggestions.
 *
 * - Suggestions are the top {@link SUGGESTION_COUNT} case matches from the
 *   unified search API, fetched through React Query with a
 *   {@link DEBOUNCE_MS}ms debounce so a fast typist costs one request, not one
 *   per keystroke.
 * - Full keyboard support: ↑/↓ move the active option (wrapping), Enter on an
 *   active option opens that case, Enter with nothing active submits the form
 *   exactly as before (navigates to /search?type=case&q=…), Escape closes the
 *   list without losing the typed text.
 * - The listbox only ever renders after client-side typing, so nothing here can
 *   appear in (or change) the pre-rendered home HTML.
 */
export function HeroSearchTypeahead() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const listboxId = useId();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Index into the option list; -1 = no option active (Enter submits the form).
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  const trimmed = debouncedQuery.trim();
  const { data } = useQuery({
    queryKey: ["hero-case-typeahead", trimmed],
    queryFn: () =>
      searchArchive({
        q: trimmed,
        type: "case",
        sort: "relevance",
        page_size: SUGGESTION_COUNT,
      }),
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
    staleTime: 60 * 1000,
  });

  const suggestions: ArchiveSearchResult[] = useMemo(
    () => (trimmed.length >= MIN_QUERY_LENGTH ? (data?.results ?? []).slice(0, SUGGESTION_COUNT) : []),
    [data, trimmed],
  );

  // Reset the active option whenever the option set changes, so a stale index
  // never points at a different case than the one that was highlighted.
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  const showList = open && suggestions.length > 0;

  const goToSearch = (value: string) => {
    const params = new URLSearchParams({ type: "case" });
    const q = value.trim();
    if (q) params.set("q", q);
    setOpen(false);
    navigate(`/search?${params.toString()}`);
  };

  const goToSuggestion = (result: ArchiveSearchResult) => {
    setOpen(false);
    navigate(result.url);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeIndex >= 0 && activeIndex < suggestions.length) {
      goToSuggestion(suggestions[activeIndex]);
      return;
    }
    goToSearch(query);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (showList) {
        // Swallow it only while the list is open, so Escape still reaches
        // dialogs/overlays when there is nothing of ours to close.
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
      return;
    }
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    }
  };

  return (
    <form className="mt-8 w-full max-w-2xl" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="hero-archive-search">
        {t("home.hero.searchLabel")}
      </label>

      <div className="relative" ref={containerRef}>
        <SearchBar
          id="hero-archive-search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          inputClassName="h-14 rounded-full border-transparent bg-background text-base shadow-[0_24px_60px_-20px_hsl(var(--primary-foreground)/0.25)]"
          buttonClassName="h-11 w-11 bg-accent text-accent-foreground hover:bg-accent/90"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Let a click on an option win the race against blur-close; the
            // options cancel the blur via onMouseDown preventDefault below,
            // so this only fires when focus truly leaves the combobox.
            setOpen(false);
          }}
          onKeyDown={onKeyDown}
          placeholder={t("home.hero.searchPlaceholder")}
          submitLabel={t("home.hero.searchSubmit")}
          value={query}
        />

        {showList && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={t("home.hero.suggestionsLabel")}
            className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border/70 bg-background p-1.5 text-left shadow-[0_24px_60px_-20px_hsl(var(--foreground)/0.35)]"
          >
          {suggestions.map((result, index) => (
            <li
              key={result.id}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-foreground transition-colors",
                index === activeIndex ? "bg-secondary/70" : "hover:bg-secondary/40",
              )}
              // preventDefault keeps the input focused so the blur handler
              // above cannot close the list before this click lands.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => goToSuggestion(result)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <FileSearch
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-muted-foreground"
              />
              <span className="line-clamp-1 min-w-0 flex-1 font-medium">
                {pickLang(result.title)}
              </span>
              <ArrowRight
                aria-hidden="true"
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-opacity",
                  index === activeIndex ? "opacity-100" : "opacity-0",
                )}
              />
            </li>
          ))}
          </ul>
        )}
      </div>
    </form>
  );
}
