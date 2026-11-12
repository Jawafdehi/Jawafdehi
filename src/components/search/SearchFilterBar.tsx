// The archive search's filters as a row of chips under the search bar: one chip
// per filter the current tab offers, each opening its control in a popover, and
// "All filters" opening every group at once. A chip with a value applied fills
// navy and names it ("Bagmati +1"), with an × that clears that one filter — so
// what is in force reads at a glance, without a separate row of pills.
//
// The popovers hold the SAME controls as the "All filters" sheet (FilterGroup,
// the amount presets, the date range); this component only arranges them.
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { DateRangeFilter } from "@/components/search/DateRangeFilter";
import {
  filterGroupsFor,
  showsBigo,
  showsDate,
} from "@/components/search/filter-groups";
import { LazyBigoRangeFilter } from "@/components/search/LazyBigoRangeFilter";
import {
  FilterGroup,
  type SidebarFilterName,
} from "@/components/search/SearchFilters";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { BigoExtent } from "@/lib/bigo-range";
import type { DateBounds } from "@/lib/date-range";
import { cn } from "@/lib/utils";
import type { ArchiveSearchFacets, ArchiveSearchType } from "@/types/search";
import { getFacetItemLabel } from "@/utils/case-entities";

type SearchFilterBarProps = {
  facets: ArchiveSearchFacets;
  selected: Record<SidebarFilterName, string[]>;
  selectedType?: ArchiveSearchType;
  onToggle: (name: SidebarFilterName, value: string) => void;
  onClearGroup: (name: SidebarFilterName) => void;
  bigoExtent?: BigoExtent;
  bigoMin?: number;
  bigoMax?: number;
  /** The applied amount range as the result pills spelled it, for the chip. */
  bigoLabel?: string;
  onBigoCommit: (bounds: { min?: number; max?: number }) => void;
  dateFrom?: string;
  dateTo?: string;
  dateLabel?: string;
  onDateCommit: (bounds: DateBounds) => void;
  /** Filters in force, shown on "All filters". */
  activeCount: number;
  onOpenAll: () => void;
  className?: string;
};

const CHIP =
  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** One filter: a chip that opens its control, filled when a value is applied. */
function FilterChip({
  label,
  activeLabel,
  clearLabel,
  onClear,
  children,
}: Readonly<{
  label: string;
  /** The value in force; absent → the plain chip. */
  activeLabel?: string;
  clearLabel: string;
  onClear: () => void;
  children: ReactNode;
}>) {
  const isActive = Boolean(activeLabel);
  return (
    <Popover>
      <div
        className={cn(
          "inline-flex shrink-0 items-center rounded-full",
          isActive
            ? "bg-primary-surface text-primary-foreground"
            : "bg-muted text-primary",
        )}
      >
        <PopoverTrigger asChild>
          <button
            className={cn(
              CHIP,
              isActive ? "pl-4 pr-1" : "pl-4 pr-3 hover:bg-primary/[0.06]",
            )}
            type="button"
          >
            <span className="max-w-[14rem] truncate">
              {activeLabel ?? label}
            </span>
            {isActive ? null : (
              <ChevronDown aria-hidden="true" className="h-4 w-4 opacity-70" />
            )}
          </button>
        </PopoverTrigger>
        {isActive ? (
          <button
            aria-label={clearLabel}
            className="mr-1 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-primary-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
            onClick={onClear}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <PopoverContent
        align="start"
        // The chip already names the filter, so the group's own legend is
        // kept for screen readers only; the panel opens straight onto the
        // options, rows edge to edge.
        className="max-h-[min(70vh,520px)] w-[300px] overflow-y-auto p-3 [&_legend+*:not(.sticky)]:!mt-0 [&_legend]:sr-only"
        sideOffset={8}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function SearchFilterBar({
  facets,
  selected,
  selectedType,
  onToggle,
  onClearGroup,
  bigoExtent,
  bigoMin,
  bigoMax,
  bigoLabel,
  onBigoCommit,
  dateFrom,
  dateTo,
  dateLabel,
  onDateCommit,
  activeCount,
  onOpenAll,
  className,
}: Readonly<SearchFilterBarProps>) {
  const { t, i18n } = useTranslation();
  const clear = (what: string) =>
    t("archiveSearch.clearFilter", "Clear {{filter}}", { filter: what });

  // A facet chip names its first applied value, plus how many more.
  const valueLabel = (name: SidebarFilterName) => {
    const values = selected[name];
    if (!values.length) return undefined;
    const item = facets[name].find((entry) => entry.name === values[0]) ?? {
      name: values[0],
    };
    const first = getFacetItemLabel(name, item, t, i18n.language);
    return values.length > 1 ? `${first} +${values.length - 1}` : first;
  };

  const groups = filterGroupsFor(selectedType).filter(
    ({ name }) => (facets[name]?.length ?? 0) > 0 || selected[name].length > 0,
  );
  const bigoTitle = t("archiveSearch.filters.bigo", "Embezzled amount");
  const dateTitle = t("archiveSearch.filters.date", "Record date");

  return (
    <div
      aria-label={t("archiveSearch.filtersLabel", "Filters")}
      className={cn(
        // Scrolls sideways when the chips outrun the row; the last 32px fade
        // out (and are padded clear when everything fits) so a cut-off chip
        // reads as "more this way" rather than as a clipped control.
        // py-1 -my-1 pl-1 -ml-1: room inside the scroller for the focus ring,
        // which it would otherwise clip.
        "-my-1 -ml-1 flex items-center gap-2 overflow-x-auto py-1 pl-1 pr-8 [mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="group"
    >
      <button
        className={cn(
          CHIP,
          "bg-muted px-4 text-primary hover:bg-primary/[0.08]",
        )}
        onClick={onOpenAll}
        type="button"
      >
        <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
        {t("archiveSearch.allFilters", "All filters")}
        {activeCount ? (
          <span className="ml-0.5 rounded-full bg-primary-surface px-1.5 text-xs tabular-nums text-primary-foreground">
            {activeCount}
          </span>
        ) : null}
      </button>

      {showsBigo(selectedType) && bigoExtent ? (
        <FilterChip
          activeLabel={
            bigoMin !== undefined || bigoMax !== undefined
              ? (bigoLabel ?? bigoTitle)
              : undefined
          }
          clearLabel={clear(bigoTitle)}
          label={t("archiveSearch.filters.bigoChip", "Amount")}
          onClear={() => onBigoCommit({})}
        >
          <LazyBigoRangeFilter
            extent={bigoExtent}
            max={bigoMax}
            min={bigoMin}
            onCommit={onBigoCommit}
          />
        </FilterChip>
      ) : null}

      {showsDate(selectedType) ? (
        <FilterChip
          activeLabel={
            dateFrom || dateTo ? (dateLabel ?? dateTitle) : undefined
          }
          clearLabel={clear(dateTitle)}
          label={dateTitle}
          onClear={() => onDateCommit({})}
        >
          <DateRangeFilter
            from={dateFrom}
            onCommit={onDateCommit}
            to={dateTo}
          />
        </FilterChip>
      ) : null}

      {groups.map(({ name, titleKey, title }) => {
        const groupTitle = t(titleKey, title);
        return (
          <FilterChip
            activeLabel={valueLabel(name)}
            clearLabel={clear(groupTitle)}
            key={name}
            label={groupTitle}
            onClear={() => onClearGroup(name)}
          >
            <FilterGroup
              inPopover
              items={facets[name]}
              name={name}
              onToggle={onToggle}
              selectedValues={selected[name]}
              title={groupTitle}
            />
          </FilterChip>
        );
      })}
    </div>
  );
}
