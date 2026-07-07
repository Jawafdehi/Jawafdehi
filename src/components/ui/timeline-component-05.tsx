import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Release {
  date: string;
  content: ReactNode;
  version: string;
  year?: string;
}

interface ChangelogContentProps {
  className?: string;
  description?: string;
  heading?: string;
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

function TimelineDatePill({ date, version }: Pick<Release, "date" | "version">) {
  const primaryDate = (
    <Badge className="flex min-h-7 w-auto justify-end rounded-full border border-primary/10 bg-primary/10 px-3.5 py-1 text-sm font-medium text-primary shadow-none hover:bg-primary/20">
      {version}
    </Badge>
  );

  if (!date) return primaryDate;

  return (
    <div className="flex flex-col items-end gap-1">
      {primaryDate}
      <span className="max-w-36 text-right text-xs font-medium leading-snug text-primary/65">
        {date}
      </span>
    </div>
  );
}

const ChangelogContent = ({
  className,
  description = "Discover what has been added, changed, fixed, improved, and updated in this release.",
  heading = "Changelog Origin Update",
  releases,
}: ChangelogContentProps) => {
  const groupedReleases = groupReleases(releases);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-8 space-y-4 text-left ">
        <h2 className=" font-semibold tracking-tight text-primary text-xl md:text-2xl">
          {heading}
        </h2>
        {description ? (
          <p className="max-w-3xl text-lg leading-8 text-primary/75">
            {description}
          </p>
        ) : null}
      </div>

      <div className="space-y-9">
        {groupedReleases.map((group, groupIndex) => (
          <section
            key={`${group.year || "timeline"}-${groupIndex}`}
            aria-label={group.year ? `${group.year} timeline` : undefined}
          >
            {group.year ? (
              <h3 className="mb-5 text-xl font-semibold leading-7 text-primary">
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
                  <div className="sticky top-[4.75rem] flex size-6 items-center justify-center max-sm:top-5">
                    <span className="flex size-[1.125rem] shrink-0 items-center justify-center rounded-full bg-accent/20">
                      <span className="size-3 rounded-full bg-accent/85" />
                    </span>
                  </div>
                  <span className="-mt-2.5 w-px flex-1 border-l border-primary/20" />
                </div>

                <div className="flex flex-1 flex-col gap-2 md:gap-4 pb-6 md:pb-11 pl-3 md:pl-6 lg:pl-9">
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
