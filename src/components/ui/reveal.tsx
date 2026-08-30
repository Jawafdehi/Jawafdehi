// Reveal-on-scroll wrapper: fades + lifts children in the first time they
// enter the viewport. Deliberately dependency-free (IntersectionObserver +
// CSS transitions) — the homepage redesign's scroll rhythm does not need a
// scroll library, and the initial-payload budget rewards keeping it that way.
//
// Failure modes all resolve to "content is simply visible":
//   - SSR/prerender and no-JS render the idle state (no classes, no hiding)
//   - prefers-reduced-motion skips the effect entirely
//   - elements already in view at mount are never hidden (no flash)
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger offset for siblings revealed by the same scroll. */
  delayMs?: number;
};

export function Reveal({ children, className, delayMs = 0 }: Readonly<RevealProps>) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen (or above it): leave it visible rather than blink it
    // out and back in. Only content still below the fold gets the entrance.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    setState("hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      // data-reveal lets children choreograph off the same trigger (e.g. a
      // heading rule drawn in with group-data-[reveal=hidden]:scale-x-0).
      // Children must style the HIDDEN state as the exception: in the idle
      // state (SSR, no-JS, reduced motion, already-visible) everything renders
      // fully visible with no transform.
      data-reveal={state}
      className={cn(
        // Rises further and unblurs as it lands — an easeOutQuint-style curve
        // makes the deceleration read as camera settle rather than a fade.
        state !== "idle" &&
          "transition-all duration-[850ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] will-change-transform",
        state === "hidden" && "translate-y-10 scale-[0.99] opacity-0 [filter:blur(6px)]",
        state === "shown" && "translate-y-0 scale-100 opacity-100 [filter:blur(0px)]",
        className,
      )}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
