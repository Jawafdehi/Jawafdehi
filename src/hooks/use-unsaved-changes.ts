import { useCallback, useEffect } from "react";

// Guard against losing unsaved form edits.
//
// The app mounts a plain <BrowserRouter> (not a data router), so React Router's
// useBlocker/usePrompt is unavailable — those require createBrowserRouter. This
// hook therefore covers the two navigations we CAN intercept:
//   1. Leaving the tab (close / reload / external link) → native `beforeunload`.
//   2. In-app navigation triggered by our own buttons (Cancel / back) →
//      `confirmDiscard()`, which the caller gates its navigate() on.
//
// `dirty` is whatever the form already knows about pending edits (e.g. a patch
// diff length). When false, the guard is inert.
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires returnValue to be set; the string is ignored by modern
      // browsers (they show their own generic message).
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Returns true if it's safe to navigate away (not dirty, or the user confirmed
  // discarding). Callers do: `if (confirmDiscard()) navigate(...)`.
  const confirmDiscard = useCallback((): boolean => {
    if (!dirty) return true;
    return window.confirm(
      "You have unsaved changes. Leave this page and discard them?",
    );
  }, [dirty]);

  return { confirmDiscard };
}
