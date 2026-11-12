import type { ReactNode } from "react";

import { CaseSectionJumpNav, type CaseJumpSection } from "@/components/case-detail/case-section-jump-nav";
import { jumpToSection, useActiveSection } from "@/hooks/useActiveSection";
import { cn } from "@/lib/utils";

/**
 * The reading pages' body, after justice.jawafdehi.org: "on this page" in a
 * 13rem column on the left whose first link sits on the line of the first
 * heading, sticking once it reaches the top; the text in a column of at most
 * 46rem; on wide screens a matching empty 13rem column on the right. The
 * page's hero sits above this, full width, as on every other page. On a
 * phone the list becomes a scrolling row above the text.
 */
export function ReadingLayout({
  sections,
  children,
  className,
  navClassName,
}: Readonly<{
  sections: CaseJumpSection[];
  children: ReactNode;
  className?: string;
  /** Nudges the list so its first link meets a larger first heading's line. */
  navClassName?: string;
}>) {
  const active = useActiveSection(sections.map((section) => section.id));
  return (
    <div
      className={cn(
        "layout-container grid grid-cols-1 gap-y-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-16 xl:grid-cols-[13rem_minmax(0,46rem)_13rem] xl:justify-between",
        className,
      )}
    >
      <aside className="min-w-0">
        <CaseSectionJumpNav activeSection={active} onJump={jumpToSection} sections={sections} className={navClassName} />
      </aside>
      <div className="min-w-0 [&>*:first-child]:mt-0">{children}</div>
    </div>
  );
}
