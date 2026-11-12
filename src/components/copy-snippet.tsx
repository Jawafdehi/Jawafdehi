// One thing to copy off a page: a rounded pill for a single line (an address,
// an install command) or a block for several lines (commands, a config file),
// each with an icon-only Copy button (named for screen readers by
// `label`, with the same text as its tooltip). Shared by /mcp and /likhit. Both are as
// wide as their text and scroll sideways rather than wrap on narrow screens.
import { Check, Copy } from "@/components/icons";
import { useTranslation } from "react-i18next";

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

export function CopyButton({ value, label }: Readonly<{ value: string; label: string }>) {
  const { t } = useTranslation();
  const { status, copy } = useCopyToClipboard(value);
  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        title={label}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-[color,transform] duration-150 ease-out hover:text-primary active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:active:scale-100"
      >
        {status === "copied" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      </button>
      <span aria-live="polite" className="sr-only">
        {status === "copied" ? t("mcp.copied") : ""}
        {status === "failed" ? t("mcp.copyFailed") : ""}
      </span>
    </>
  );
}

/** One line, as a rounded pill as wide as its text: an address in Inter, a
 * command in the mono face it is typed in. */
export function CopyPill({
  value,
  label,
  mono = false,
  fullWidth = false,
}: Readonly<{ value: string; label: string; mono?: boolean; /** Fill the column, so a list of commands shares one right edge. */ fullWidth?: boolean }>) {
  return (
    // A long command wraps rather than scrolling behind a scrollbar; the box
    // grows to two lines, which is why its corners are 20px, not a full pill.
    <div className={cn("mt-2 max-w-full items-center gap-3 rounded-[20px] border border-border/60 bg-muted/50 py-1 pl-5 pr-1", fullWidth ? "flex w-full" : "inline-flex")}>
      <code
        className={cn(
          "min-w-0 flex-1 py-1.5 text-[15px] font-normal text-foreground [overflow-wrap:anywhere]",
          mono ? "font-mono" : "[font-family:Inter,var(--font-family-app)]",
        )}
      >
        {value}
      </code>
      <CopyButton value={value} label={label} />
    </div>
  );
}

/** Commands or a config file: several lines in the mono face they are typed
 * in, as wide as the longest line, scrolling sideways on narrow screens. */
export function CopyBlock({
  value,
  label,
  lines,
  className,
}: Readonly<{
  value: string;
  label: string;
  lines: ReadonlyArray<{ text: string; prompt?: boolean; muted?: boolean }>;
  className?: string;
}>) {
  return (
    <div className={cn("mt-3 inline-flex max-w-full items-start gap-3 rounded-3xl border border-border/60 bg-muted/50 py-3 pl-5 pr-2", className)}>
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre py-1 font-mono text-sm leading-7 text-foreground">
        {lines.map(({ text, prompt, muted }, index) => (
          // Lines repeat (blank ones above all), so the index is the key.
          <span key={index} className={muted ? "block text-muted-foreground" : "block"}>
            {prompt ? (
              <span aria-hidden="true" className="select-none text-accent">
                ${" "}
              </span>
            ) : null}
            {text}
          </span>
        ))}
      </pre>
      <CopyButton value={value} label={label} />
    </div>
  );
}
