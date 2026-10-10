import type { ReactNode } from "react";

import { CopyButton } from "@/components/mcp/copy-field";
import { cn } from "@/lib/utils";

/**
 * A terminal window: title bar with window dots and a label, then a dark body.
 *
 * Built on `code-surface`, which is the one surface token that stays dark in
 * both themes — a terminal that flipped to white in light mode would stop
 * reading as a terminal. Everything inside therefore sets its own contrast off
 * `code-surface-foreground` rather than `foreground`, which does flip.
 */
export function TerminalWindow({
  label,
  action,
  children,
  className,
  bodyClassName,
}: Readonly<{
  label: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-code-surface shadow-sm",
        className,
      )}
    >
      {/* flex-wrap so the copy-failure message has somewhere to go on a narrow
          window rather than squashing the label. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-2">
        <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </span>

        <span className="min-w-0 truncate font-mono text-xs text-code-surface-foreground/60">
          {label}
        </span>

        {action ? <span className="ml-auto flex items-center gap-2">{action}</span> : null}
      </div>

      <div className={cn("px-4 py-3.5", bodyClassName)}>{children}</div>
    </div>
  );
}

/** The copy button as it appears in a terminal title bar. */
export function TerminalCopyButton({ value, label }: Readonly<{ value: string; label: string }>) {
  return (
    <CopyButton
      value={value}
      label={label}
      className="text-code-surface-foreground/60 hover:bg-white/10 hover:text-code-surface-foreground"
    />
  );
}

/**
 * A single shell command, prompt sigil and all. The sigil is decorative — it is
 * marked aria-hidden and sits outside the copyable string, so what gets copied
 * is the command alone and not a `$` that would break the paste.
 */
export function TerminalCommand({
  command,
  label,
  copyLabel,
}: Readonly<{ command: string; label: string; copyLabel: string }>) {
  return (
    <TerminalWindow label={label} action={<TerminalCopyButton value={command} label={copyLabel} />}>
      <div className="flex gap-2.5 overflow-x-auto">
        <span className="shrink-0 select-none font-mono text-sm text-code-surface-accent" aria-hidden="true">
          $
        </span>
        <code className="whitespace-pre font-mono text-sm text-code-surface-foreground">
          {command}
        </code>
      </div>
    </TerminalWindow>
  );
}
