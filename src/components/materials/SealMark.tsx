import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * The crimson lal-mohar mark of the archive: a circular seal with bilingual
 * rim text. Pure SVG (no raster), draws in `currentColor` so the consumer
 * sets the ink (`text-accent` on paper, `text-accent-on-dark` on navy).
 * Decorative only — always rendered `aria-hidden`.
 */
export function SealMark({
  size = 96,
  className,
}: Readonly<{ size?: number; className?: string }>) {
  // The rim-text path needs a document-unique id: the seal renders twice on
  // /materials (hero and footer) and ids may not collide.
  const pathId = useId();

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      className={cn("text-accent", className)}
    >
      <circle cx="48" cy="48" r="45.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="48" cy="48" r="31" stroke="currentColor" strokeWidth="1" />
      <defs>
        <path
          id={pathId}
          d="M 48 9.5 A 38.5 38.5 0 1 1 47.99 9.5"
          fill="none"
        />
      </defs>
      <text
        fill="currentColor"
        fontSize="8.4"
        letterSpacing="0.14em"
        style={{ fontFamily: "var(--font-family-app)" }}
      >
        <textPath href={`#${pathId}`} startOffset="0">
          सार्वजनिक अभिलेख · PUBLIC RECORD ·
        </textPath>
      </text>
      <text
        x="48"
        y="46.5"
        textAnchor="middle"
        fill="currentColor"
        fontSize="10.5"
        fontWeight="500"
        className="font-display"
      >
        जवाफदेही
      </text>
      <line x1="36" y1="53" x2="60" y2="53" stroke="currentColor" strokeWidth="0.75" />
      <text
        x="48"
        y="62"
        textAnchor="middle"
        fill="currentColor"
        fontSize="5.6"
        letterSpacing="0.18em"
        style={{ fontFamily: "var(--font-family-app)" }}
      >
        JAWAFDEHI
      </text>
    </svg>
  );
}
