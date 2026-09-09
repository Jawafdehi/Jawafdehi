import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CaseProgressRail } from "@/components/case-detail/case-progress-rail";
import { CaseTimelineSection } from "@/components/case-detail/case-timeline-section";
import type { CaseProgress } from "@/lib/case-progress";
import type { TimelineEntry } from "@/types/jds";
import { cn } from "@/lib/utils";

interface CaseStandsSectionProps {
  className?: string;
  language: string;
  progress: CaseProgress;
  timeline: TimelineEntry[];
  timelineTitle: string;
}

/**
 * "Where this case stands" in the slot the editorial timeline used to hold.
 *
 * The two sections answer different questions. The rail answers the one a reader
 * arrives with — how far has this got, and is anything still on foot — in five
 * lines derived from the court dockets. The timeline is the archive's narrative
 * account, and at full length it pushed the rest of the page off the first
 * screen. So the short answer takes the slot and the long one moves behind a
 * dialog.
 *
 * The timeline is NOT dropped. It is often the only place a piece of context
 * exists, so it stays one click away here and prints unconditionally from the
 * print-only copy in `CaseDetail` — a dialog does not print, and the printout is
 * meant to be the whole public record.
 *
 * Rendered only when `deriveCaseProgress` returned a rail. For the 13 of 62
 * published cases with no `special/*-CR-*` docket there is no short answer to
 * lead with, so `CaseDetail` falls back to the timeline as its own section.
 */
export function CaseStandsSection({
  className,
  language,
  progress,
  timeline,
  timelineTitle,
}: Readonly<CaseStandsSectionProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <section
      // Keeps the `#timeline` deep links that already exist in the wild
      // resolving to the section that replaced it, rather than to nothing.
      id="timeline"
      className={cn("scroll-mt-28 no-page-break max-w-4xl", className)}
      aria-label={t("caseDetail.progress.heading")}
    >
      <CaseProgressRail progress={progress} />

      {timeline.length > 0 && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 min-h-11" size="sm" variant="outline">
              {t("caseDetail.progress.openTimeline")}
              <ArrowRight aria-hidden="true" className="ml-1 h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="flex h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-3xl sm:gap-4">
            {/* pr-12 clears the dialog's own absolutely-positioned close button. */}
            <DialogHeader className="shrink-0 px-5 pb-4 pr-12 pt-5 text-left sm:px-6 sm:pr-12">
              <DialogTitle>{timelineTitle}</DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <CaseTimelineSection
                language={language}
                presentation="embedded"
                timeline={timeline}
                title={timelineTitle}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
