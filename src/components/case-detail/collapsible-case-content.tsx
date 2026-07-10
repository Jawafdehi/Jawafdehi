import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
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
            "relative z-10 flex justify-center pt-3",
            !expanded && "-mt-20 bg-gradient-to-t from-background via-background to-transparent pt-16",
          )}
        >
          <Button
            aria-controls={contentId}
            aria-expanded={expanded}
            className="min-h-11 flex-col gap-1 px-4"
            onClick={() => setExpanded((value) => !value)}
            type="button"
            variant="disclosure"
          >
            <span>{expanded ? showLessLabel : readMoreLabel}</span>
            <ChevronDown
              aria-hidden="true"
              className={cn("h-4 w-4 transition-transform duration-200 motion-reduce:transition-none", expanded && "rotate-180")}
            />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
