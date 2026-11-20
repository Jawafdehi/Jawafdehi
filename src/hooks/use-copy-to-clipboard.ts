import { useCallback, useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "failed";

/**
 * Copies a string and reports what happened. The clipboard is unavailable over
 * plain HTTP and in some locked-down browsers, so a failure is surfaced rather
 * than left to look like nothing happened — the value is on screen either way,
 * and selecting it by hand still works.
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
    timer.current = setTimeout(() => setStatus("idle"), next === "copied" ? 1600 : 4000);
  }, [value]);

  return { status, copy };
}
