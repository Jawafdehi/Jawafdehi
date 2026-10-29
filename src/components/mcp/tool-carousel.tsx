import { ChevronRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { MarqueeTrack } from "@/components/mcp/marquee-track";

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
 * The row drifts on its own rather than waiting to be dragged — six slides sit
 * behind a four-wide window, so a static row would hide a third of the
 * catalogue from anyone who never thought to scroll it. Hovering pauses the
 * travel, which is what keeps the "learn more" links clickable.
 */
export function ToolCarousel({
  slides,
  learnMore,
  learnMoreAbout,
}: Readonly<{
  slides: readonly ToolSlide[];
  learnMore: string;
  /** Builds a per-slide accessible name; six identical "Learn more" links otherwise. */
  learnMoreAbout: (name: string) => string;
}>) {
  return (
    <MarqueeTrack
      className="mt-8"
      // Six slides at this width is a long track; a slower pass keeps each
      // card legible as it goes by.
      durationSeconds={64}
      items={slides}
      itemKey={(slide: ToolSlide) => slide.key}
      renderItem={({ icon: Icon, name, description, to, preview }: ToolSlide) => (
        <div className="w-[14rem] sm:w-[15rem] lg:w-[15.5rem]">
          <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
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
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-background/70 shadow-elev-xs"
              >
                <Icon className="h-5 w-5 text-accent" />
              </span>
            )}
          </div>

          <h3 className="mt-4 text-base font-bold text-primary">{name}</h3>
          <p className="mt-1.5 font-paragraph font-paragraph-foreground text-sm">{description}</p>

          {to ? (
            <Link
              to={to}
              aria-label={learnMoreAbout(name)}
              className="group/more mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {learnMore}
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 group-hover/more:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover/more:translate-x-0">
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </span>
            </Link>
          ) : null}
        </div>
      )}
    />
  );
}
