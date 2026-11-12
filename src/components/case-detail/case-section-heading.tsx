import { AiGeneratedBadge } from "@/components/case-detail/ai-generated-badge";
import { cn } from "@/lib/utils";

type CaseSectionHeadingProps = {
  children: React.ReactNode;
  className?: string;
  /** Show the "AI-generated" label after the heading text. */
  aiGenerated?: boolean;
};

/**
 * Shared heading for the case-detail content sections, in the reading pages'
 * one heading size (the FAQ, terms, privacy and research use the same): the
 * display face, navy, no rule under it. The `<h2>` is inline inside a wrapper
 * so the AI label sits beside it without joining the heading's accessible name.
 */
export function CaseSectionHeading({
  children,
  className,
  aiGenerated = false,
}: Readonly<CaseSectionHeadingProps>) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      <h2 className="font-home-display font-case-section-title text-3xl text-primary md:text-4xl">{children}</h2>
      {aiGenerated && <AiGeneratedBadge />}
    </div>
  );
}
