import { cn } from "@/lib/utils";

/**
 * A row of example prompts that drifts sideways, in the manner of Linear's
 * agent cards.
 *
 * The track renders the list twice and travels exactly -50%, which is what
 * makes the loop seamless — the second copy arrives at the position the first
 * started from. The duplicate is `aria-hidden` so a screen reader hears each
 * prompt once.
 *
 * Reduced motion stops the travel rather than hiding anything: the row keeps
 * its first cards on screen and the reader scrolls the container by hand, so
 * no content is only reachable through an animation.
 */
export function PromptMarquee({
  items,
  reverse = false,
  className,
}: Readonly<{ items: readonly string[]; reverse?: boolean; className?: string }>) {
  return (
    <div
      className={cn(
        "group relative flex overflow-x-auto motion-safe:overflow-hidden",
        // Fade the row out into the page at both ends instead of cutting it.
        "[mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-max shrink-0 gap-4 motion-safe:animate-marquee",
          // Let a reader stop a card to finish reading it.
          "group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]",
          reverse && "[animation-direction:reverse]",
        )}
      >
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            className="flex shrink-0 gap-4"
            aria-hidden={copy === 1 ? true : undefined}
          >
            {items.map((text) => (
              <li
                key={text}
                className="w-[19rem] shrink-0 rounded-lg border border-border bg-background/80 p-4 text-sm leading-relaxed text-foreground shadow-sm backdrop-blur-sm sm:w-[22rem]"
              >
                <span
                  className="mr-2 select-none font-mono text-accent"
                  aria-hidden="true"
                >
                  &gt;
                </span>
                {text}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
