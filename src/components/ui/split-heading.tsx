// A two-tone section title: the statement in navy, its second half in grey.
// Emphasis by tone rather than weight or colour.
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// `restOnNewLine` puts the grey half on a line of its own from lg up, and drops
// the measure so the navy statement can hold one line.
export function SplitHeading({
  lead,
  rest,
  className,
  id,
  restOnNewLine = false,
}: {
  lead: ReactNode;
  rest: ReactNode;
  className?: string;
  id?: string;
  restOnNewLine?: boolean;
}) {
  return (
    <h2
      id={id}
      className={cn("font-home-section-title text-primary", restOnNewLine ? "max-w-none" : "max-w-[22ch]", className)}
    >
      {lead} <span className={cn("text-muted-foreground/70", restOnNewLine && "lg:block")}>{rest}</span>
    </h2>
  );
}
