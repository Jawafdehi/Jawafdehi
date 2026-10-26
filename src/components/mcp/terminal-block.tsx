import { Fragment, type ReactNode } from "react";

import { CopyButton } from "@/components/mcp/copy-field";
import { cn } from "@/lib/utils";

/**
 * A copyable field for a URL, a command or a config file, modelled on the one
 * at mcp.sentry.dev: a light outlined box that hugs what it holds, with the
 * copy button inline at the end rather than in a title bar.
 *
 * `label` names the field for assistive tech only. The step heading above each
 * field already says what it is, so printing it again inside read as noise.
 */
export function TerminalWindow({
  label,
  action,
  children,
  className,
}: Readonly<{
  label: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex w-fit max-w-full items-start gap-3 rounded-lg border border-border bg-background px-3 py-2",
        className,
      )}
    >
      <div className="min-w-0 flex-1 py-0.5">{children}</div>
      {/* flex-wrap so the copy-failure message has somewhere to go on a narrow
          screen rather than squashing the value. */}
      {action ? <span className="-my-0.5 flex shrink-0 flex-wrap items-center">{action}</span> : null}
    </div>
  );
}

/** The copy button as it appears at the end of a field. */
export function TerminalCopyButton({ value, label }: Readonly<{ value: string; label: string }>) {
  return <CopyButton value={value} label={label} />;
}

/**
 * A single command, printed bare — no `$` or `>` sigil, so what is on screen
 * is exactly what the copy button copies.
 *
 * The command wraps rather than scrolling sideways. Every command here ends in
 * the server URL, and a sideways scroll hid exactly that part on a phone. It
 * wraps between words only: each word is its own inline-block, so a flag like
 * `--skill` is never split at its hyphens. A word wider than the field (the
 * URL on a narrow phone) still breaks inside itself rather than overflowing.
 */
export function TerminalCommand({
  command,
  label,
  copyLabel,
}: Readonly<{ command: string; label: string; copyLabel: string }>) {
  return (
    <TerminalWindow label={label} action={<TerminalCopyButton value={command} label={copyLabel} />}>
      <code className="block font-mono text-sm leading-6 text-foreground">
        {command.split(" ").map((word, index) => (
          <Fragment key={index}>
            {index > 0 ? " " : null}
            <span className="inline-block max-w-full [overflow-wrap:anywhere]">{word}</span>
          </Fragment>
        ))}
      </code>
    </TerminalWindow>
  );
}

/**
 * A config file excerpt. Multi-line, so it keeps its indentation and scrolls
 * sideways if a line is too long — wrapping JSON mid-string would make it read
 * as two values.
 */
export function TerminalSnippet({
  body,
  label,
  copyLabel,
}: Readonly<{ body: string; label: string; copyLabel: string }>) {
  return (
    <TerminalWindow label={label} action={<TerminalCopyButton value={body} label={copyLabel} />}>
      <pre className="overflow-x-auto font-mono text-sm leading-6 text-foreground">
        <code>{body}</code>
      </pre>
    </TerminalWindow>
  );
}
