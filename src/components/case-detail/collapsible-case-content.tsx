import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "@/components/icons";

import { cn } from "@/lib/utils";

type CollapsibleCaseContentProps = {
  children: ReactNode;
  className?: string;
  readMoreLabel: string;
  showLessLabel: string;
};

/**
 * Keeps an unusually long public-record section scannable without creating a
 * nested scroll area. The section expands in place only when its content is
 * taller than the available first-screen reading area.
 */
export function CollapsibleCaseContent({
  children,
  className,
  readMoreLabel,
  showLessLabel,
}: Readonly<CollapsibleCaseContentProps>) {
  const contentId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const content = contentRef.current;

    if (!content) return;

    const updateOverflow = () => {
      setIsOverflowing(content.scrollHeight > window.innerHeight + 1);
    };

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(content);
    window.addEventListener("resize", updateOverflow);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateOverflow);
    };
    // ResizeObserver already reacts to content size changes (incl. children
    // updates), so we don't re-run — and re-subscribing on every render churns.
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "transition-[max-height] duration-200 motion-reduce:transition-none",
          !expanded && "max-h-[100svh] overflow-hidden",
        )}
        id={contentId}
      >
        <div ref={contentRef}>{children}</div>
      </div>

      {isOverflowing ? (
        <div
          className={cn(
            "relative z-10 flex justify-start pt-3",
            !expanded && "-mt-20 bg-gradient-to-t from-background via-background to-transparent pt-16",
          )}
        >
          {/* The page's one "more" control: the grey pill "View N more"
              uses on the parties, label then chevron. */}
          <button
            aria-controls={contentId}
            aria-expanded={expanded}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-muted px-5 text-[15px] text-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.08] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            <span>{expanded ? showLessLabel : readMoreLabel}</span>
            <ChevronDown
              aria-hidden="true"
              className={cn("h-4 w-4 transition-transform duration-200 motion-reduce:transition-none", expanded && "rotate-180")}
            />
          </button>
        </div>
      ) : null}
    </div>
  );
}
