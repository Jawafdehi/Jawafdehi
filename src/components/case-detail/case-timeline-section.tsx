import ChangelogContent from "@/components/ui/timeline-component-05";
import type { Release } from "@/components/ui/timeline-component-05";
import { formatDateRangeForLanguage } from "@/utils/date";
import type { LocalizedDatePair } from "@/utils/date";
import type { TimelineEntry } from "@/types/jds";
import { cn } from "@/lib/utils";

interface CaseTimelineSectionProps {
  className?: string;
  language: string;
  timeline: TimelineEntry[];
  title: string;
}

function splitSingleDateLabel(value: string, calendar: "AD" | "BS") {
  if (calendar === "AD") {
    const match = /^(.*?),\s*(\d{4})$/.exec(value);
    return {
      label: match?.[1] || value,
      year: match?.[2] || null,
    };
  }

  const [year, ...dateParts] = value.split(/\s+/);

  return {
    label: dateParts.join(" ") || value,
    year: year || null,
  };
}

function getCompactDateLabel(
  value: string | null,
  calendar: LocalizedDatePair["primaryCalendar"] | LocalizedDatePair["secondaryCalendar"]
) {
  if (!value || !calendar) return null;

  const parts = value.split(" - ").map((part) =>
    splitSingleDateLabel(part, calendar)
  );
  const year = parts[0]?.year || null;
  const label = parts
    .map((part) => {
      if (!part.year || part.year === year) return part.label;
      return calendar === "AD" ? `${part.label}, ${part.year}` : `${part.year} ${part.label}`;
    })
    .join(" - ");

  return { label, year };
}

export function CaseTimelineSection({
  className,
  language,
  timeline,
  title,
}: Readonly<CaseTimelineSectionProps>) {
  if (timeline.length === 0) return null;

  const releases: Release[] = timeline.map((item) => {
    const date = formatDateRangeForLanguage(
      item.date,
      item.end_date,
      "PP",
      item.date_bs,
      item.end_date_bs,
      language
    );
    const primaryDate = getCompactDateLabel(date.primary, date.primaryCalendar);
    const secondaryDate = getCompactDateLabel(date.secondary, date.secondaryCalendar);

    return {
      version: primaryDate?.label || date.primary,
      date: secondaryDate?.label || "",
      year: primaryDate?.year || undefined,
      content: (
        <div className="space-y-1">
          <h3 className="text-base md:text-lg font-semibold leading-snug tracking-tight text-primary/90">
            {item.title}
          </h3>
          <p className="max-w-4xl text-sm md:text-base font-normal leading-[1.7] text-primary/75">
            {item.description}
          </p>
        </div>
      ),
    };
  });

  return (
    <section
      id="timeline"
      className={cn("scroll-mt-28 no-page-break max-w-4xl", className)}
      aria-label={title}
    >
      <ChangelogContent description="" heading={title} releases={releases} />
    </section>
  );
}
