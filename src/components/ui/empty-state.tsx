import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The scenes, from Open Doodles by Pablo Stanley (opendoodles.com, CC0 public
 * domain), recoloured to the brand navy and crimson and served from
 * public/assets/illustrations/. Each state picks the scene that reads as it:
 *
 *   notFound      someone strolling off: the thing is not here
 *   noResults     someone reading, surrounded by books: nothing matched
 *   couldNotLoad  someone stumbling, things flying: the request fell over
 *   nothingYet    someone opening an empty box: there is nothing yet
 *   somethingBroke someone tripping, papers everywhere: the page itself broke
 *   waiting       someone meditating: give it a moment
 *   thanks        someone with a heart: a thank-you
 *   celebrate     someone jumping: it worked
 */
const SCENES = {
  notFound: "strolling",
  noResults: "sitting-reading",
  couldNotLoad: "zombieing",
  nothingYet: "unboxing",
  somethingBroke: "clumsy",
  waiting: "meditating",
  thanks: "loving",
  celebrate: "jumping",
} as const;

export type EmptyStateKind = keyof typeof SCENES;

/**
 * One empty, error or success state, the same everywhere: the scene, a title,
 * one line, and any actions. `compact` is for states inside a card or a list
 * (a smaller scene, less space); the default is for a whole page or section.
 * The scene is decorative; the title says what happened.
 */
export function EmptyState({
  kind,
  title,
  description,
  actions,
  compact = false,
  className,
  headingLevel: Heading = "h2",
  fullHeight = false,
}: Readonly<{
  kind: EmptyStateKind;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  className?: string;
  /** h1 when the state is the whole page (a confirmation, an unsubscribe). */
  headingLevel?: "h1" | "h2";
  /**
   * The whole page is this state (a profile that is not there): fill the
   * window under the header and centre it, so the footer only arrives on a
   * scroll instead of crowding a short message.
   */
  fullHeight?: boolean;
}>) {
  return (
    <div
      role="status"
      className={cn(
        "mx-auto flex max-w-xl flex-col items-center text-center",
        compact ? "py-8" : "py-14 md:py-20",
        fullHeight && "min-h-[calc(100svh-76px)] justify-center",
        className,
      )}
    >
      <img
        src={`/assets/illustrations/${SCENES[kind]}.svg`}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        width={1024}
        height={768}
        className={cn("h-auto w-full dark:opacity-80", compact ? "max-w-[13rem]" : "max-w-[20rem]")}
      />
      <Heading
        className={cn(
          "font-home-display text-balance text-primary",
          compact ? "mt-4 text-xl" : "mt-6 text-2xl md:text-3xl",
        )}
      >
        {title}
      </Heading>
      {description ? (
        <p className={cn("text-muted-foreground", compact ? "mt-2 text-base leading-7" : "mt-3 text-lg leading-8")}>
          {description}
        </p>
      ) : null}
      {actions ? <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
    </div>
  );
}
