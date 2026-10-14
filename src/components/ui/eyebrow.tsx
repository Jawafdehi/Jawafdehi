import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EyebrowTone = "accent" | "primary";

type EyebrowProps = {
  children: ReactNode;
  className?: string;
  tone?: EyebrowTone;
  /**
   * Element to render as. Defaults to `p`, which is right for a kicker above a
   * heading. Pass a heading tag where the eyebrow IS the section's heading —
   * styling it as a `p` would leave that section with nothing in the outline.
   */
  as?: "p" | "h2" | "h3";
};

const toneClassNames: Record<EyebrowTone, string> = {
  accent: "text-accent [--eyebrow-marker:hsl(var(--accent))]",
  primary: "text-primary [--eyebrow-marker:hsl(var(--primary))]",
};

export function Eyebrow({
  children,
  className,
  tone = "accent",
  as: Tag = "p",
}: Readonly<EyebrowProps>) {
  return (
    <Tag
      className={cn(
        "font-eyebrow inline-flex items-center gap-2",
        toneClassNames[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 bg-[var(--eyebrow-marker)]"
      />
      {children}
    </Tag>
  );
}
