// The entity "photo" as it appears on the case page and in search results: a
// circle holding the picture when the record has one, else a person /
// organisation / place glyph. Almost no NES record carries an image, so the
// glyph is the designed default rather than an error state.
import { useState } from "react";
import { Building2, MapPin, User } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EntityKind } from "@/utils/entity-helpers";

const GLYPH = { person: User, organization: Building2, location: MapPin } as const;

const SIZE = {
  sm: { box: "h-12 w-12", px: 48, glyph: "h-5 w-5" },
  lg: { box: "h-24 w-24", px: 96, glyph: "h-10 w-10" },
} as const;

interface EntityAvatarProps {
  kind: EntityKind;
  /** Picture URL; a load failure falls back to the glyph. */
  src?: string | null;
  size?: keyof typeof SIZE;
}

export function EntityAvatar({ kind, src, size = "lg" }: Readonly<EntityAvatarProps>) {
  const [failed, setFailed] = useState(false);
  const s = SIZE[size];
  const Glyph = GLYPH[kind];
  return (
    <div className={cn("shrink-0 overflow-hidden rounded-full border border-border/70 bg-muted", s.box)}>
      {src && !failed ? (
        <img
          src={src}
          alt=""
          width={s.px}
          height={s.px}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn("h-full w-full", kind === "person" ? "object-cover" : "object-contain bg-white p-3")}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Glyph aria-hidden="true" className={s.glyph} />
        </div>
      )}
    </div>
  );
}
