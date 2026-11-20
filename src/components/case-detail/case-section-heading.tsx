import { AiGeneratedBadge } from "@/components/case-detail/ai-generated-badge";
import { cn } from "@/lib/utils";

type CaseSectionHeadingProps = {
  children: React.ReactNode;
  className?: string;
  /** Show the "AI-generated" label after the heading text. */
  aiGenerated?: boolean;
};

/**
 * Shared heading for the case-detail content sections: .font-case-section-title,
 * the display face at 28px over the 18px body (see typography.css), navy, no
 * rule under it. The `<h2>` is inline inside a wrapper
 * so the AI label sits beside it without joining the heading's accessible name.
 */
export function CaseSectionHeading({
  children,
  className,
  aiGenerated = false,
}: Readonly<CaseSectionHeadingProps>) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      <h2 className="font-case-section-title">{children}</h2>
      {aiGenerated && <AiGeneratedBadge />}
    </div>
  );
}
