import type { ReactNode } from "react";

import { CaseSectionJumpNav, type CaseJumpSection } from "@/components/case-detail/case-section-jump-nav";
import { Eyebrow } from "@/components/ui/eyebrow";
import { jumpToSection, useActiveSection } from "@/hooks/useActiveSection";
import { cn } from "@/lib/utils";

/**
 * The reading pages' grid, after justice.jawafdehi.org: "on this page" in a
 * sticky 13rem column on the left, the header and the text in one column of at
 * most 46rem, and on wide screens a matching empty 13rem column on the right
 * so the text sits centred. The header shares the text's left edge, so the
 * page has one measure top to bottom. On a phone: header, then the list as a
 * scrolling row, then the text.
 */
export function ReadingLayout({
  sections,
  header,
  children,
  className,
}: Readonly<{ sections: CaseJumpSection[]; header?: ReactNode; children: ReactNode; className?: string }>) {
  const active = useActiveSection(sections.map((section) => section.id));
  return (
    <div
      className={cn(
        "layout-container grid grid-cols-1 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-16 xl:grid-cols-[13rem_minmax(0,46rem)_13rem] xl:justify-between",
        className,
      )}
    >
      {header ? <div className="min-w-0 lg:col-start-2 lg:row-start-1">{header}</div> : null}
      <aside className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <CaseSectionJumpNav activeSection={active} onJump={jumpToSection} sections={sections} />
      </aside>
      <div className="min-w-0 lg:col-start-2 lg:row-start-2">{children}</div>
    </div>
  );
}

/** The plain header of a reading page: eyebrow, title, line, and any notes. */
export function ReadingHeader({
  id,
  eyebrow,
  title,
  description,
  children,
}: Readonly<{ id: string; eyebrow: ReactNode; title: ReactNode; description?: ReactNode; children?: ReactNode }>) {
  return (
    <header className="pb-10 pt-16 md:pb-14 md:pt-24">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 id={id} className="font-home-display mt-4 text-4xl text-primary sm:text-5xl md:text-[3.5rem]">
        {title}
      </h1>
      {description ? <p className="mt-5 text-xl leading-8 text-muted-foreground">{description}</p> : null}
      {children}
    </header>
  );
}
