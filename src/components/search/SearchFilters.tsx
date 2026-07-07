import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ArchiveSearchCounts,
  ArchiveSearchFacets,
  ArchiveSearchType,
  SearchFacetItem,
} from "@/types/search";
import { getFacetItemLabel } from "@/utils/case-entities";

export type SidebarFilterName = "entity_type" | "case_type" | "tags";

// The four indexed result domains, in display order, with their record-type label.
const RECORD_TYPES: { value: ArchiveSearchType; label: string }[] = [
  { value: "case", label: "Cases" },
  { value: "entity", label: "Entities" },
  { value: "material", label: "Materials" },
  { value: "courtcase", label: "Court cases" },
];

const FILTER_GROUPS: { name: SidebarFilterName; title: string }[] = [
  { name: "entity_type", title: "Entity type" },
  { name: "case_type", title: "Case type" },
  { name: "tags", title: "Tags" },
];

type SearchFiltersProps = {
  facets: ArchiveSearchFacets;
  counts: Partial<ArchiveSearchCounts>;
  selected: Record<SidebarFilterName, string[]>;
  selectedType?: ArchiveSearchType;
  onTypeChange: (type?: ArchiveSearchType) => void;
  onToggle: (name: SidebarFilterName, value: string) => void;
  onClear: () => void;
  // Hide the record-type radios on single-type browse pages (Materials /
  // Court-cases) where the type is pinned by the route, not user-selectable.
  hideTypeSelector?: boolean;
};

export function SearchFilters({
  facets,
  counts,
  selected,
  selectedType,
  onTypeChange,
  onToggle,
  onClear,
  hideTypeSelector,
}: Readonly<SearchFiltersProps>) {
  return (
    <aside
      aria-label="Archive search filters"
      className="space-y-4 rounded-xl border bg-card p-4"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-bold tracking-tight text-foreground">
          Filters
        </h2>
        <Button className="h-8 px-2 text-xs" onClick={onClear} variant="ghost">
          Clear
        </Button>
      </div>

      {hideTypeSelector ? null : (
        <RecordTypeFilter
          counts={counts}
          onChange={onTypeChange}
          selectedType={selectedType}
        />
      )}
      {FILTER_GROUPS.map(({ name, title }) => (
        <FilterGroup
          items={facets[name]}
          key={name}
          name={name}
          onToggle={onToggle}
          selectedValues={selected[name]}
          title={title}
        />
      ))}
    </aside>
  );
}

export function SearchFiltersSkeleton() {
  const groups = [
    { control: "radio", rowCount: 4 },
    { control: "checkbox", rowCount: 4 },
    { control: "checkbox", rowCount: 3 },
    { control: "checkbox", rowCount: 3 },
  ] as const;

  return (
    <aside
      aria-hidden="true"
      className="space-y-4 rounded-xl border bg-card p-4"
    >
      <div className="flex h-8 items-center justify-between gap-4">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-8 w-12 rounded-md" />
      </div>

      {groups.map(({ control, rowCount }, groupIndex) => (
        <div className="space-y-2" key={groupIndex}>
          <Skeleton className="h-4 w-24" />
          <div className="space-y-1">
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <div
                className="flex min-h-8 items-center gap-2 px-1"
                key={rowIndex}
              >
                <Skeleton
                  className={
                    control === "radio"
                      ? "h-4 w-4 shrink-0 rounded-full"
                      : "h-4 w-4 shrink-0 rounded-sm"
                  }
                />
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

function RecordTypeFilter({
  counts,
  onChange,
  selectedType,
}: Readonly<{
  counts: Partial<ArchiveSearchCounts>;
  onChange: (type?: ArchiveSearchType) => void;
  selectedType?: ArchiveSearchType;
}>) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-semibold text-foreground">
        Record type
      </legend>
      <RadioGroup
        className="gap-0.5"
        onValueChange={(value) =>
          onChange(value === "all" ? undefined : value as ArchiveSearchType)
        }
        value={selectedType || "all"}
      >
        <FilterOption count={null} label="All records" value="all" />
        {RECORD_TYPES.map(({ value, label }) => (
          <FilterOption
            count={counts[value as keyof ArchiveSearchCounts] ?? null}
            key={value}
            label={label}
            value={value}
          />
        ))}
      </RadioGroup>
    </fieldset>
  );
}

function FilterOption({
  count,
  label,
  value,
}: Readonly<{
  count: number | null;
  label: string;
  value: string;
}>) {
  return (
    <label className="flex min-h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      <RadioGroupItem
        aria-label={count === null ? label : `${label}: ${count} results`}
        value={value}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== null ? (
        <span className="shrink-0 text-xs tabular-nums">{count}</span>
      ) : null}
    </label>
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
            className="flex min-h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
