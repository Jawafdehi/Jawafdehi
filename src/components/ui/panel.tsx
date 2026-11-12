// The site's card, in the quiet style of the redesign: a light-grey panel
// set inside a white frame with a hairline border, no shadow. `tone="dark"`
// is the one navy panel a section may feature. PanelLabel is the small grey
// line above a panel's title, in place of a red eyebrow.
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type PanelProps = HTMLAttributes<HTMLDivElement> & { tone?: "light" | "dark" };

export function Panel({ tone = "light", className, children, ...props }: PanelProps) {
  if (tone === "dark") {
    return (
      <div className={cn("flex flex-col rounded-[28px] bg-primary-surface p-7 text-primary-foreground", className)} {...props}>
        {children}
      </div>
    );
  }
  return (
    <div className="h-full rounded-[28px] border border-border/70 bg-surface p-2">
      <div className={cn("flex h-full flex-col rounded-[22px] bg-muted p-6", className)} {...props}>
        {children}
      </div>
    </div>
  );
}

export function PanelLabel({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return <p className={cn("text-sm", onDark ? "text-primary-foreground/55" : "text-muted-foreground")}>{children}</p>;
}
