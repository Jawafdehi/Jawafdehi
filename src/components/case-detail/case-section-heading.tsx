import { cn } from "@/lib/utils";

type CaseSectionHeadingProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Shared heading for the case-detail content sections: the editorial serif
 * (Vesper Libre, same face as the home hero) over a short crimson rule.
 *
 * The rule choreographs off the nearest `<Reveal className="group">` wrapper —
 * it draws in from the left as the section enters the viewport. Everywhere
 * Reveal is inert (SSR/pre-render, no JS, prefers-reduced-motion, content
 * already on screen) `data-reveal` stays "idle", the hidden-state selector
 * never matches, and the rule simply renders at full width.
 */
export function CaseSectionHeading({ children, className }: Readonly<CaseSectionHeadingProps>) {
  return (
    <h2 className={cn("font-case-section-title mb-6", className)}>
      {children}
      <span
        aria-hidden="true"
        className="mt-2.5 block h-1 w-12 origin-left rounded-full bg-accent transition-transform delay-200 duration-700 ease-out group-data-[reveal=hidden]:scale-x-0"
      />
    </h2>
  );
}
