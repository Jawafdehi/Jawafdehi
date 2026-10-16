import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/**
 * Copies a string and says what happened. The clipboard is unavailable over
 * plain HTTP and in some locked-down browsers, so a failure is reported rather
 * than left to look like nothing happened — the value is on screen either way,
 * and selecting it by hand still works.
 */
export function CopyButton({
  value,
  label,
  className,
  iconClassName,
}: Readonly<{ value: string; label: string; className?: string; iconClassName?: string }>) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    let next: "copied" | "failed" = "copied";
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      next = "failed";
    }
    setStatus(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), next === "copied" ? 1600 : 4000);
  }, [value]);

  const copied = status === "copied";
  const failed = status === "failed";

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className={cn(
          "shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          className,
        )}
      >
        {copied ? (
          <Check className={cn("h-4 w-4 text-accent", iconClassName)} />
        ) : (
          <Copy className={cn("h-4 w-4", failed && "text-accent", iconClassName)} />
        )}
      </button>

      {/* Visible for sighted users; the live region below announces the same
          thing. A red icon alone would say something went wrong without saying
          what, and the fix (select it by hand) is not guessable. */}
      {failed ? <span className="text-xs text-accent">{t("common.copyFailed")}</span> : null}

      <span aria-live="polite" className="sr-only">
        {copied ? t("common.copied") : ""}
        {failed ? t("common.copyFailed") : ""}
      </span>
    </>
  );
}

/**
 * A line of fixed-width text with a copy button — the one-line install commands.
 * The command stays selectable by hand, and overflows sideways rather than
 * wrapping, so a long URL does not re-flow the card.
 */
export function CopyField({
  value,
  label,
}: Readonly<{ value: string; label: string }>) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-foreground">
        {value}
      </code>

      <CopyButton value={value} label={label} />
    </div>
  );
}

/**
 * The multi-line form — a shell recipe copied as one block. The copy button
 * floats in the corner so it does not take a line away from the code.
 *
 * `whitespace-pre-wrap` WITHOUT a word-break: comment lines are prose and should
 * wrap at their spaces, but a shell token must not be broken mid-word. Allowing
 * that printed `export OPENAI_BASE_URL=http://127.0.0.` / `1:11434/v1` across
 * two lines, which reads as two different values. An unbreakable token overflows
 * instead and `overflow-x-auto` is how you reach the rest of it.
 */
export function CopyBlock({
  value,
  label,
}: Readonly<{ value: string; label: string }>) {
  return (
    <div className="relative rounded-lg border border-border bg-muted/30">
      <pre className="overflow-x-auto whitespace-pre-wrap px-4 py-3.5 pr-12 font-mono text-xs leading-relaxed text-foreground sm:text-sm">
        {value}
      </pre>

      <div className="absolute right-1.5 top-1.5 flex items-center gap-2">
        <CopyButton value={value} label={label} />
      </div>
    </div>
  );
}
