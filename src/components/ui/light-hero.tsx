import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * The light page hero (/updates, /products, /faq, /volunteer): the archive's
 * diamond field inverted onto the white page and faded toward the words, the
 * site's eyebrow, a display title, an optional line and actions.
 */
export function LightHero({
  id,
  eyebrow,
  title,
  description,
  actions,
  children,
  shader = true,
  tight = false,
}: Readonly<{
  id: string;
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Anything further under the line: a note, a link, a notice. */
  children?: ReactNode;
  /** The diamond field behind the title; off on the plain reading pages. */
  shader?: boolean;
  /**
   * Less room under the words, for a page whose content (a form) follows
   * straight on: the hero's full bottom padding left a gap that read as the
   * end of the page.
   */
  tight?: boolean;
}>) {
  return (
    <section aria-labelledby={id} className="relative isolate overflow-hidden">
      {shader ? (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 -z-10 w-full md:w-2/3 [mask-image:linear-gradient(to_left,#000_35%,transparent)]"
        >
          <ShaderBackdrop design="diamondLight" />
        </div>
      ) : null}
      <div className={cn("layout-container pt-16 md:pt-24", tight ? "pb-8 md:pb-10" : "pb-16 md:pb-24")}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 id={id} className="font-home-display mt-4 max-w-4xl text-4xl text-primary sm:text-5xl md:text-6xl">
          {title}
        </h1>
        {description ? <p className="mt-4 max-w-xl text-lg leading-7 text-muted-foreground">{description}</p> : null}
        {actions ? <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div> : null}
        {children}
      </div>
    </section>
  );
}
