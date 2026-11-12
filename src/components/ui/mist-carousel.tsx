import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { cn } from "@/lib/utils";

export type MistSlide = {
  key: string;
  /** Names the slide for its progress dot (screen readers). */
  label: string;
  title: ReactNode;
  body?: ReactNode;
  /** The right-hand side: commands, an answer, a picture. */
  aside: ReactNode;
};

/**
 * One light card on the mist shader that moves through a few slides on its own
 * (likhit's OCR setups, the MCP's example questions): a display title and a
 * line on the left, the slide's material on the right, and progress dots under
 * the card. It advances every `dwellMs`; hover or focus pauses it, a click on
 * a dot hands it to the reader for good, and reduced motion never starts it.
 *
 * Every slide sits in the same grid cell and only the active one shows, so the
 * card is always as tall as the tallest and never jumps when it moves on.
 */
export function MistCarousel({
  slides,
  ariaLabel,
  dwellMs = 6000,
  titleClassName,
  columnsClassName = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]",
  design = "mist",
}: Readonly<{
  slides: MistSlide[];
  ariaLabel: string;
  dwellMs?: number;
  titleClassName?: string;
  columnsClassName?: string;
  /** The light shader behind the card: mist (likhit) or silk (the MCP page). */
  design?: "mist" | "silk";
}>) {
  const [active, setActive] = useState(slides[0]?.key);
  const [paused, setPaused] = useState(false);
  const [manual, setManual] = useState(false);
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const auto = !manual && !paused && !reduced && slides.length > 1;

  useEffect(() => {
    if (!auto) return;
    const id = window.setTimeout(() => {
      const index = slides.findIndex(({ key }) => key === active);
      setActive(slides[(index + 1) % slides.length].key);
    }, dwellMs);
    return () => window.clearTimeout(id);
  }, [active, auto, dwellMs, slides]);

  const choose = (key: string) => {
    setManual(true);
    setActive(key);
  };

  return (
    <div
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative isolate overflow-hidden rounded-[28px] border border-border/70 bg-surface">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <ShaderBackdrop design={design} />
        </div>
        <div className="grid p-6 md:p-10">
          {slides.map(({ key, title, body, aside }) => {
            const shown = key === active;
            return (
              <div
                key={key}
                data-active={shown}
                aria-hidden={!shown}
                // React 18's types predate `inert`; the DOM takes it as an attribute.
                {...((shown ? {} : { inert: "" }) as Record<string, string>)}
                className={cn(
                  "col-start-1 row-start-1 grid grid-cols-1 gap-8 transition-opacity duration-300 ease-out motion-reduce:transition-none lg:gap-12",
                  columnsClassName,
                  shown ? "opacity-100" : "invisible opacity-0",
                )}
              >
                <div className="min-w-0">
                  <h3
                    className={cn(
                      "font-home-display text-[clamp(1.9rem,3vw,2.75rem)] leading-[1.08] text-primary [:root[lang=ne]_&]:leading-[1.28]",
                      titleClassName,
                    )}
                  >
                    {title}
                  </h3>
                  {body ? <div className="mt-4 max-w-md text-lg leading-8 text-muted-foreground">{body}</div> : null}
                </div>
                <div className="min-w-0 self-stretch">{aside}</div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Progress, under the card: the active dot stretches into a bar that
          fills over the dwell time while it advances on its own, and sits full
          once the reader has taken over. Each dot jumps to its slide. */}
      <div role="group" aria-label={ariaLabel} className="mt-5 flex items-center justify-center gap-1">
        {slides.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={key === active}
            aria-label={label}
            onClick={() => choose(key)}
            className="group flex h-6 min-w-6 items-center justify-center rounded-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn(
                "relative block h-1.5 overflow-hidden rounded-full bg-accent/15 transition-[width,background-color] duration-300 ease-out",
                key === active ? "w-8" : "w-1.5 group-hover:bg-accent/30",
              )}
            >
              {key === active ? (
                <span
                  key={`${active}-${auto}`}
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full bg-accent/50",
                    auto ? "animate-[ocr-progress_linear_forwards]" : "w-full",
                  )}
                  style={auto ? { animationDuration: `${dwellMs}ms` } : undefined}
                />
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
