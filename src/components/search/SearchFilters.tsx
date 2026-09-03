import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ArchiveSearchFacets,
  ArchiveSearchType,
  SearchFacetItem,
} from "@/types/search";
import { BigoRangeFilter } from "@/components/search/BigoRangeFilter";
import type { BigoExtent } from "@/lib/bigo-range";
import { getFacetItemLabel } from "@/utils/case-entities";

export type SidebarFilterName = "entity_type" | "case_type" | "tags";

// `title` is the English fallback; `titleKey` resolves the Nepali label from the
// bilingual bundle (see src/i18n/locales/*.json → archiveSearch.filters).
const FILTER_GROUPS: {
  name: SidebarFilterName;
  titleKey: string;
  title: string;
}[] = [
  {
    name: "entity_type",
    titleKey: "archiveSearch.filters.entityType",
    title: "Entity type",
  },
  {
    name: "case_type",
    titleKey: "archiveSearch.filters.caseType",
    title: "Case type",
  },
  { name: "tags", titleKey: "archiveSearch.filters.tags", title: "Tags" },
];

type SearchFiltersProps = {
  facets: ArchiveSearchFacets;
  selected: Record<SidebarFilterName, string[]>;
  selectedType?: ArchiveSearchType;
  onToggle: (name: SidebarFilterName, value: string) => void;
  onClear: () => void;
  // बिगो corpus extent from the API, plus the range in force. Absent extent → the
  // control does not render (there is no scale to build a ladder from).
  bigoExtent?: BigoExtent;
  bigoMin?: number;
  bigoMax?: number;
  // Cases matching the current search, for the "what will this give me" count.
  onBigoCommit: (bounds: { min?: number; max?: number }) => void;
};

export function SearchFilters({
  facets,
  selected,
  selectedType,
  onToggle,
  onClear,
  bigoExtent,
  bigoMin,
  bigoMax,
  onBigoCommit,
}: Readonly<SearchFiltersProps>) {
  const { t } = useTranslation();

  return (
    <aside
      aria-label="Archive search filters"
      className="space-y-4 rounded-xl bg-card p-4"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-bold tracking-tight text-foreground">
          Filters
        </h2>
        <Button className="h-11 px-3 text-xs" onClick={onClear} variant="ghost">
          Clear
        </Button>
      </div>

      {/*
        FIRST in the sidebar, ABOVE the term facets. It used to sit under the
        record-type radios; those are now the tabs above the results, so this is
        what the column opens with. The tags group below runs to 50 checkboxes,
        and anything after it is off-screen on every viewport — a control nobody
        scrolls to is a control nobody has. Amount is also the coarsest cut of
        the case corpus (six orders of magnitude), so it belongs at the top
        rather than after the long tail of keywords.

        बिगो is CASE-ONLY: no entity, material or court-case document carries an
        amount, so a bound applied anywhere else empties the result set with no
        visible cause. Gating the CONTROL to case browsing is how the API PR
        (JawafdehiAPI#450) scopes it — the endpoint applies a bound globally by
        design, so that the same mechanism can carry date_from/date_to later,
        where every type does have a date. Same gate, same reason, as the
        "Entity type" group below.
      */}
      {selectedType === "case" ? (
        <BigoRangeFilter
          extent={bigoExtent}
          max={bigoMax}
          min={bigoMin}
          onCommit={onBigoCommit}
        />
      ) : null}
      {FILTER_GROUPS
        // "Entity type" only makes sense while browsing Entities — for every
        // other record type (or "all") its buckets are either irrelevant or,
        // as originally reported, collapse to a single confusing value.
        .filter(({ name }) => name !== "entity_type" || selectedType === "entity")
        .map(({ name, titleKey, title }) => (
          <FilterGroup
            items={facets[name]}
            key={name}
            name={name}
            onToggle={onToggle}
            selectedValues={selected[name]}
            title={t(titleKey, title)}
          />
        ))}
    </aside>
  );
}

export function SearchFiltersSkeleton({
  selectedType,
}: Readonly<{ selectedType?: ArchiveSearchType }> = {}) {
  const groupRowCounts = [4, 3, 3] as const;

  return (
    <aside
      aria-hidden="true"
      className="space-y-4 rounded-xl bg-card p-4"
    >
      <div className="flex h-8 items-center justify-between gap-4">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-8 w-12 rounded-md" />
      </div>

      {/*
        The बिगो block sits FIRST, mirroring the live order now that the record
        type is a row of tabs rather than this column's opening group. It is tall
        (a track, two fields, a note) and above the fold, so reserving it keeps
        every facet below from jumping when the real sidebar lands.

        Gated on the SAME condition as the live control, because reserving it
        unconditionally has the opposite failure: /search defaults to
        type=all and /materials and /court-cases pin a non-case type, so on
        most cold loads the block was reserved and then never filled —
        ~296px collapsing on first paint. `selectedType` is read synchronously
        off the URL, so it is known long before the first response.
      */}
      {selectedType === "case" ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-14 w-full rounded-sm" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-32 rounded-md" />
        </div>
      ) : null}

      {groupRowCounts.map((rowCount, groupIndex) => (
        <div className="space-y-2" key={groupIndex}>
          <Skeleton className="h-4 w-24" />
          <div className="space-y-1">
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <div
                className="flex min-h-8 items-center gap-2 px-1"
                key={rowIndex}
              >
                <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
                <Skeleton
                  className={
                    rowIndex % 2 === 0 ? "h-3.5 w-28" : "h-3.5 w-20"
                  }
                />
                <Skeleton className="ml-auto h-3 w-5" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

function FilterGroup({
  items,
  name,
  onToggle,
  selectedValues,
  title,
}: Readonly<{
  items: SearchFacetItem[];
  name: SidebarFilterName;
  onToggle: (name: SidebarFilterName, value: string) => void;
  selectedValues: string[];
  title: string;
}>) {
  const { t } = useTranslation();
  const displayItems = [...(items || [])];
  // Keep any selected value visible even if it dropped out of the current facet
  // buckets (e.g. it has zero hits under the active query).
  selectedValues.forEach((val) => {
    if (!displayItems.some((item) => item.name === val)) {
      displayItems.push({ name: val, count: 0 });
    }
  });

  if (displayItems.length === 0) return null;

  return (
    // min-w-0: <fieldset> defaults to min-width:min-content and ignores width
    // constraints, so a long facet name would overflow the viewport on mobile.
    <fieldset className="min-w-0 space-y-0.5">
      <legend className="mb-1.5 text-sm font-semibold text-foreground">
        {title}
      </legend>
      {displayItems.map((item) => {
        const isChecked = selectedValues.includes(item.name);
        const label = getFacetItemLabel(name, item, t);
        return (
          <label
            className="flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            key={item.name}
          >
            <Checkbox
              aria-label={`${label}: ${item.count} results`}
              checked={isChecked}
              onCheckedChange={() => onToggle(name, item.name)}
            />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="shrink-0 text-xs tabular-nums">{item.count}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
