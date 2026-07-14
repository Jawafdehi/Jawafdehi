import ChangelogContent from "@/components/ui/timeline-component-05";
import type { Release } from "@/components/ui/timeline-component-05";
import { formatDateRangeForLanguage } from "@/utils/date";
import type { LocalizedDatePair } from "@/utils/date";
import type { TimelineEntry } from "@/types/jds";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { CollapsibleCaseContent } from "@/components/case-detail/collapsible-case-content";

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

type CompactDateLabel = { label: string; year: string | null } | null;

interface TimelineRow {
  date: LocalizedDatePair;
  primaryDate: CompactDateLabel;
  secondaryDate: CompactDateLabel;
}

/**
 * Build the group-heading text for each primary-calendar year. The timeline rows
 * only carry the day/month in the secondary calendar, so the year would
 * otherwise appear in one calendar (AD in English) but not the other. Surface
 * the secondary-calendar year(s) in the heading. A single AD year can span two
 * BS years (the BS new year falls mid-April), so aggregate the distinct
 * secondary years seen within each group and render them as a range.
 */
function buildYearGroupHeadings(rows: TimelineRow[]): Map<string, string> {
  const secondaryYears = new Map<string, string[]>();
  let secondaryCalendar: "AD" | "BS" | null = null;

  for (const row of rows) {
    const primaryYear = row.primaryDate?.year;
    if (!primaryYear) continue;

    if (!secondaryCalendar && row.date.secondaryCalendar) {
      secondaryCalendar = row.date.secondaryCalendar;
    }

    const seen = secondaryYears.get(primaryYear) ?? [];
    const secondaryYear = row.secondaryDate?.year;
    if (secondaryYear && !seen.includes(secondaryYear)) seen.push(secondaryYear);
    secondaryYears.set(primaryYear, seen);
  }

  const headings = new Map<string, string>();
  for (const [primaryYear, years] of secondaryYears) {
    if (years.length === 0 || !secondaryCalendar) {
      headings.set(primaryYear, primaryYear);
      continue;
    }
    const span = years.length === 1 ? years[0] : `${years[0]}–${years[years.length - 1]}`;
    headings.set(primaryYear, `${primaryYear} (${span} ${secondaryCalendar})`);
  }

  return headings;
}

export function CaseTimelineSection({
  className,
  language,
  timeline,
  title,
}: Readonly<CaseTimelineSectionProps>) {
  const { t } = useTranslation();

  if (timeline.length === 0) return null;

  const rows = timeline.map((item) => {
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

    return { item, date, primaryDate, secondaryDate };
  });

  // Heading is keyed on the primary-calendar year, but the label carries both
  // calendars' years so the group heading matches the AD+BS event rows.
  const yearGroupHeadings = buildYearGroupHeadings(rows);

  const releases: Release[] = rows.map(({ item, date, primaryDate, secondaryDate }) => ({
    version: primaryDate?.label || date.primary,
    date: secondaryDate?.label || "",
    year: primaryDate?.year ? yearGroupHeadings.get(primaryDate.year) : undefined,
    content: (
      <div className="space-y-1">
        <h3 className="text-base md:text-lg font-semibold leading-snug tracking-tight text-primary/90">
          {item.title}
        </h3>
        <p className="font-paragraph font-paragraph-compact measure-prose">
          {item.description}
        </p>
      </div>
    ),
  }));

  return (
    <section
      id="timeline"
      className={cn("scroll-mt-28 no-page-break max-w-4xl", className)}
      aria-label={title}
    >
      <CollapsibleCaseContent
        readMoreLabel={t("caseDetail.readMore")}
        showLessLabel={t("caseDetail.showLess")}
      >
        <ChangelogContent description="" heading={title} releases={releases} />
      </CollapsibleCaseContent>
    </section>
  );
}
