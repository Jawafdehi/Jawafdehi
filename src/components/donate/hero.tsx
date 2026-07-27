import { HeartHandshake, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";
import { trackEvent } from "@/utils/analytics";

const DONATION_INQUIRY_EMAIL = "inquiry@jawafdehi.org";

export function DonateHero() {
  const { t } = useTranslation();

  const scrollToDonationOptions = () => {
    trackEvent("donate_click", { method: "nav", action: "give_now" });

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    document.getElementById("donate")?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <PageHero
      id="donate-hero"
      description={t("donate.hero.description")}
      actionsClassName="flex flex-row items-center justify-center gap-2 sm:gap-3"
      actions={
        <>
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={scrollToDonationOptions}
            className="min-w-0 flex-1 gap-1 px-2 text-xs font-semibold sm:flex-none sm:gap-2 sm:px-8 sm:text-sm"
          >
            <HeartHandshake className="h-5 w-5" aria-hidden="true" />
            {t("donate.hero.giveNow")}
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="min-w-0 flex-1 gap-1 border-border/90 bg-background/80 px-2 text-xs font-semibold text-primary hover:border-primary/25 hover:bg-muted/70 hover:text-primary sm:flex-none sm:gap-2 sm:px-8 sm:text-sm"
          >
            <a
              href={`mailto:${DONATION_INQUIRY_EMAIL}`}
              onClick={() =>
                trackEvent("donate_click", { method: "nav", action: "contact" })
              }
            >
              <Mail className="h-5 w-5" aria-hidden="true" />
              {t("donate.hero.contactUs")}
            </a>
          </Button>
        </>
      }
      title={
        <>
          {t("donate.hero.support")}{" "}
          <span className="text-accent sm:whitespace-nowrap">
            {t("donate.hero.accountabilityArchive")}
          </span>
          <span className="text-primary"> {t("donate.hero.alive")}</span>
        </>
      }
    />
  );
}
