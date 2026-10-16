import { MarqueeTrack } from "@/components/mcp/marquee-track";

/**
 * A row of example prompts that drifts sideways, in the manner of Linear's
 * agent cards. The loop mechanics live in MarqueeTrack, shared with the
 * capability row.
 */
export function PromptMarquee({
  items,
  reverse = false,
  className,
}: Readonly<{ items: readonly string[]; reverse?: boolean; className?: string }>) {
  return (
    <MarqueeTrack
      className={className}
      items={items}
      reverse={reverse}
      itemKey={(text: string) => text}
      renderItem={(text: string) => (
        <div className="w-[19rem] rounded-lg border border-border bg-background/80 p-4 text-sm leading-relaxed text-foreground shadow-sm backdrop-blur-sm sm:w-[22rem]">
          <span className="mr-2 select-none font-mono text-accent" aria-hidden="true">
            &gt;
          </span>
          {text}
        </div>
      )}
    />
  );
}
