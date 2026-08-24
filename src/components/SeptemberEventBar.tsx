import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarDays, X } from "lucide-react";

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
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
  }, []);

  if (isPast || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  /**
   * Both halves of the date, at every width, phones included.
   *
   * The event is one moment that lands on two calendar days: the evening of
   * 2 September for the diaspora, the morning of भदौ १८ / 3 September in Nepal.
   * Showing one of them is not a shorter way of saying the same thing — it is
   * telling half the audience the wrong day. So this bar never drops a half to
   * save a line; it wraps instead.
   *
   * An array rather than two keys because the ORDER is part of the translation:
   * Nepali leads with the Nepal date, English with the Pacific one, and each
   * string is authored per locale (see src/lib/september-event.ts) so neither
   * can be recomputed into the other by accident.
   */
  const rawParts = t("septemberEvent.barWhenParts", { returnObjects: true });
  const parts = Array.isArray(rawParts) ? (rawParts as string[]) : [];

  return (
    <aside
      aria-label={t("septemberEvent.barLabel")}
      className="relative z-[60] bg-[linear-gradient(120deg,hsl(var(--primary))_0%,hsl(var(--primary))_58%,hsl(var(--accent))_100%)] text-white"
    >
      {/* One wrapping row, not a phone layout and a desktop layout.
          Every piece below is `whitespace-nowrap`, so the only places this can
          break are the gaps between them: one line on a laptop, and on a phone
          it folds into whole lines with no date ever split down the middle.

          The horizontal padding is symmetric rather than a bare `pr` to clear
          the dismiss button: the content is centred, so reserving room on one
          side only would centre it inside a box 36px off-centre. */}
      <div className="layout-container flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 px-9 py-2 text-center sm:px-14 sm:py-2.5">
        {/* leading-6, not leading-snug: at 14px the snug 1.375 line box clips the
            descender on Devanagari numerals, so भदौ १८ loses the tail of its ८. */}
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-sm leading-6">
          <span className="whitespace-nowrap font-semibold">
            <CalendarDays
              className="mb-0.5 mr-2 hidden h-4 w-4 align-text-bottom text-secondary sm:inline-block"
              aria-hidden="true"
            />
            {t("septemberEvent.barTitle")}
          </span>

          {parts.map((part, i) => (
            <span key={part} className="whitespace-nowrap text-white/80">
              {/* The middot rides with the part that follows it and is dropped
                  below `sm`, where the two dates are always on separate lines
                  and a leading middot would read as a bullet. */}
              {i > 0 && <span className="mr-2 hidden sm:inline">·</span>}
              {part}
            </span>
          ))}
        </p>

        <a
          href={SEPTEMBER_EVENT_URL_BAR}
          target="_blank"
          rel="noopener noreferrer"
          className="-my-1 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full py-1 text-sm font-semibold underline underline-offset-4 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary sm:my-0 sm:py-0"
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
