// The header's full-width menu panel (the Jasper header pattern): the group's
// pages as a list of name-and-line links on the left, and on the right a navy
// tile whose dither changes shape with the link under the pointer or focus.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { MegaMenuArt, type MegaMenuArtTone, type MegaMenuShape } from "@/components/nav/mega-menu-art";
import { cn } from "@/lib/utils";

export type MegaMenuItem = { key: string; label: string; to: string };

/** Each page's field: a shape that suits it, in the archive's blue or ember. */
const ART: Record<string, { shape: MegaMenuShape; tone: MegaMenuArtTone }> = {
  search: { shape: "warp", tone: "lattice" },
  materials: { shape: "dots", tone: "lattice" },
  courtcases: { shape: "ripple", tone: "ember" },
  research: { shape: "wave", tone: "lattice" },
  mcp: { shape: "swirl", tone: "ember" },
  about: { shape: "sphere", tone: "lattice" },
  openhouse: { shape: "ripple", tone: "ember" },
  process: { shape: "wave", tone: "lattice" },
  commitment: { shape: "warp", tone: "ember" },
  team: { shape: "dots", tone: "lattice" },
  products: { shape: "swirl", tone: "lattice" },
  faq: { shape: "simplex", tone: "ember" },
};
const FALLBACK_ART = { shape: "warp", tone: "lattice" } as const;

export function MegaMenuPanel({
  id,
  label,
  items,
  activePath,
  onNavigate,
}: Readonly<{
  id: string;
  label: string;
  items: MegaMenuItem[];
  activePath: string;
  onNavigate: () => void;
}>) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(items[0]?.key);
  const current = items.find((item) => item.key === hovered) ?? items[0];
  const art = ART[current?.key ?? ""] ?? FALLBACK_ART;

  return (
    <div
      id={id}
      className="absolute inset-x-0 top-full border-b border-border/70 bg-background animate-in fade-in slide-in-from-top-1 duration-150 ease-out motion-reduce:animate-none"
    >
      <div className="layout-container grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8 py-8">
        <div>
          <p className="px-4 text-sm text-muted-foreground">{label}</p>
          <ul className="mt-3 grid grid-cols-2 gap-1">
            {items.map((item) => {
              const isCurrent = activePath === item.to;
              return (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    aria-current={isCurrent ? "page" : undefined}
                    onPointerEnter={() => setHovered(item.key)}
                    onFocus={() => setHovered(item.key)}
                    onClick={onNavigate}
                    className={cn(
                      "block rounded-2xl px-4 py-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      hovered === item.key ? "bg-muted" : "hover:bg-muted",
                    )}
                  >
                    <span className="flex items-center gap-2 text-[17px] leading-6 text-primary">
                      {item.label}
                      {isCurrent ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                    </span>
                    <span className="mt-0.5 block text-sm leading-5 text-muted-foreground">
                      {t(`nav.desc.${item.key}`, "")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <MegaMenuArt
          shape={art.shape}
          tone={art.tone}
          title={current?.label ?? ""}
          line={t(`nav.desc.${current?.key ?? ""}`, "")}
        />
      </div>
    </div>
  );
}
