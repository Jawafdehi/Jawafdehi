import ChangelogContent from "@/components/ui/timeline-component-05";
import type { Release } from "@/components/ui/timeline-component-05";
import { formatDateRangeForLanguage } from "@/utils/date";
import type { LocalizedDatePair } from "@/utils/date";
import type { TimelineEntry } from "@/types/jds";
import { cn } from "@/lib/utils";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { CollapsibleCaseContent } from "@/components/case-detail/collapsible-case-content";
import { buildYearGroupHeadings } from "@/components/case-detail/case-timeline-headings";

interface CaseTimelineSectionProps {
  className?: string;
  language: string;
  timeline: TimelineEntry[];
  title: string;
  /**
   * `"section"` — the standalone page section it has always been: owns the
   * `#timeline` anchor and its heading, collapses past one screen, date pills
   * stick under the app header.
   *
   * `"embedded"` — inside the "Where this case stands" modal or the print sheet,
   * where the container already supplies the heading and the scrolling. Drops
   * the anchor id (the stands section holds it, and two elements cannot), the
   * collapse (a nested scroll area inside a modal traps the wheel), and the
   * sticky offset (measured from a header that is not there).
   */
  presentation?: "section" | "embedded";
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
  presentation = "section",
  timeline,
  title,
}: Readonly<CaseTimelineSectionProps>) {
  const { t } = useTranslation();
  const instanceId = useId();

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

  const embedded = presentation === "embedded";
  // The modal copy and the print copy are both embedded and can be mounted at
  // once, so the row anchors need a per-instance prefix, not a per-mode one.
  const body = (
    <ChangelogContent
      description=""
      heading={embedded ? "" : title}
      idPrefix={embedded ? `timeline${instanceId}-` : ""}
      releases={releases}
      sticky={!embedded}
    />
  );

  return (
    <section
      id={embedded ? undefined : "timeline"}
      className={cn("scroll-mt-28 no-page-break max-w-4xl", className)}
      aria-label={title}
    >
      {embedded ? (
        body
      ) : (
        <CollapsibleCaseContent
          readMoreLabel={t("caseDetail.readMore")}
          showLessLabel={t("caseDetail.showLess")}
        >
          {body}
        </CollapsibleCaseContent>
      )}
    </section>
  );
}
