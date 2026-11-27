import { addDays, fetchPublishedSince, hasCaseBefore, MAX_PAGES, PAGE_SIZE } from "@/lib/new-cases";
import { getCases } from "@/services/jds-api";

const ORDERING = "-case_publish_date";

/**
 * The cases published on or after `cutoff`, newest first, for /new-cases.
 * Keyed by the cutoff: "show older weeks" moves it back and loads again.
 */
export function newCasesQuery(cutoff: string) {
  return {
    queryKey: ["new-cases", cutoff] as const,
    queryFn: () =>
      fetchPublishedSince(
        (page) => getCases({ ordering: ORDERING, published_after: cutoff, page_size: PAGE_SIZE, page }),
        cutoff,
        MAX_PAGES,
        // Only reached when every page was inside the window, i.e. the API
        // honoured published_after: one row from before the cutoff says
        // whether "show older weeks" has anything to show.
        () =>
          getCases({ ordering: ORDERING, published_before: addDays(cutoff, -1), page_size: 1 }).then((response) =>
            hasCaseBefore(response, cutoff),
          ),
      ),
    staleTime: 5 * 60 * 1000,
  };
}
