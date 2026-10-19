import { useEffect, useState } from "react";

/**
 * `value`, but only after it has stopped changing for `delay` ms.
 *
 * For a control whose every keystroke costs a request. The input itself stays
 * uncontrolled-feeling — it updates immediately — while the thing it drives
 * waits for the typing to settle, so "vivaran" is one request rather than
 * seven.
 *
 * 250 ms is the usual default here: short enough that the list feels like it
 * reacts to typing, long enough that an average typist never fires mid-word.
 */
export function useDebounced<T>(value: T, delay = 250): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
