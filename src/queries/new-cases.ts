import { fetchPublishedSince, PAGE_SIZE } from "@/lib/new-cases";
import { getCases } from "@/services/jds-api";

/**
 * The cases published on or after `cutoff`, newest first, for /new-cases.
 * Keyed by the cutoff: "show older weeks" moves it back and loads again.
 */
export function newCasesQuery(cutoff: string) {
  return {
    queryKey: ["new-cases", cutoff] as const,
    queryFn: () =>
      fetchPublishedSince(
        (page) =>
          getCases({
            ordering: "-case_publish_date",
            published_after: cutoff,
            page_size: PAGE_SIZE,
            page,
          }),
        cutoff,
      ),
    staleTime: 5 * 60 * 1000,
  };
}
