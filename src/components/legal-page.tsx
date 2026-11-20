import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";

import type { CaseJumpSection } from "@/components/case-detail/case-section-jump-nav";
import { ReadingLayout } from "@/components/reading-layout";
import { LightHero } from "@/components/ui/light-hero";

/**
 * The shape of /terms and /privacy: the light hero without its shader, then
 * the reading layout, the sticky "on this page" list beside an 18px column.
 * The list is read from the policy's own numbered h2s, so a section added to
 * the text appears in it with nothing else to update. The text may arrive
 * after the first paint (the legal bodies load lazily on the client, see
 * pages/legal/bodies.ts), so the list is re-read whenever the column changes.
 */
export function LegalPage({
  id,
  eyebrow,
  title,
  updated,
  heroExtra,
  bodyProps,
  children,
}: Readonly<{
  id: string;
  eyebrow: ReactNode;
  title: ReactNode;
  updated: ReactNode;
  /** Kept for callers; the list needs no heading in the reading layout. */
  contentsLabel?: string;
  /** Anything under the date in the hero (the language switch). */
  heroExtra?: ReactNode;
  /** Attributes for the prose column itself (data-legal-body, lang). */
  bodyProps?: HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string>;
  children: ReactNode;
}>) {
  const proseRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<CaseJumpSection[]>([]);

  useEffect(() => {
    const prose = proseRef.current;
    if (!prose) return;
    const read = () => {
      const headings = Array.from(prose.querySelectorAll<HTMLHeadingElement>("h2[id]"));
      setSections((current) => {
        const next = headings.map((heading) => ({ id: heading.id, label: heading.textContent ?? heading.id }));
        const same =
          current.length === next.length &&
          current.every((section, index) => section.id === next[index].id && section.label === next[index].label);
        return same ? current : next;
      });
    };
    read();
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(read);
    observer.observe(prose, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <main id="main-content" className="flex-1">
      <LightHero id={id} eyebrow={eyebrow} title={title} description={updated} shader={false}>
        {heroExtra}
      </LightHero>
      <section className="pb-20 md:pb-28">
        <ReadingLayout sections={sections}>
          <div
            {...bodyProps}
            ref={proseRef}
            className="font-paragraph content-prose [&>h2:first-child]:mt-0 [&_h2]:scroll-mt-28 [&_h2]:font-home-display [&_h2]:text-[1.75rem] [&_h2]:font-normal [&_h2]:text-primary [&_h3]:text-xl [&_h3]:font-normal [&_h3]:text-primary [&_li]:text-lg [&_li]:leading-[1.65] [&_p]:text-lg [&_p]:leading-[1.65]"
          >
            {children}
          </div>
        </ReadingLayout>
      </section>
    </main>
  );
}
