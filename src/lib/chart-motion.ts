/** Whether charts should animate: never under reduced motion. */
export function chartMotion(): boolean {
  return !(typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : true);
}
