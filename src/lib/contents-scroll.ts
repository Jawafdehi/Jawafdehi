/**
 * Remembering where the contents listing was scrolled to.
 *
 * Opening one table on its own page and coming back used to drop the reader at
 * the top of the document. The listing's own state survives (the panel stays
 * mounted behind the focused view) but scroll position does not: `ScrollToTop`
 * fires on every `search` change, and `?table=` is a search change.
 *
 * Kept in sessionStorage rather than React state because the two ends of the
 * journey are a click handler deep inside a row and an effect at the top of the
 * page; threading a callback through four components to carry one number is
 * worse than a keyed write. Per-pathname, so two material pages in two tabs do
 * not restore each other's position.
 */

export function scrollMemoryKey(pathname: string): string {
  return `material-contents-scroll:${pathname}`;
}

/**
 * Record the current scroll position, on the click that is about to leave.
 *
 * Deliberately NOT an effect: `ScrollToTop` has already zeroed
 * `window.scrollY` by the time any effect of ours runs on the new URL, so an
 * effect would faithfully remember 0.
 */
export function rememberListScroll(): void {
  try {
    sessionStorage.setItem(
      scrollMemoryKey(window.location.pathname),
      String(window.scrollY),
    );
  } catch {
    // Private browsing and storage-blocked contexts throw. Losing the scroll
    // position is a worse page, not a broken one.
  }
}

/** Take the remembered position for `pathname`, clearing it. */
export function takeListScroll(pathname: string): number | null {
  try {
    const raw = sessionStorage.getItem(scrollMemoryKey(pathname));
    if (raw === null) return null;
    sessionStorage.removeItem(scrollMemoryKey(pathname));
    const y = Number.parseInt(raw, 10);
    return Number.isFinite(y) && y > 0 ? y : null;
  } catch {
    return null;
  }
}

/**
 * Scroll back to `y` once the document is actually tall enough to allow it.
 *
 * One frame is not enough. The listing is being un-hidden in the same commit,
 * and until it has laid out — including the table the reader had expanded —
 * the document is short, so the browser silently clamps the scroll to whatever
 * fits. That is how a restore to 900px lands at 15px and looks like no restore
 * at all.
 *
 * Gives up after `maxFrames` rather than spinning: if the content never comes
 * back (a failed refetch, say) there is nothing to scroll to, and retrying
 * forever would fight a reader who has started scrolling themselves.
 *
 * Returns a cancel function for the caller's effect cleanup.
 */
export function restoreScroll(y: number, maxFrames = 60): () => void {
  let frame = 0;
  let raf = 0;

  const tick = () => {
    const reachable =
      document.documentElement.scrollHeight - window.innerHeight >= y;
    if (reachable || frame >= maxFrames) {
      window.scrollTo({ top: y, behavior: "instant" });
      return;
    }
    frame += 1;
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
