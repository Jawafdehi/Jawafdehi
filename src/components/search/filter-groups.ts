// The facet groups the archive search offers, and which record-type tab offers
// which. Shared by the filter-chip bar and the "All filters" panel so the two
// can never disagree about what a tab can filter by.
import type { SidebarFilterName } from "@/components/search/SearchFilters";
import type { ArchiveSearchType } from "@/types/search";

// `title` is the English fallback; `titleKey` resolves the Nepali label from the
// bilingual bundle (see src/i18n/locales/*.json → archiveSearch.filters).
export const FILTER_GROUPS: {
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

/** The facet groups a record-type tab offers, in display order. Shared by the
 * filter-chip bar and the "All filters" panel so the two can never disagree. */
export function filterGroupsFor(selectedType?: ArchiveSearchType) {
  return FILTER_GROUPS.filter(
    // "Entity type" only makes sense while browsing Entities — for every
    // other record type (or "all") its buckets are either irrelevant or,
    // as originally reported, collapse to a single confusing value.
    ({ name }) => {
      if (name === "entity_type") return selectedType === "entity";
      // Court facets are intentionally absent from the all-records view:
      // applying one there hides unrelated entity/material/case results,
      // while the control itself is only useful once Court cases is selected.
      if (name === "court" || name === "court_type") {
        return selectedType === "courtcase";
      }
      // District/Province are no longer court facets. They now carry SUBJECT
      // geography — which district a record is ABOUT — and court cases,
      // Jawafdehi cases and entities all populate them (the API resolves a
      // case's own `location` bind and promotes it onto the entities that
      // case cites). So the control belongs on all three tabs, not just the
      // one that used to own the field.
      //
      // Still withheld from "all records", and for the ORIGINAL reason
      // rather than inertia: materials carry no geography at all, so a
      // ticked district would silently drop 346k of the 398k documents
      // through a control the reader cannot see from that tab. The same
      // argument that keeps `material_type` off the other tabs keeps this
      // one off the combined view. Enabling it there is a one-line change if
      // "everything about Kathmandu" turns out to be worth losing materials
      // for.
      if (name === "district" || name === "province") {
        return (
          selectedType === "courtcase" ||
          selectedType === "case" ||
          selectedType === "entity"
        );
      }
      // Document type is scoped the same way, and for the same reason: only
      // materials carry one, so the buckets are empty everywhere else and a
      // stale token would narrow another tab through an invisible control.
      if (name === "material_type") return selectedType === "material";
      return true;
    },
  );
}

/** Only cases carry an amount, and only materials a record date. */
export const showsBigo = (selectedType?: ArchiveSearchType) =>
  selectedType === "case";
export const showsDate = (selectedType?: ArchiveSearchType) =>
  selectedType === "material";
