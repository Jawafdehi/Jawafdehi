import { useEffect, useState } from "react";
import { listCases } from "@/services/admin-api";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, Search } from "lucide-react";

// A case as returned by GET /api/cases/ (only the fields the picker needs).
interface CaseHit {
  slug: string;
  title?: string;
  state?: string;
}

const MIN_QUERY = 2;

// Server-backed case autocomplete for submitting a review. Debounced query →
// GET /api/cases/?search= (full-text over title/description/key_allegations);
// picking a case yields its canonical slug, which the caller submits verbatim.
export function CaseSearchCombobox({
  onPick,
  disabled,
}: {
  onPick: (slug: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<CaseHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      return;
    }
    // `active` flips false on cleanup (a newer query, or unmount), so a slow
    // earlier request can't overwrite fresher results or set state after unmount.
    let active = true;
    setLoading(true);
    listCases<CaseHit>({ search: debounced, page_size: 10 })
      .then((page) => {
        if (active) setResults(page.results ?? []);
      })
      .catch(() => {
        if (active) setResults([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debounced]);

  const pick = (slug: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    onPick(slug);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-start font-normal text-muted-foreground"
        >
          <Search className="h-4 w-4 mr-2 shrink-0" />
          Search a case to review…
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[20rem]" align="start">
        {/* shouldFilter=false — results come pre-filtered from the server. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search cases by title…"
          />
          <CommandList>
            {loading && (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
              </div>
            )}
            {!loading && (
              <CommandEmpty>
                {debounced.length < MIN_QUERY
                  ? "Type at least 2 characters."
                  : "No matching cases."}
              </CommandEmpty>
            )}
            {results.map((c) => (
              <CommandItem
                key={c.slug}
                value={c.slug}
                onSelect={() => pick(c.slug)}
                className="flex flex-col items-start gap-0.5"
              >
                <span className="text-sm font-medium truncate w-full">{c.title || c.slug}</span>
                <span className="font-mono text-xs text-slate-400 truncate w-full">
                  {c.slug}
                  {c.state ? ` · ${c.state}` : ""}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
