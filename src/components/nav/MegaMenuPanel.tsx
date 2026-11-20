// The header's full-width menu panel (the Jasper header pattern): the group's
// pages as a list of name-and-line links on the left, and on the right a white
// tile whose light dither changes shape with the link under the pointer or focus.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ArrowUpRight } from "@/components/icons";

import { MegaMenuArt, type MegaMenuArtTone, type MegaMenuShape } from "@/components/nav/mega-menu-art";
import { cn } from "@/lib/utils";

/** `external`: a site of ours off this one (research.jawafdehi.org), opened in a new tab. */
export type MegaMenuItem = { key: string; label: string; to: string; external?: boolean };

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
      className="absolute inset-x-0 top-full pt-1 animate-in fade-in slide-in-from-top-1 duration-150 ease-out motion-reduce:animate-none"
    >
      {/* As wide as the page's content, not the window: a white panel inside
          the layout container, the links and the picture split by a hairline. */}
      <div className="layout-container">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] rounded-[28px] border border-border/70 bg-background p-3 shadow-[0_16px_40px_-24px_rgba(14,31,59,0.25)]">
        <div className="border-r border-border/70 p-3 pr-6">
          <ul aria-label={label} className="grid grid-cols-2 gap-1">
            {items.map((item) => {
              const isCurrent = activePath === item.to;
              return (
                <li key={item.key}>
                  {(() => {
                    const className = cn(
                      "block rounded-2xl px-4 py-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      hovered === item.key ? "bg-muted" : "hover:bg-muted",
                    );
                    const body = (
                      <>
                        <span className="flex items-center gap-1.5 text-[17px] leading-6 text-primary">
                          {item.label}
                          {item.external ? <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> : null}
                        </span>
                        <span className="mt-0.5 block text-sm leading-5 text-muted-foreground">
                          {t(`nav.desc.${item.key}`, "")}
                        </span>
                      </>
                    );
                    const hover = { onPointerEnter: () => setHovered(item.key), onFocus: () => setHovered(item.key) };
                    return item.external ? (
                      <a href={item.to} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={className} {...hover}>
                        {body}
                      </a>
                    ) : (
                      <Link
                        to={item.to}
                        aria-current={isCurrent ? "page" : undefined}
                        onClick={onNavigate}
                        className={className}
                        {...hover}
                      >
                        {body}
                      </Link>
                    );
                  })()}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="p-3 pl-6">
          <MegaMenuArt
            shape={art.shape}
            tone={art.tone}
            title={current?.label ?? ""}
            line={t(`nav.desc.${current?.key ?? ""}`, "")}
          />
        </div>
        </div>
      </div>
    </div>
  );
}
