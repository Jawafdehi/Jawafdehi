import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * A line of fixed-width text with a copy button — the MCP server URL and the
 * one-line install commands. Everything here is meant to be pasted somewhere
 * else, so the value stays selectable by hand when the clipboard is unavailable
 * (plain HTTP, locked-down browsers): the button reports the failure instead of
 * appearing to do nothing.
 */
export function CopyField({
  value,
  label,
}: Readonly<{ value: string; label: string }>) {
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
    <div>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-foreground">
          {value}
        </code>

        <button
          type="button"
          onClick={copy}
          aria-label={label}
          className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {copied ? (
            <Check className="h-4 w-4 text-accent" />
          ) : (
            <Copy className={failed ? "h-4 w-4 text-accent" : "h-4 w-4"} />
          )}
        </button>
      </div>

      {failed ? <p className="mt-2 text-xs text-accent">{t("mcp.copyFailed")}</p> : null}

      <span aria-live="polite" className="sr-only">
        {copied ? t("mcp.copied") : ""}
        {failed ? t("mcp.copyFailed") : ""}
      </span>
    </div>
  );
}
