import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mounts a recharts chart only once its box is near the viewport, so the
 * chart's draw-in animation plays where the reader can see it rather than
 * off-screen on page load. Client-only by construction: the charts render a
 * placeholder until mounted, so the pre-rendered HTML never contains this.
 */
export function ChartReveal({ children }: Readonly<{ children: ReactNode }>) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView]);

  return (
    <div ref={ref} className="h-full w-full">
      {inView ? children : null}
    </div>
  );
}
