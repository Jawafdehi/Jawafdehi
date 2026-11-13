// A two-tone section title: the statement in navy, its second half in grey.
// Emphasis by tone rather than weight or colour.
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SplitHeading({ lead, rest, className, id }: { lead: ReactNode; rest: ReactNode; className?: string; id?: string }) {
  return (
    <h2 id={id} className={cn("font-home-section-title max-w-[22ch] text-primary", className)}>
      {lead} <span className="text-muted-foreground/70">{rest}</span>
    </h2>
  );
}
