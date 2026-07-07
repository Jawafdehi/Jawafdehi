import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
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

export function CaseSectionJumpNav({
  activeSection,
  className,
  onJump,
  sections,
}: Readonly<CaseSectionJumpNavProps>) {
  const navRef = useRef<HTMLElement | null>(null);
  const [navHeight, setNavHeight] = useState(240);

  useEffect(() => {
    const node = navRef.current;
    if (!node) return;

    const updateHeight = () => setNavHeight(node.offsetHeight);

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(node);

    return () => resizeObserver.disconnect();
  }, [sections.length]);

  if (sections.length === 0) return null;

  const stickyStyle = {
    "--case-jump-sticky-top": `max(7rem, calc(50vh - ${Math.round(navHeight / 2)}px))`,
  } as CSSProperties;

  return (
    <nav
      ref={navRef}
      aria-label="Jump to case section"
      className={cn(
        "no-print min-w-0 lg:sticky lg:top-[var(--case-jump-sticky-top)] lg:pb-12",
        className
      )}
      style={stickyStyle}
    >
      <div className="flex gap-5 overflow-x-auto pb-3 lg:flex lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
        {sections.map((section) => {
          const isActive = section.id === activeSection;

          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={isActive ? "true" : undefined}
              onClick={onJump(section.id)}
              className={cn(
                "group flex items-start gap-2.5 max-w-48 whitespace-nowrap text-base font-medium leading-7 transition-all duration-300 lg:max-w-none lg:whitespace-normal",
                isActive
                  ? "lg:my-3 text-primary"
                  : "lg:my-0 text-primary/55 hover:text-primary"
              )}
            >
              <span className="flex h-7 w-8 shrink-0 items-center">
                <span
                  className={cn(
                    "h-[1.5px] transition-all duration-300",
                    isActive
                      ? "w-6 bg-primary"
                      : "w-3 bg-primary/20 group-hover:bg-primary/40"
                  )}
                />
              </span>
              <span className="truncate lg:overflow-visible lg:whitespace-normal">{section.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
