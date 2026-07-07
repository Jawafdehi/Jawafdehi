import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TransitionsTooltipProps {
  children: ReactNode;
  className?: string;
  content: ReactNode;
  contentClassName?: string;
}

export function TransitionsTooltip({
  children,
  className,
  content,
  contentClassName,
}: TransitionsTooltipProps) {
  const tooltipId = useId();

  return (
    <span className={cn("t-tt-wrap", className)}>
      <span
        aria-describedby={tooltipId}
        className="t-tt-trigger"
        tabIndex={0}
      >
        {children}
      </span>
      <span
        className={cn("t-tt", contentClassName)}
        id={tooltipId}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}
