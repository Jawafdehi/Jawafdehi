import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarDays, X } from "lucide-react";

import { useIsNarrow } from "@/hooks/useIsNarrow";
import {
  SEPTEMBER_EVENT_URL_BAR,
  useSeptemberEventPast,
} from "@/lib/september-event";

const DISMISSED_KEY = "jawafdehi.septemberEvent.dismissed";

/**
 * Placement B: one strip above the navbar, on every page.
 *
 * It sits in normal document flow rather than fixed, so the sticky navbar
 * scrolls it away and never has to reserve room for it. The hero's `-mt-[76px]`
 * is measured against the header, not the top of the page, so it keeps
 * tucking under the navbar with the strip present.
 *
 * Dismissal is remembered in localStorage. Reading it during render would mean
 * the prerendered HTML disagrees with a returning visitor's browser, so the bar
 * always renders on the server and hides itself on mount.
 */
export function SeptemberEventBar() {
  const { t } = useTranslation();
  const isPast = useSeptemberEventPast();
  const isNarrow = useIsNarrow(639.98);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
  }, []);

  if (isPast || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  return (
    <aside
      aria-label={t("septemberEvent.barLabel")}
      className="relative z-[60] bg-[linear-gradient(120deg,hsl(var(--primary))_0%,hsl(var(--primary))_58%,hsl(var(--accent))_100%)] text-white"
    >
      <div className="layout-container flex items-center gap-3 py-2.5 pr-12 sm:justify-center sm:pr-14">
        <CalendarDays className="hidden h-4 w-4 shrink-0 text-secondary sm:block" aria-hidden="true" />

        {/* leading-6, not leading-snug: at 14px the snug 1.375 line box clips the
            descender on Devanagari numerals, so भदौ १८ loses the tail of its ८. */}
        <p className="min-w-0 text-sm leading-6">
          <span className="font-semibold">{t("septemberEvent.barTitle")}</span>{" "}
          <span className="text-white/80">
            {isNarrow ? t("septemberEvent.barWhenShort") : t("septemberEvent.barWhen")}
          </span>
        </p>

        <a
          href={SEPTEMBER_EVENT_URL_BAR}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full text-sm font-semibold underline underline-offset-4 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        >
          {t("septemberEvent.barCta")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>

        {/* 40x40 painted, reaching 2px past each edge for a 44x44 tap target. */}
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("septemberEvent.barDismiss")}
          className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white after:absolute after:-inset-[2px] after:content-['']"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
