import type { ReactNode } from "react";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

type PageHeroProps = {
  id: string;
  title: ReactNode;
  actions?: ReactNode;
  /** Kept for callers; actions now sit left-aligned under the line. */
  actionsClassName?: string;
  /** Kept for callers; the hero has one shape now. */
  contentClassName?: string;
  /** Kept for callers; the hero has one shape now. */
  contentWrapperClassName?: string;
  description?: ReactNode;
  /** Kept for callers; the line has one measure now. */
  descriptionClassName?: string;
  eyebrow?: ReactNode;
  sectionClassName?: string;
};

/**
 * The about-group pages' hero (/about, /team, /commitment, /our-process,
 * /openhouse), in the redesign's light shape: the archive's diamond field
 * inverted onto the white page and faded toward the words, the site's
 * eyebrow, a left-aligned display title, one line and any actions. The same
 * look as LightHero on /updates, /products and /volunteer; this keeps the
 * older call signature so those pages did not have to change.
 */
export function PageHero({ id, title, actions, description, eyebrow, sectionClassName }: Readonly<PageHeroProps>) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("relative isolate overflow-hidden", sectionClassName)}>
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 -z-10 w-full md:w-2/3 [mask-image:linear-gradient(to_left,#000_35%,transparent)]"
      >
        <ShaderBackdrop design="diamondLight" />
      </div>
      <div className="layout-container py-16 md:py-24">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1
          id={`${id}-title`}
          className={cn("font-home-display max-w-4xl text-4xl text-primary sm:text-5xl md:text-6xl", eyebrow ? "mt-4" : null)}
        >
          {title}
        </h1>
        {description ? <div className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{description}</div> : null}
        {actions ? (
          <div className="mt-8 flex flex-wrap items-center gap-3 [&_a]:rounded-full [&_button]:rounded-full">{actions}</div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Kept for any bespoke hero still importing it; the redesign's heroes use the
 * diamond field instead, so it renders nothing.
 */
export function PageHeroBackdrop() {
  return null;
}
