import { useRef, type KeyboardEvent } from "react";

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

// "all" is the absence of a type filter, not a value the caller stores.
function typeParam(type: ArchiveSearchType) {
  return type === "all" ? undefined : type;
}

export function SearchTabs({ activeType, onChange }: Readonly<SearchTabsProps>) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Arrow/Home/End move the selection, i.e. the automatic-activation form of
  // the WAI-ARIA tabs pattern. These tabs already select on click, so matching
  // that on the keyboard keeps the two behaving the same.
  function moveTo(index: number) {
    const next = (index + tabs.length) % tabs.length;
    tabRefs.current[next]?.focus();
    onChange(typeParam(tabs[next].type));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const moves: Record<string, () => void> = {
      ArrowRight: () => moveTo(index + 1),
      ArrowLeft: () => moveTo(index - 1),
      Home: () => moveTo(0),
      End: () => moveTo(tabs.length - 1),
    };
    const move = moves[event.key];
    if (!move) return;
    // Left/Right would otherwise also scroll this overflow-x row, and Home/End
    // would jump the whole page.
    event.preventDefault();
    move();
  }

  return (
    <div
      aria-label="Record type"
      className="flex gap-6 overflow-x-auto border-b border-border sm:gap-8"
      role="tablist"
    >
      {tabs.map((tab, index) => {
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
            onClick={() => onChange(typeParam(tab.type))}
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            // Roving tabindex: the tablist is ONE tab stop, not five. Without
            // it every tab sat in the sequence, so Tab walked the whole row
            // instead of moving past it to the results.
            tabIndex={isActive ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
