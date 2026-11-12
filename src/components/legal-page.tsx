import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { CaseJumpSection } from "@/components/case-detail/case-section-jump-nav";
import { ReadingHeader, ReadingLayout } from "@/components/reading-layout";

/**
 * The shape of /terms and /privacy: the reading layout, the sticky "on this
 * page" list beside the header and an 18px policy column. The list is read from the policy's own numbered h2s, so a section
 * added to the text appears in it with nothing else to update.
 */
export function LegalPage({
  id,
  eyebrow,
  title,
  updated,
  children,
}: Readonly<{
  id: string;
  eyebrow: string;
  title: string;
  updated: string;
  /** Kept for callers; the list needs no heading in the reading layout. */
  contentsLabel?: string;
  children: ReactNode;
}>) {
  const proseRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<CaseJumpSection[]>([]);

  useEffect(() => {
    const headings = Array.from(proseRef.current?.querySelectorAll<HTMLHeadingElement>("h2[id]") ?? []);
    setSections(headings.map((heading) => ({ id: heading.id, label: heading.textContent ?? heading.id })));
  }, []);

  return (
    <main id="main-content" className="flex-1">
      <section className="pb-20 md:pb-28">
        <ReadingLayout
          sections={sections}
          header={<ReadingHeader id={id} eyebrow={eyebrow} title={title} description={updated} />}
        >
          <div
            ref={proseRef}
            className="font-paragraph content-prose [&_h2]:scroll-mt-28 [&_h2]:font-home-display [&_h2]:text-[1.75rem] [&_h2]:font-normal [&_h2]:text-primary [&_h3]:text-xl [&_h3]:font-normal [&_h3]:text-primary [&_li]:text-lg [&_li]:leading-[1.65] [&_p]:text-lg [&_p]:leading-[1.65]"
          >
            {children}
          </div>
        </ReadingLayout>
      </section>
    </main>
  );
}
