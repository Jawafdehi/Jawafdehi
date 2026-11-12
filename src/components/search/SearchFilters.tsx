import { Search } from "@/components/icons";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatIndianNumber } from "@/utils/number";
import { DisclosureRow, OptionList, OptionMarker } from "@/components/search/filter-controls";
import type {
  ArchiveSearchFacets,
  ArchiveSearchType,
  SearchFacetItem,
} from "@/types/search";
import { BigoRangeFilterSkeleton } from "@/components/search/BigoRangeFilterSkeleton";
import { DateRangeFilter } from "@/components/search/DateRangeFilter";
import { LazyBigoRangeFilter } from "@/components/search/LazyBigoRangeFilter";
import type { BigoExtent } from "@/lib/bigo-range";
import type { DateBounds } from "@/lib/date-range";
import { getFacetItemLabel } from "@/utils/case-entities";
import { filterGroupsFor } from "@/components/search/filter-groups";

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
// A group of up to TRUNCATE_ABOVE options shows them all: a reader takes in ten
// at a glance (Province's seven never hide). Past that, the top COLLAPSED_COUNT
// by count show, with a search box and "Show all N" (Baymard Institute's
// guidance for long facet lists).
const TRUNCATE_ABOVE = 10;
const COLLAPSED_COUNT = 5;
const SEARCHABLE_THRESHOLD = TRUNCATE_ABOVE;

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
  /** "panel" (default): its own grey surface and header. "sheet": bare, for
   * the "All filters" sheet. */
  variant?: "panel" | "sheet";
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
  variant = "panel",
}: Readonly<SearchFiltersProps>) {
  const { t } = useTranslation();
  // In the "All filters" sheet the sheet supplies the title, the Clear action
  // and the surface, so the panel drops all three.
  const inSheet = variant === "sheet";

  return (
    <aside
      aria-label="Archive search filters"
      // In the sheet each group's legend is a real section title — navy, a
      // size up — so the drawer's structure reads at a glance. The chips'
      // popovers name their group on the chip, so they keep the quiet label.
      className={
        inSheet
          ? "space-y-8 [&_legend]:mb-2.5 [&_legend]:text-base [&_legend]:font-medium [&_legend]:text-primary"
          : "space-y-5 rounded-[22px] bg-muted px-4 py-4"
      }
    >
      {/* Not rendered at all in the sheet: even hidden it is the first child,
          so space-y pushed the first group a full gap below the sheet title. */}
      {inSheet ? null : (
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-medium text-primary">
            Filters
          </h2>
          <Button className="h-9 px-3 text-sm font-normal text-muted-foreground hover:text-primary" onClick={onClear} variant="ghost">
            Clear
          </Button>
        </div>
      )}

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
        <LazyBigoRangeFilter
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
      {filterGroupsFor(selectedType)
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
  // Materials fill exactly one group, "Document type": 10 of the 12 tokens have
  // documents, so reserve the collapsed height (8 rows) rather than the full
  // vocabulary. Their case_type and tags buckets come back empty.
  //
  // Entities and cases each gained District and Province: the subject-geography
  // facets are populated for both now (75 districts and 7 provinces on each),
  // not just for court cases. They are reserved at 3 rows apiece, matching how
  // the court-case branch already reserves the same two groups — the point is a
  // stable first paint, not an exact bucket count.
  //
  // "all" keeps the two term groups alone: District/Province are deliberately
  // NOT rendered on the combined view (see the live filter above), so reserving
  // them there would collapse ~2 groups of height on every cold /search load.
  const groupRowCounts =
    selectedType === "courtcase"
      ? [3, 3, 3, 3, 3, 3]
      : selectedType === "entity"
        ? [4, 3, 3]
        : selectedType === "case"
          ? [4, 3, 3, 3]
          : selectedType === "material"
            ? [8]
            : [4, 3];

  return (
    <aside
      aria-hidden="true"
      className="space-y-5 rounded-[22px] bg-muted px-4 py-4"
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

        Shared with the Suspense fallback the live control now sits behind, so
        the two cannot drift — see BigoRangeFilterSkeleton.
      */}
      {selectedType === "case" ? <BigoRangeFilterSkeleton /> : null}

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

export function FilterGroup({
  items,
  name,
  onToggle,
  selectedValues,
  title,
  inPopover = false,
}: Readonly<{
  items: SearchFacetItem[];
  name: SidebarFilterName;
  onToggle: (name: SidebarFilterName, value: string) => void;
  selectedValues: string[];
  title: string;
  /**
   * In a chip's popover the whole list shows and the panel scrolls, under a
   * search box pinned to its top: the popover already IS the "more", so a
   * "Show all" inside it was a second click to reach the same options.
   */
  inPopover?: boolean;
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
  const isCollapsed = !inPopover && !expanded && !needle && matches.length > TRUNCATE_ABOVE;
  const visible = isCollapsed ? matches.slice(0, COLLAPSED_COUNT) : matches;
  const hiddenCount = matches.length - visible.length;

  if (labelled.length === 0) return null;

  return (
    // min-w-0: <fieldset> defaults to min-width:min-content and ignores width
    // constraints, so a long facet name would overflow the viewport on mobile.
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-1.5 text-sm text-muted-foreground">
        {title}
      </legend>

      {isSearchable ? (
        <div className={cn(inPopover && "sticky -top-3 z-10 -mx-3 !-mt-3 bg-popover px-3 pb-1 pt-3")}>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          {/* font-input rather than a raw size: a sub-16px field zooms the
              page on iOS when focused. The class is 16px on touch and 14px
              where there is a real pointer (src/styles/typography.css). */}
          <Input
            aria-label={t("archiveSearch.filterSearch", "Search {{filter}}", {
              filter: title,
            })}
            className="h-10 rounded-full border-border bg-surface pl-9 font-input shadow-none focus-visible:border-primary/40 focus-visible:ring-4 focus-visible:ring-primary/[0.07] focus-visible:ring-offset-0"
            id={searchId}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("archiveSearch.filterSearch", "Search {{filter}}", {
              filter: title,
            })}
            type="search"
            value={query}
          />
        </div>
        </div>
      ) : null}

      {/* A quiet checklist: a small box, the label, the count in grey on the
          right. Compact and scannable where a cloud of bordered pills was not. */}
      <OptionList>
        {visible.map(({ item, label }) => {
          const isChecked = selectedValues.includes(item.name);
          return (
            <label
              className={cn(
                "flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-2.5 text-[15px] transition-colors",
                // Keyboard focus only: the sheet focuses its first control on open,
                // and a ring on a row nobody tabbed to reads as a selection.
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1",
                isChecked ? "text-primary" : "text-primary/80 hover:bg-muted hover:text-primary",
              )}
              key={item.name}
              title={label}
            >
              {/* Visually hidden but still the real control: the row IS the
                  checkbox, so the role, checked state and accessible name stay
                  exactly as they were. */}
              <Checkbox
                aria-label={`${label}: ${item.count} results`}
                checked={isChecked}
                className="sr-only"
                onCheckedChange={() => onToggle(name, item.name)}
              />
              <OptionMarker checked={isChecked} shape="box" />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <span aria-hidden="true" className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                {formatIndianNumber(item.count)}
              </span>
            </label>
          );
        })}
      </OptionList>

      {/* One row that shows the rest and then folds them away again, in the
          list's own column — not a ghost button floating under it. */}
      {!inPopover && (hiddenCount > 0 || (expanded && !needle && matches.length > TRUNCATE_ABOVE)) ? (
        <OptionList>
          <DisclosureRow open={hiddenCount === 0} onClick={() => setExpanded(hiddenCount > 0)}>
            {hiddenCount > 0
              ? t("archiveSearch.filterShowAll", "Show all {{count}}", { count: matches.length })
              : t("archiveSearch.filterShowFewer", "Show fewer")}
          </DisclosureRow>
        </OptionList>
      ) : null}

      {needle && matches.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          {t("archiveSearch.filterNoMatch", "No matches")}
        </p>
      ) : null}
    </fieldset>
  );
}
