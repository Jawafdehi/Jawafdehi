import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FilePlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ReportCaseCta() {
  const { t } = useTranslation();

  // Subtle parallax on the map watermark: it drifts slower than the content
  // as the section scrolls through the viewport, which is what gives the
  // panel depth. Same pattern as the hero — one passive listener, one rAF,
  // nothing at all under prefers-reduced-motion.
  const watermarkRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const section = sectionRef.current;
      const node = watermarkRef.current;
      if (!section || !node) return;
      const rect = section.getBoundingClientRect();
      // -1..1 as the section's center crosses the viewport's center.
      const progress = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
      node.style.transform = `translate3d(0, ${(progress * 36).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden border-b border-border bg-[linear-gradient(135deg,hsl(var(--primary-surface))_0%,hsl(var(--primary-surface))_34%,hsl(var(--accent))_100%)] py-16 dark:bg-[linear-gradient(135deg,hsl(215_70%_12%)_0%,hsl(220_38%_18%)_42%,hsl(354_66%_37%)_100%)] md:py-20"
    >
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full bg-secondary/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_20%,hsl(var(--secondary)/0.24),transparent_34%),linear-gradient(135deg,hsl(var(--primary-surface)/0.3)_0%,transparent_48%,hsl(var(--accent)/0.2)_100%)]"
      />
      {/* Faint Nepal map watermark — the hero's motif echoed at the page's
          other call to action, drifting on parallax. map-light.svg draws in
          dark ink, so it is inverted to read light on the navy panel. */}
      <div
        ref={watermarkRef}
        aria-hidden="true"
        className="absolute inset-x-[-10%] top-1/2 -z-10 h-[130%] -translate-y-1/2 opacity-[0.08] will-change-transform"
      >
        <img
          src="/assets/map-light.svg"
          alt=""
          decoding="async"
          {...{ fetchpriority: "low" }}
          className="h-full w-full object-contain [filter:invert(1)_brightness(1.7)]"
        />
      </div>

      <div className="layout-container text-center">
        <div className="mx-auto flex max-w-3xl flex-col items-center">
          <h2 className="text-3xl font-extrabold leading-tight tracking-normal text-white md:text-4xl">
            {t("reportCta.title")}
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/90 md:text-base">
            {t("reportCta.description")}
          </p>
          <Button
            asChild
            size="lg"
            // The button stays white in both themes because it sits on the navy
            // CTA, so its label must stay dark in both — which --foreground does
            // not, since it inverts to light ink. --primary is the navy in light
            // and --primary-surface keeps the navy in dark. Same pairing this
            // branch gave ReportAllegationDialog before main deleted that file.
            className="mt-8 bg-white font-semibold text-primary shadow-lg shadow-black/10 transition duration-200 hover:bg-white/90 motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.98] dark:bg-white dark:text-primary-surface dark:hover:bg-white/90"
          >
            <Link to="/report">
              <FilePlus2 className="h-5 w-5" aria-hidden="true" />
              {t("report.trigger")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
