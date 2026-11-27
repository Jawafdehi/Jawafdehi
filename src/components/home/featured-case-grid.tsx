import { CaseCard } from "@/components/CaseCard";
import { SeriesListCard } from "@/components/series/SeriesListCard";
import { Reveal } from "@/components/ui/reveal";
import { caseCardPropsFromSearchResult } from "@/lib/case-card-props";
import { seriesListingCardOf } from "@/lib/case-series";
import type { ArchiveSearchResult } from "@/types/search";

/**
 * The homepage "Featured Cases" grid. A case series arrives from the API as ONE
 * collapsed result (featuredCasesQuery sends `collapse_series`) and fills one
 * cell with the series card; every other result is a case card, as before. An
 * API without the collapse returns only cases, which is today's grid.
 */
export function FeaturedCaseGrid({
  results,
  language,
}: Readonly<{ results: readonly ArchiveSearchResult[]; language: string }>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {results.map((result, index) => {
        const series = seriesListingCardOf(result);
        return (
          <Reveal
            key={series ? `series-${series.slug}` : result.id}
            className="h-full"
            delayMs={(index % 3) * 90}
          >
            {series ? (
              <SeriesListCard card={series} />
            ) : (
              <CaseCard {...caseCardPropsFromSearchResult(result, language)} />
            )}
          </Reveal>
        );
      })}
    </div>
  );
}
