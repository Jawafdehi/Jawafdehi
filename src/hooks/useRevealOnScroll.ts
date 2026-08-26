import { useEffect, useRef } from "react";

/**
 * Fade-and-rise a section once, the first time it scrolls into view.
 *
 * SSR-safe by construction: the element is NEVER hidden by markup or
 * stylesheet, so the pre-rendered HTML (and any no-JS reader) sees the full
 * page. The hook hides an element with inline styles only after mount, and
 * only when it is still below the viewport — so content the visitor can
 * already see is never blanked, and reduced-motion users get no movement.
 */
export function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen (or above the fold): reveal animations are for what
    // scrolls in, not for what the visitor is looking at.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        // Transition applied at reveal time, so the initial hide above did
        // not animate. Clearing the inline values hands control back to the
        // stylesheet (opacity 1, no transform).
        el.style.transition =
          "opacity 300ms cubic-bezier(0.23, 1, 0.32, 1), transform 300ms cubic-bezier(0.23, 1, 0.32, 1)";
        el.style.opacity = "";
        el.style.transform = "";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      // If we unmount while hidden, never leave the element blanked.
      el.style.opacity = "";
      el.style.transform = "";
    };
  }, []);

  return ref;
}
