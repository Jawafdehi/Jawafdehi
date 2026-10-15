import { AiGeneratedBadge } from "@/components/case-detail/ai-generated-badge";
import { cn } from "@/lib/utils";

type CaseSectionHeadingProps = {
  children: React.ReactNode;
  className?: string;
  /** Show the "AI-generated" label after the heading text. */
  aiGenerated?: boolean;
};

/**
 * Shared heading for the case-detail content sections: the headline face (same
 * as the home hero — Vesper Libre in Nepali, Inter in English) over a short
 * crimson rule.
 *
 * The rule choreographs off the nearest `<Reveal className="group">` wrapper —
 * it draws in from the left as the section enters the viewport. Everywhere
 * Reveal is inert (SSR/pre-render, no JS, prefers-reduced-motion, content
 * already on screen) `data-reveal` stays "idle", the hidden-state selector
 * never matches, and the rule simply renders at full width.
 *
 * The `<h2>` is inline inside a wrapper so the AI label sits beside it in the
 * same text flow without joining the heading's accessible name.
 */
export function CaseSectionHeading({
  children,
  className,
  aiGenerated = false,
}: Readonly<CaseSectionHeadingProps>) {
  return (
    <div className={cn("font-case-section-title mb-6", className)}>
      <h2 className="inline">{children}</h2>
      {aiGenerated && <AiGeneratedBadge className="ml-3" />}
      <span
        aria-hidden="true"
        className="mt-2.5 block h-1 w-12 origin-left rounded-full bg-accent transition-transform delay-200 duration-700 ease-out group-data-[reveal=hidden]:scale-x-0"
      />
    </div>
  );
}
