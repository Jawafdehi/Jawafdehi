import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { getNewsletterPromptState, setNewsletterPromptState } from "@/lib/newsletter";

/**
 * Dwell before the prompt appears — long enough that it reads as a considered
 * ask to an engaged reader rather than an immediate interruption on first paint.
 *
 * One minute, up from 25 seconds. 25s was landing while people were still on
 * their first screen of a case page: the ask arrived before the visitor had
 * been given anything worth subscribing for, which is the version of this
 * pattern everyone dismisses on reflex. A minute is past the point where a
 * reader has committed to the page.
 *
 * Exported because the tests drive the timer with it — a second copy of the
 * number in the spec would let the two drift apart silently.
 */
export const OPEN_DELAY_MS = 60000;

/**
 * Routes the prompt may appear on: the home page and the content pages an
 * engaged reader is most likely to land on from social/search — case pages,
 * the archive search (where the old /cases browse now lands) and the updates
 * feed. Other routes (about, privacy, admin, …) never arm it.
 */
function isEligiblePath(path: string): boolean {
  return (
    path === "/" ||
    path === "/search" ||
    path.startsWith("/case/") ||
    path === "/updates" ||
    path.startsWith("/updates/")
  );
}

/**
 * Newsletter signup prompt. Arms a single dwell timer the first time a visitor
 * is on an eligible page; the timer persists across in-app navigation (so the
 * dwell accumulates rather than resetting on every route change). Dismissing it
 * suppresses it for 30 days; subscribing anywhere suppresses it permanently.
 */
export function NewsletterSignupModal() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Mirror the current route in a ref so the timer callback can re-check
  // eligibility at fire time without being re-created on every navigation.
  const eligibleRef = useRef(false);
  eligibleRef.current = isEligiblePath(pathname);
  const armedRef = useRef(false);
  const firedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (getNewsletterPromptState() !== null) return;
    // Dwell already elapsed on an earlier eligible view: open as soon as the
    // visitor is back on an eligible page, rather than restarting the timer.
    // (Covers firing while momentarily on an ineligible route.)
    if (firedRef.current) {
      if (eligibleRef.current) setOpen(true);
      return;
    }
    if (armedRef.current) return;
    if (!eligibleRef.current) return;
    // First eligible view: start the dwell once. No cleanup here on purpose — a
    // route change must not clear the timer and reset the accumulated dwell.
    armedRef.current = true;
    timerRef.current = window.setTimeout(() => {
      firedRef.current = true;
      if (getNewsletterPromptState() === null && eligibleRef.current) setOpen(true);
    }, OPEN_DELAY_MS);
  }, [pathname]);

  // Clear the timer only when the modal actually unmounts.
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen && getNewsletterPromptState() === null) {
      setNewsletterPromptState("dismissed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* The site's light card: a mist header carrying the wordmark and the
          ask in the display face, left-aligned like every other page head;
          the form on plain white under it. */}
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-[28px]">
        <div className="relative isolate px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
          <div aria-hidden="true" className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]">
            <ShaderBackdrop design="mist" />
          </div>
          {/* The navy wordmark disappears on the dark theme; same pair as the navbar. */}
          <img src="/assets/logo.svg" alt="Jawafdehi" className="h-8 w-auto dark:hidden" />
          <img src="/assets/logo-dark.svg" alt="" aria-hidden="true" className="hidden h-8 w-auto dark:block" />
          <DialogHeader className="mt-6 space-y-3 text-left sm:text-left">
            <DialogTitle className="font-home-display text-[1.75rem] leading-[1.1] text-primary sm:text-[2rem]">
              {t("newsletter.modal.title")}
            </DialogTitle>
            <DialogDescription className="text-base leading-7 text-muted-foreground">
              {t("newsletter.modal.description")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-7 sm:px-8 sm:pb-8">
          <NewsletterForm compact submitLabel={t("newsletter.modal.submit")} className="w-full" />
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            {t("newsletter.modal.disclaimer")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
