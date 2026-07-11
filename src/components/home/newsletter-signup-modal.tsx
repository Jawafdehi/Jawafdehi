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
import { NewsletterForm } from "@/components/home/newsletter-form";
import { getNewsletterPromptState, setNewsletterPromptState } from "@/lib/newsletter";

/**
 * Dwell before the prompt appears — long enough that it reads as a considered
 * ask to an engaged reader rather than an immediate interruption on first paint.
 */
const OPEN_DELAY_MS = 25000;

/**
 * Routes the prompt may appear on: the home page and the content pages an
 * engaged reader is most likely to land on from social/search — case pages and
 * the updates feed. Other routes (about, privacy, admin, …) never arm it.
 */
function isEligiblePath(path: string): boolean {
  return (
    path === "/" ||
    path === "/cases" ||
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
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (armedRef.current) return;
    if (getNewsletterPromptState() !== null) return;
    if (!eligibleRef.current) return;
    // First eligible view: start the dwell. No cleanup here on purpose — we
    // don't want a route change to clear the timer and reset the dwell.
    armedRef.current = true;
    timerRef.current = window.setTimeout(() => {
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
      <DialogContent className="max-w-md gap-6 p-8 text-center sm:rounded-2xl">
        <div className="flex items-center justify-center gap-2">
          <img src="/favicon.png" alt="" aria-hidden="true" className="h-8 w-8" />
          <span className="text-lg font-bold text-foreground">Jawafdehi</span>
        </div>

        <DialogHeader className="space-y-3 text-center sm:text-center">
          <DialogTitle className="text-2xl font-extrabold leading-tight tracking-normal md:text-3xl">
            {t("newsletter.modal.title")}
          </DialogTitle>
          <DialogDescription className="mx-auto max-w-sm text-sm leading-6">
            {t("newsletter.modal.description")}
          </DialogDescription>
        </DialogHeader>

        <NewsletterForm
          compact
          submitLabel={t("newsletter.modal.submit")}
          className="mx-auto w-full max-w-sm"
        />

        <p className="mx-auto max-w-sm text-xs leading-5 text-muted-foreground">
          {t("newsletter.modal.disclaimer")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
