import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EyebrowTone = "accent" | "primary";

type EyebrowProps = {
  children: ReactNode;
  className?: string;
  tone?: EyebrowTone;
};

const toneClassNames: Record<EyebrowTone, string> = {
  accent: "text-accent [--eyebrow-marker:hsl(var(--accent))]",
  primary: "text-primary [--eyebrow-marker:hsl(var(--primary))]",
};

export function Eyebrow({
  children,
  className,
  tone = "accent",
}: Readonly<EyebrowProps>) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]",
        toneClassNames[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 bg-[var(--eyebrow-marker)]"
      />
      {children}
    </p>
  );
}
