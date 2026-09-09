// An entity's identity as the case page and search results show it: the
// avatar and, beside or beneath it, the name and its other-script spelling.
//
// This exists so the text column is width-bound in exactly one place. In a
// centred flex column a child shrinks to its content, so a long name given
// only `min-w-0` grows past the card and neither wrapping nor truncation has a
// width to work against — a ministry name once ran across three cards. The
// tile's text block is `w-full`; the row's is `flex-1`. Both are `min-w-0`.
import type { ReactNode } from "react";

import { EntityAvatar } from "@/components/EntityAvatar";
import { cn } from "@/lib/utils";
import type { EntityKind } from "@/utils/entity-helpers";

interface EntityIdentityProps {
  kind: EntityKind;
  /** Picture URL; falls back to the kind's glyph. */
  src?: string | null;
  /** The name — plain text, or a link around it. */
  name: ReactNode;
  /** The other script's spelling, when the record has one and it differs. */
  alternate?: string | null;
  /** tile: avatar above a centred name (cards). row: avatar left of the name (list rows). */
  layout: "tile" | "row";
  /**
   * Element for the name. `h3` where the identity is the heading of a list
   * item; `span` where it sits inside a button, which cannot hold a heading.
   */
  nameAs?: "h3" | "span";
  /** Lines below the alternate name — a caption, a badge row. */
  children?: ReactNode;
}

export function EntityIdentity({
  kind,
  src,
  name,
  alternate,
  layout,
  nameAs = "span",
  children,
}: Readonly<EntityIdentityProps>) {
  const tile = layout === "tile";
  const Name = nameAs;
  return (
    <>
      <EntityAvatar kind={kind} src={src} size={tile ? "lg" : "sm"} />
      <div
        data-testid="entity-identity-text"
        className={cn("min-w-0", tile ? "w-full text-center" : "flex-1")}
      >
        <Name
          className={cn(
            "block break-words text-base font-medium leading-snug text-primary",
            tile && "text-balance",
          )}
        >
          {name}
        </Name>
        {alternate ? (
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">{alternate}</span>
        ) : null}
        {children}
      </div>
    </>
  );
}
