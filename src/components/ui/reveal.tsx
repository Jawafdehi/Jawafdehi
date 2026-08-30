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
      className={cn(
        state !== "idle" && "transition-all duration-700 ease-out will-change-transform",
        state === "hidden" && "translate-y-6 opacity-0",
        state === "shown" && "translate-y-0 opacity-100",
        className,
      )}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
