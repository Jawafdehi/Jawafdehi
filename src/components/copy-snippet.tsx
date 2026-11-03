// One thing to copy off a page: a rounded pill for a single line (an address,
// an install command) or a block for several lines (commands, a config file),
// each with a labelled Copy button. Shared by /mcp and /likhit. Both are as
// wide as their text and scroll sideways rather than wrap on narrow screens.
import { Check, Copy } from "lucide-react";
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
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {status === "copied" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {status === "copied" ? t("mcp.copied") : t("common.copy")}
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
export function CopyPill({ value, label, mono = false }: Readonly<{ value: string; label: string; mono?: boolean }>) {
  return (
    <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-muted py-1 pl-5 pr-1">
      <code
        className={cn(
          "min-w-0 overflow-x-auto whitespace-nowrap py-1.5 text-[15px] font-normal text-foreground",
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
}: Readonly<{ value: string; label: string; lines: ReadonlyArray<{ text: string; prompt?: boolean; muted?: boolean }> }>) {
  return (
    <div className="mt-3 inline-flex max-w-full items-start gap-3 rounded-3xl border border-border bg-muted py-3 pl-5 pr-2">
      <pre className="min-w-0 overflow-x-auto whitespace-pre py-1 font-mono text-sm leading-7 text-foreground">
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
