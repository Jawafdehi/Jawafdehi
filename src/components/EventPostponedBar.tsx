import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";

import { useEventPostponedNoticePast } from "@/lib/event-postponed";

const DISMISSED_KEY = "jawafdehi.eventPostponed.dismissed";

/**
 * One strip above the navbar, on every page: the 2/3 September session is off.
 *
 * It replaces the announcement bar that invited people to it, and deliberately
 * does not inherit its look — that bar was a primary-to-accent gradient with a
 * Register call to action, which is the wrong voice for "this is not
 * happening". Flat navy, an info mark, no button.
 *
 * English only, unlike the rest of the site. This is a short-lived notice with
 * a fixed expiry hours away, and shipping it now in one language beats holding
 * it for a translation nobody will read afterwards. It carries no i18n keys
 * rather than English strings filed under `ne`, which would read as a missing
 * translation instead of a decision.
 *
 * It sits in normal document flow rather than fixed, so the sticky navbar
 * scrolls it away and never has to reserve room for it. The hero's `-mt-[76px]`
 * is measured against the header, not the top of the page, so it keeps tucking
 * under the navbar with the strip present.
 *
 * Dismissal is remembered in localStorage under a key of its own: reusing the
 * event bar's would hide this from exactly the people who had already dismissed
 * the invitation, who are the ones most likely to have registered.
 */
export function EventPostponedBar() {
  const isPast = useEventPostponedNoticePast();
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
      aria-label="Event announcement"
      className="relative z-[60] bg-primary text-white"
    >
      {/* One wrapping row. The horizontal padding is symmetric rather than a
          bare `pr` to clear the dismiss button: the content is centred, so
          reserving room on one side only would centre it inside a box 36px
          off-centre. */}
      <div className="layout-container flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-9 py-2 text-center sm:px-14 sm:py-2.5">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-sm leading-6">
          <span className="whitespace-nowrap font-semibold">
            <Info
              className="mb-0.5 mr-2 hidden h-4 w-4 align-text-bottom text-secondary sm:inline-block"
              aria-hidden="true"
            />
            Event postponed
          </span>
          {/* Kept to two lines on a laptop and four on a phone. This sits above
              the navbar on every route, so a fifth line is a fifth of a phone
              screen spent on it — the session's subject is dropped rather than
              the reason or the promise of a new date. */}
          <span className="text-white/80">
            Our 2/3 September public session is postponed following the floods in Rasuwa,
            Nuwakot, Dhading and Gorkha. We will announce a new date.
          </span>
        </p>

        {/* 40x40 painted, reaching 2px past each edge for a 44x44 tap target. */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss event announcement"
          className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white after:absolute after:-inset-[2px] after:content-['']"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
