import { useCallback, useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "failed";

/**
 * Copies a string and reports what happened.
 *
 * The clipboard is unavailable over plain HTTP and in some locked-down browsers,
 * so a failure is surfaced rather than left to look like nothing happened — the
 * value is on screen either way, and selecting it by hand still works. Callers
 * are expected to render both outcomes; `mcp/copy-field` and `likhit/copy-button`
 * do it with different chrome, which is the reason this is a hook and not a
 * component.
 */
export function useCopyToClipboard(value: string) {
  const [status, setStatus] = useState<CopyStatus>("idle");
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
    // The failure message is prose and has to be readable; "Copied" is a blink
    // of reassurance and should get out of the way.
    timer.current = setTimeout(() => setStatus("idle"), next === "copied" ? 1600 : 4000);
  }, [value]);

  return { status, copy };
}
