import { useEffect, useState } from "react";

/**
 * True only after the component has mounted on the client. Recharts measures
 * DOM dimensions on mount (via `ResponsiveContainer`), which has no stable
 * result during SSR — gate chart rendering behind this so the server markup
 * and the first client render agree, then the real chart replaces the
 * placeholder once mounted.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
