import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

export type ToolSlide = {
  key: string;
  icon: LucideIcon;
  name: string;
  description: string;
  /** Internal route this capability is browsable at, when one exists. */
  to?: string;
  /**
   * Screenshot of a real response. Left unset for now — the slide falls back
   * to a placeholder rather than shipping a fabricated screenshot, so dropping
   * the real asset in is a one-line change per slide.
   */
  preview?: string;
};

/**
 * The capability row: a preview panel per slide, with the title, description
 * and link sitting UNDER the panel on the page background rather than inside
 * a card.
 *
 * A native CSS scroll-snap scroller, not a carousel library — the same
 * reasoning as RecentMaterialsCarousel: three slides already fit at `lg`, so a
 * library would only re-add swipe physics the browser has, at a cost the
 * initial-payload budget would feel.
 */
export function ToolCarousel({
  slides,
  label,
  learnMore,
  learnMoreAbout,
  prevLabel,
  nextLabel,
}: Readonly<{
  slides: readonly ToolSlide[];
  label: string;
  learnMore: string;
  /** Builds a per-slide accessible name; six identical "Learn more" links otherwise. */
  learnMoreAbout: (name: string) => string;
  prevLabel: string;
  nextLabel: string;
}>) {
  const scroller = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const syncEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    // 1px of slack: sub-pixel layout leaves scrollLeft a hair under the max.
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    syncEdges();
    window.addEventListener("resize", syncEdges);
    return () => window.removeEventListener("resize", syncEdges);
  }, [syncEdges]);

  const page = (direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const first = el.querySelector("li");
    const stride = first ? first.getBoundingClientRect().width + 20 : el.clientWidth;
    el.scrollBy({ left: stride * direction, behavior: "smooth" });
  };

  return (
    <div className="mt-8">
      <ul
        ref={scroller}
        onScroll={syncEdges}
        // Focusable so the row is keyboard-scrollable (WCAG 2.1.1), and named
        // because a focusable region needs an accessible name.
        tabIndex={0}
        aria-label={label}
        className={cn(
          // snap-proximity rather than mandatory: mandatory snapping bounces a
          // scroll that reaches the end back to the previous slide, which puts
          // the last capability out of reach on a phone.
          "scrollbar-none -mx-1 flex list-none snap-x snap-proximity scroll-px-1 gap-5 overflow-x-auto p-1",
          "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        {slides.map(({ key, icon: Icon, name, description, to, preview }) => (
          <li
            key={key}
            className="min-w-0 shrink-0 basis-[85%] snap-start sm:basis-[calc(50%-0.625rem)] lg:basis-[calc(33.333%-0.834rem)]"
          >
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
              {preview ? (
                <img
                  src={preview}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                // Decorative placeholder, not a mock response: inventing a
                // screenshot of an answer the server never gave would be a
                // claim we cannot stand behind.
                <span
                  aria-hidden="true"
                  className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-background/70 shadow-elev-xs"
                >
                  <Icon className="h-6 w-6 text-accent" />
                </span>
              )}
            </div>

            <h3 className="mt-5 text-lg font-bold text-primary">{name}</h3>
            <p className="mt-2 font-paragraph font-paragraph-foreground text-sm">{description}</p>

            {to ? (
              <Link
                to={to}
                aria-label={learnMoreAbout(name)}
                className="group/more mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {learnMore}
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 group-hover/more:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover/more:translate-x-0">
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </Link>
            ) : null}
          </li>
        ))}
      </ul>

      {/* Arrows are discoverability, not the only way through — the row scrolls
          and snaps without them. Shown at every width: three slides fit at `lg`
          and there are six, so there is always something off-screen. */}
      <div className="mt-6 flex gap-2">
        <CarouselButton label={prevLabel} disabled={atStart} onClick={() => page(-1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </CarouselButton>
        <CarouselButton label={nextLabel} disabled={atEnd} onClick={() => page(1)}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </CarouselButton>
      </div>
    </div>
  );
}

function CarouselButton({
  label,
  disabled,
  onClick,
  children,
}: Readonly<{
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-primary transition-opacity hover:bg-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children}
    </button>
  );
}
