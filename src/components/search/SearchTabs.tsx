import type { ArchiveSearchType } from "@/types/search";
import { cn } from "@/lib/utils";

type SearchTabsProps = {
  activeType: ArchiveSearchType;
  onChange: (type?: ArchiveSearchType) => void;
};

const tabs: Array<{
  type: ArchiveSearchType;
  label: string;
}> = [
  { type: "all", label: "All records" },
  { type: "case", label: "Cases" },
  { type: "entity", label: "Entities" },
  { type: "material", label: "Materials" },
  { type: "courtcase", label: "Court cases" },
];

export function SearchTabs({ activeType, onChange }: Readonly<SearchTabsProps>) {
  return (
    <div
      aria-label="Record type"
      className="flex gap-6 overflow-x-auto border-b border-border sm:gap-8"
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.type === activeType;
        return (
          <button
            aria-selected={isActive}
            className={cn(
              "relative inline-flex min-h-11 shrink-0 items-center px-0.5 text-sm transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:bg-accent after:transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "font-semibold text-primary after:scale-x-100"
                : "font-medium text-muted-foreground after:scale-x-0 hover:text-primary",
            )}
            key={tab.type}
            onClick={() => onChange(tab.type === "all" ? undefined : tab.type)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
