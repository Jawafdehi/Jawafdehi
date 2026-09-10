import { Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  ArchiveSearchFacets,
  ArchiveSearchType,
  SearchFacetItem,
} from "@/types/search";
import { BigoRangeFilter } from "@/components/search/BigoRangeFilter";
import { DateRangeFilter } from "@/components/search/DateRangeFilter";
import type { BigoExtent } from "@/lib/bigo-range";
import type { DateBounds } from "@/lib/date-range";
import { getFacetItemLabel } from "@/utils/case-entities";

export type SidebarFilterName =
  | "entity_type"
  | "case_type"
  | "tags"
  | "court"
  | "court_type"
  | "district"
  | "province"
  | "material_type";

/**
 * How many options a group shows before collapsing behind "More", and the size
 * at which it gains its own search box.
 *
 * The backend returns up to 50 buckets per facet, and `tags` and `case_type`
 * both sit at that cap on a broad search — 100 checkboxes and ~4,800px of
 * sidebar. Neither number is a data limit, so the group cannot show everything
 * and cannot be scanned; it needs both a cut and a way to search past it.
 */
const COLLAPSED_COUNT = 8;
const SEARCHABLE_THRESHOLD = 8;

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
    name: "court_type",
    titleKey: "archiveSearch.filters.courtType",
    title: "Court level",
  },
  {
    name: "province",
    titleKey: "archiveSearch.filters.province",
    title: "Province",
  },
  {
    name: "district",
    titleKey: "archiveSearch.filters.district",
    title: "District",
  },
  {
    name: "court",
    titleKey: "archiveSearch.filters.court",
    title: "Court",
  },
  {
    name: "material_type",
    titleKey: "archiveSearch.filters.materialType",
    title: "Document type",
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
  // Record-date bounds. Unlike बिगो there is no extent to fetch — a calendar is
  // its own scale, so the control needs nothing from the API to render.
  dateFrom?: string;
  dateTo?: string;
  onDateCommit: (bounds: DateBounds) => void;
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
  dateFrom,
  dateTo,
  onDateCommit,
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

      {/*
        Record date, scoped to the ONE tab whose records this narrows usefully.

        The endpoint applies the bounds globally — that is the mechanism the बिगो
        note above anticipated. But scope is not the same question as support:
        entities carry no date at all, so a bound empties that tab outright, and
        on `all` it would silently drop every entity from a mixed result set. The
        case tab already opens with बिगो, and stacking a second range control
        above the term facets is what pushed the tags group off-screen the last
        time this column grew.

        So: materials only, which is what was asked for and where the corpus
        actually supports it — 93% of materials carry a date. Widening this to
        court cases is a one-line change to this condition once someone wants it.
      */}
      {selectedType === "material" ? (
        <DateRangeFilter
          from={dateFrom}
          onCommit={onDateCommit}
          to={dateTo}
        />
      ) : null}
      {FILTER_GROUPS
        // "Entity type" only makes sense while browsing Entities — for every
        // other record type (or "all") its buckets are either irrelevant or,
        // as originally reported, collapse to a single confusing value.
        .filter(({ name }) => {
          if (name === "entity_type") return selectedType === "entity";
          // Court facets are intentionally absent from the all-records view:
          // applying one there hides unrelated entity/material/case results,
          // while the control itself is only useful once Court cases is selected.
          if (
            name === "court" ||
            name === "court_type" ||
            name === "district" ||
            name === "province"
          ) {
            return selectedType === "courtcase";
          }
          // Document type is scoped the same way, and for the same reason: only
          // materials carry one, so the buckets are empty everywhere else and a
          // stale token would narrow another tab through an invisible control.
          if (name === "material_type") return selectedType === "material";
          return true;
        })
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
  // Reserve exactly the groups each tab can FILL — checked against what the API
  // actually returns per type, not against the union of every group. Both
  // directions are a jump: under-reserving pushes the sidebar down when data
  // lands, and over-reserving collapses it on first paint, which is the same
  // failure the बिगो block below is gated against.
  //
  // Court-case browsing adds four location groups to the two term groups.
  // Entities fill only "Entity type" — the case_type and tags facets come back
  // empty for them. Materials fill exactly one group, "Document type": 10 of the
  // 12 tokens have documents, so reserve the collapsed height (8 rows) rather
  // than the full vocabulary. Their case_type and tags buckets come back empty,
  // like the entity tab's.
  const groupRowCounts =
    selectedType === "courtcase"
      ? [3, 3, 3, 3, 3, 3]
      : selectedType === "entity"
        ? [4]
        : selectedType === "material"
          ? [8]
          : [4, 3];

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

      {/*
        The date block, on the same terms: gated on the live control's own
        condition, and reserving what it actually occupies — a legend, a row of
        four preset pills, two fields and the coverage note. /materials is a
        locked-type browse, so `material` is the cold-load case this matters for
        most.
      */}
      {selectedType === "material" ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-1.5">
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-3 w-full" />
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
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const searchId = useId();

  const displayItems = useMemo(() => {
    const all = [...(items || [])];
    // Keep any selected value visible even if it dropped out of the current
    // facet buckets (e.g. it has zero hits under the active query).
    selectedValues.forEach((val) => {
      if (!all.some((item) => item.name === val)) {
        all.push({ name: val, count: 0 });
      }
    });
    // Selected first, so a refinement never hides below the collapse cut.
    return all.sort((a, b) => {
      const aSel = selectedValues.includes(a.name) ? 0 : 1;
      const bSel = selectedValues.includes(b.name) ? 0 : 1;
      return aSel - bSel;
    });
  }, [items, selectedValues]);

  // Labels are resolved once: the search matches what the reader can SEE, not
  // the raw facet token behind it. That includes the court names, which are
  // Nepali under a Nepali UI — so the language is part of the dependency list.
  const labelled = useMemo(
    () =>
      displayItems.map((item) => ({
        item,
        label: getFacetItemLabel(name, item, t, i18n.language),
      })),
    [displayItems, name, t, i18n.language],
  );

  const needle = query.trim().toLocaleLowerCase();
  const matches = needle
    ? labelled.filter(({ label }) => label.toLocaleLowerCase().includes(needle))
    : labelled;

  // A search box earns its place only once scanning the list stops being
  // instant; below that it is chrome over five options.
  const isSearchable = labelled.length > SEARCHABLE_THRESHOLD;
  // While searching, show every match — the reader has already narrowed.
  const isCollapsed = !expanded && !needle && matches.length > COLLAPSED_COUNT;
  const visible = isCollapsed ? matches.slice(0, COLLAPSED_COUNT) : matches;
  const hiddenCount = matches.length - visible.length;

  if (labelled.length === 0) return null;

  return (
    // min-w-0: <fieldset> defaults to min-width:min-content and ignores width
    // constraints, so a long facet name would overflow the viewport on mobile.
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-1.5 text-sm font-semibold text-foreground">
        {title}
      </legend>

      {isSearchable ? (
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          />
          {/* font-input rather than a raw size: a sub-16px field zooms the
              page on iOS when focused. The class is 16px on touch and 14px
              where there is a real pointer (src/styles/typography.css). */}
          <Input
            aria-label={t("archiveSearch.filterSearch", "Search {{filter}}", {
              filter: title,
            })}
            className="h-9 rounded-full pl-9 font-input"
            id={searchId}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("archiveSearch.filterSearch", "Search {{filter}}", {
              filter: title,
            })}
            type="search"
            value={query}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {visible.map(({ item, label }) => {
          const isChecked = selectedValues.includes(item.name);
          return (
            <label
              className={cn(
                "inline-flex min-h-9 max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
                "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                isChecked
                  ? "border-primary bg-primary-surface text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              key={item.name}
              title={label}
            >
              {/* Visually hidden but still the real control: the pill IS the
                  checkbox, so the role, checked state and accessible name stay
                  exactly as they were before the restyle. */}
              <Checkbox
                aria-label={`${label}: ${item.count} results`}
                checked={isChecked}
                className="sr-only"
                onCheckedChange={() => onToggle(name, item.name)}
              />
              <span className="min-w-0 truncate">{label}</span>
              <span
                aria-hidden="true"
                className="shrink-0 text-xs tabular-nums opacity-70"
              >
                {item.count}
              </span>
            </label>
          );
        })}

        {hiddenCount > 0 ? (
          <Button
            className="h-9 rounded-full px-3 text-sm font-normal"
            onClick={() => setExpanded(true)}
            size="sm"
            type="button"
            variant="secondary"
          >
            {t("archiveSearch.filterMore", "More")}
          </Button>
        ) : null}

        {expanded && !needle && matches.length > COLLAPSED_COUNT ? (
          <Button
            className="h-9 rounded-full px-3 text-sm font-normal"
            onClick={() => setExpanded(false)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("archiveSearch.filterLess", "Less")}
          </Button>
        ) : null}
      </div>

      {needle && matches.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          {t("archiveSearch.filterNoMatch", "No matches")}
        </p>
      ) : null}
    </fieldset>
  );
}
