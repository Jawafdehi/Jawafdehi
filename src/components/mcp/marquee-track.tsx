import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A row that drifts sideways forever.
 *
 * The track renders its children twice and travels exactly -50%, which is what
 * makes the loop seamless: the second copy arrives at the position the first
 * started from. Any other distance visibly jumps. The duplicate is aria-hidden
 * so a screen reader hears each item once.
 *
 * Motion is opt-in via `motion-safe`, and the fallback is a plain horizontally
 * scrollable row rather than a truncated one — under reduced motion every item
 * stays reachable by hand, so nothing is only available to people who let it
 * animate.
 *
 * Hovering or focusing anything inside pauses the travel, which is what makes
 * interactive content (a link on a card) usable while the row is moving.
 */
export function MarqueeTrack({
  items,
  renderItem,
  itemKey,
  /** Seconds for one full pass. Longer tracks need longer to read. */
  durationSeconds = 46,
  reverse = false,
  className,
  trackClassName,
}: Readonly<{
  items: readonly unknown[];
  renderItem: (item: never, index: number) => ReactNode;
  itemKey: (item: never, index: number) => string;
  durationSeconds?: number;
  reverse?: boolean;
  className?: string;
  trackClassName?: string;
}>) {
  return (
    <div
      className={cn(
        "group relative flex overflow-x-auto motion-safe:overflow-hidden",
        // Fade the row into the page at both ends instead of cutting it.
        "[mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-max shrink-0 gap-5 motion-safe:animate-marquee",
          "group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]",
          reverse && "[animation-direction:reverse]",
          trackClassName,
        )}
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            className="flex shrink-0 gap-5"
            aria-hidden={copy === 1 ? true : undefined}
          >
            {items.map((item, index) => (
              <li key={itemKey(item as never, index)} className="shrink-0">
                {renderItem(item as never, index)}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
