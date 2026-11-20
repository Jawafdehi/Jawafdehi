import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface Release {
  date: string;
  content: ReactNode;
  version: string;
  year?: string;
}

interface ChangelogContentProps {
  className?: string;
  releases: Release[];
}

function groupReleases(releases: Release[]) {
  return releases.reduce<Array<{ releases: Release[]; year: string | null }>>(
    (groups, release) => {
      const year = release.year || null;
      const lastGroup = groups[groups.length - 1];

      if (lastGroup?.year === year) {
        lastGroup.releases.push(release);
        return groups;
      }

      groups.push({ year, releases: [release] });
      return groups;
    },
    []
  );
}

/**
 * The date column: the AD date as the lead line in Inter's tabular figures,
 * the BS date under it in grey. Plain text, no pill — the same treatment as
 * the stage rail in the case's facts card.
 */
function TimelineDatePill({ date, version }: Pick<Release, "date" | "version">) {
  return (
    <div className="flex flex-col gap-0.5 md:items-end md:text-right">
      <span className="text-base font-medium leading-6 tabular-nums text-primary">{version}</span>
      {date ? <span className="text-sm leading-5 tabular-nums text-muted-foreground">{date}</span> : null}
    </div>
  );
}

/**
 * The grouped timeline list only — the section heading belongs to the caller,
 * so the case page can render the shared `CaseSectionHeading` like every
 * other case-detail section.
 */
const ChangelogContent = ({ className, releases }: ChangelogContentProps) => {
  const groupedReleases = groupReleases(releases);

  return (
    <div className={cn("w-full", className)}>
      <div className="space-y-10">
        {groupedReleases.map((group, groupIndex) => (
          <section
            key={`${group.year || "timeline"}-${groupIndex}`}
            aria-label={group.year ? `${group.year} timeline` : undefined}
          >
            {group.year ? (
              <h3 className="mb-5 text-[15px] leading-6 tabular-nums text-muted-foreground">
                {group.year}
              </h3>
            ) : null}

            {group.releases.map((release, index) => (
              <div
                key={`${release.version}-${groupIndex}-${index}`}
                id={`${groupIndex + 1}-${index + 1}`}
                className="relative flex scroll-mt-[4.5rem] justify-end gap-2"
              >
                <div className="sticky top-[4.75rem] hidden w-36 flex-col items-end gap-2 self-start pb-4 md:flex">
                  <TimelineDatePill date={release.date} version={release.version} />
                </div>

                <div className="flex flex-col items-center">
                  {/* A small navy marker on a hairline, like the stage rail. */}
                  <div className="sticky top-[4.75rem] flex h-6 w-4 items-center justify-center max-sm:top-5">
                    <span className="size-2.5 shrink-0 rounded-full bg-primary" />
                  </div>
                  <span className="w-px flex-1 bg-border" />
                </div>

                <div className="flex flex-1 flex-col gap-2 pb-8 pl-4 md:gap-3 md:pb-10 md:pl-8">
                  <div className="flex flex-col gap-2 md:hidden">
                    <TimelineDatePill date={release.date} version={release.version} />
                  </div>
                  {release.content}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
};

export default ChangelogContent;
