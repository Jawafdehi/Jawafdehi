import type { ArchiveSearchResponse, ArchiveSearchType } from "@/types/search";
import { cn } from "@/lib/utils";

type SearchTabsProps = {
  counts: ArchiveSearchResponse["counts"];
  activeType: ArchiveSearchType;
  onChange: (type: ArchiveSearchType) => void;
};

const tabs: Array<{
  type: ArchiveSearchType;
  label: string;
  // "all" has no per-type count; the others map to a counts key.
  countKey?: keyof ArchiveSearchResponse["counts"];
}> = [
  { type: "all", label: "All results" },
  { type: "case", label: "Cases", countKey: "case" },
  { type: "entity", label: "Entities", countKey: "entity" },
  { type: "material", label: "Materials", countKey: "material" },
  { type: "courtcase", label: "Court cases", countKey: "courtcase" },
];

export function SearchTabs({ counts, activeType, onChange }: Readonly<SearchTabsProps>) {
  return (
    <div
      aria-label="Search result type"
      className="flex gap-2 overflow-x-auto pb-1"
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.type === activeType;
        return (
          <button
            aria-selected={isActive}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
            key={tab.type}
            onClick={() => onChange(tab.type)}
            role="tab"
            type="button"
          >
            {tab.label}
            {tab.countKey ? (
              <span className="tabular-nums opacity-75">
                {counts[tab.countKey] ?? 0}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
