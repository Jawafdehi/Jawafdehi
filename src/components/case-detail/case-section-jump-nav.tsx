import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";

export type CaseJumpSection = {
  id: string;
  label: string;
};

interface CaseSectionJumpNavProps {
  activeSection: string;
  className?: string;
  onJump: (sectionId: string) => (event: MouseEvent<HTMLAnchorElement>) => void;
  sections: CaseJumpSection[];
}

/**
 * "On this page", the justice.jawafdehi.org way: plain links in the reading
 * column's grey, the section in view in navy, nothing else. Sticky at 112px
 * from the top in a 13rem column on desktop; a sideways-scrolling row on a
 * phone. Every reading page (cases, court cases, research, the FAQ, terms
 * and privacy) uses this one list.
 */
export function CaseSectionJumpNav({
  activeSection,
  className,
  onJump,
  sections,
}: Readonly<CaseSectionJumpNavProps>) {
  if (sections.length === 0) return null;

  return (
    <nav
      aria-label="Jump to case section"
      className={cn(
        "no-print flex min-w-0 gap-5 overflow-x-auto pb-3 [scrollbar-width:none] lg:sticky lg:top-28 lg:flex-col lg:gap-3.5 lg:overflow-visible lg:pb-12 lg:pt-11",
        className,
      )}
    >
      {sections.map((section) => {
        const isActive = section.id === activeSection;
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={isActive ? "true" : undefined}
            onClick={onJump(section.id)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-sm text-[15px] leading-[1.4] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:whitespace-normal",
              isActive ? "text-primary" : "text-muted-foreground hover:text-primary",
            )}
          >
            {section.label}
          </a>
        );
      })}
    </nav>
  );
}
