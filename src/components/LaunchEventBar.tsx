import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, X } from "lucide-react";

import { LAUNCH_EVENT_URL_BAR, useLaunchEventPast } from "@/lib/launch-event";

const DISMISSED_KEY = "jawafdehi.launchEvent.dismissed";

/**
 * One strip above the navbar, on every page: the 23/24 September public launch.
 *
 * It reads as a sentence with a link at the end, not a row of dot-separated
 * fragments. The fragments version looked like a listing; this one tells
 * somebody what is happening and then offers the way in.
 *
 * Amber, inherited from the postponement notice it replaces, and not the
 * navy-to-crimson gradient the original September bar used. The home hero is
 * full-bleed navy under a transparent navbar, so a navy strip at the top of "/"
 * disappears into it — invisible exactly where most visitors land. Measured
 * against the two surfaces this sits on: amber is 5.94:1 on the navy hero and
 * 2.66:1 on the cream inner pages; crimson is 2.60:1 on the hero and vanishes.
 * The amber foreground is dark ink by design (white on this amber fails AA).
 *
 * The link is its own translation key appended after the sentence, rather than
 * an anchor buried mid-string. A translator should never have to keep markup
 * intact for the link to keep working — the same split 3e0710f made for the
 * "live on Facebook" line.
 *
 * Both locales carry both dates, English abbreviating to "Sept". That is not
 * cosmetic: measured at 14px in the shipped faces, the unabbreviated sentence
 * runs to five lines on a 320px iPhone SE, and "Sept" brings English and
 * Nepali to an identical 4 / 3 / 3 lines at 320 / 390 / 430px. The previous
 * bar needed a separate narrow-screen variant to manage this; this one does
 * not, so `useIsNarrow` stays retired.
 *
 * It sits in normal document flow rather than fixed, so the sticky navbar
 * scrolls it away and never has to reserve room for it. The hero's `-mt-[76px]`
 * is measured against the header, not the top of the page, so it keeps tucking
 * under the navbar with the strip present.
 *
 * Dismissal is remembered in localStorage under a key of its own. Reusing
 * either older key would hide the launch from the people who dismissed the
 * invitation to the session it replaces, or the notice that it was off — in
 * both cases, the people most interested in where it went.
 */
export function LaunchEventBar() {
  const { t } = useTranslation();
  const isPast = useLaunchEventPast();
  const [dismissed, setDismissed] = useState(false);

  // Reading localStorage during render would mean the prerendered HTML
  // disagrees with a returning visitor's browser, so the bar always renders on
  // the server and hides itself on mount.
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
      aria-label={t("launchEvent.barLabel", "Upcoming public launch")}
      className="relative z-[60] bg-alert text-alert-foreground"
    >
      {/* One wrapping row. The horizontal padding is symmetric rather than a
          bare `pr` to clear the dismiss button: the content is centred, so
          reserving room on one side only would centre it inside a box 36px
          off-centre. */}
      <div className="layout-container flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-9 py-2 text-center sm:px-14 sm:py-2.5">
        {/* leading-6, not leading-snug: at 14px the snug 1.375 line box clips
            the descender on Devanagari numerals, so सेप्टेम्बर २४ loses the tail
            of its ४. */}
        <p className="text-sm leading-6">
          <CalendarDays
            className="mb-0.5 mr-2 hidden h-4 w-4 align-text-bottom sm:inline-block"
            aria-hidden="true"
          />
          {t(
            "launchEvent.barSentence",
            "Join the public launch of Nepal's corruption database on Zoom — 23 Sept 6 PM Pacific · 24 Sept 6:45 AM Nepal.",
          )}{" "}
          <a
            href={LAUNCH_EVENT_URL_BAR}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap font-semibold underline underline-offset-4 hover:text-alert-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-alert"
          >
            {t("launchEvent.barCta", "Learn more.")}
          </a>
        </p>

        {/* 40x40 painted, reaching 2px past each edge for a 44x44 tap target. */}
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("launchEvent.barDismiss", "Dismiss launch announcement")}
          className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-alert-foreground/70 transition-colors hover:bg-alert-foreground/10 hover:text-alert-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert-foreground after:absolute after:-inset-[2px] after:content-['']"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
