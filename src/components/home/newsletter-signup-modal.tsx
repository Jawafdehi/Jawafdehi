import { useEffect, useState } from "react";
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

/** Delay before the prompt appears, so it doesn't interrupt the first paint. */
const OPEN_DELAY_MS = 5000;

/**
 * Newsletter signup prompt shown once per browser when a visitor lands on the
 * site. Dismissing it (or subscribing anywhere) keeps it from reappearing.
 */
export function NewsletterSignupModal() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (getNewsletterPromptState() !== null) return;
    const timer = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

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
