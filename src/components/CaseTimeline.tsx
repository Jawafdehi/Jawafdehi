import { formatDateWithBS } from "@/utils/date";
import type { TimelineEntry } from "@/types/jds";
import { cn } from "@/lib/utils";

interface CaseTimelineProps {
  timeline: TimelineEntry[];
  title: string;
  className?: string;
}

export function CaseTimeline({ timeline, title, className }: CaseTimelineProps) {
  if (timeline.length === 0) {
    return null;
  }

  return (
    <aside className={cn("no-page-break", className)} aria-label={title}>
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground print:text-lg print:normal-case print:tracking-normal print:text-foreground">
        {title}
      </h2>

      <ol className="relative ml-3 border-l border-primary/35 pl-6 print:border-border">
        {timeline.map((item, index) => (
          <li key={`${item.date}-${item.title}-${index}`} className="relative pb-8 last:pb-0">
            <span
              className={cn(
                "absolute -left-[31px] top-0 h-3.5 w-3.5 rounded-full border-2 bg-background",
                index === 0 ? "border-primary" : "border-primary/35"
              )}
              aria-hidden="true"
            />
            <p className="text-xs font-semibold text-primary print:text-sm print:text-foreground">
              {formatDateWithBS(item.date)}
            </p>
            <p className="mt-1 text-sm font-medium leading-snug text-muted-foreground print:text-foreground">
              {item.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground print:text-sm">
              {item.description}
            </p>
          </li>
        ))}
      </ol>
    </aside>
  );
}
