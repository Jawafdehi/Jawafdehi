import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

import { CaseSectionJumpNav, type CaseJumpSection } from "@/components/case-detail/case-section-jump-nav";
import { LightHero } from "@/components/ui/light-hero";

/**
 * The shape of /terms and /privacy: the light page hero, then the policy with
 * the reading pages' contents list beside it (the line marker that follows
 * the section in view, as on /faq and the case pages). The list is read from
 * the policy's own numbered h2s, so a section added to the text appears in it
 * with nothing else to update.
 */
export function LegalPage({
  id,
  eyebrow,
  title,
  updated,
  contentsLabel,
  children,
}: Readonly<{
  id: string;
  eyebrow: string;
  title: string;
  updated: string;
  contentsLabel: string;
  children: ReactNode;
}>) {
  const proseRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<CaseJumpSection[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    const headings = Array.from(proseRef.current?.querySelectorAll<HTMLHeadingElement>("h2[id]") ?? []);
    setSections(headings.map((heading) => ({ id: heading.id, label: heading.textContent ?? heading.id })));
    if (headings.length === 0) return;

    // The last heading whose top has passed the middle of the viewport, or the
    // last one once the page bottoms out — the same rule as /faq.
    let frame = 0;
    const update = () => {
      frame = 0;
      const readingLine = window.innerHeight * 0.5;
      let next = headings[0].id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= readingLine) next = heading.id;
        else break;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
        next = headings[headings.length - 1].id;
      }
      setActive((current) => (current === next ? current : next));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const jump = (sectionId: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `${window.location.pathname}#${sectionId}`);
  };

  return (
    <main id="main-content" className="flex-1">
      <LightHero id={id} eyebrow={eyebrow} title={title} description={updated} />
      <section className="pb-20 md:pb-28">
        <div className="layout-container grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          <aside className="hidden min-w-0 lg:block lg:self-start">
            <div className="lg:sticky lg:top-28">
              <h2 className="mb-4 text-sm text-muted-foreground">{contentsLabel}</h2>
              <CaseSectionJumpNav activeSection={active} onJump={jump} sections={sections} />
            </div>
          </aside>
          <div
            ref={proseRef}
            className="font-paragraph content-prose max-w-3xl [&_h2]:scroll-mt-28 [&_h2]:font-home-display [&_h2]:text-[1.75rem] [&_h2]:font-normal [&_h2]:text-primary [&_h3]:text-xl [&_h3]:font-normal [&_h3]:text-primary [&_li]:text-[17px] [&_li]:leading-8 [&_p]:text-[17px] [&_p]:leading-8"
          >
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
