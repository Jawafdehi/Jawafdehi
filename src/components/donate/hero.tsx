import { HeartHandshake, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const DONATION_INQUIRY_EMAIL = "inquiry@jawafdehi.org";

export function DonateHero() {
  const { t } = useTranslation();

  const scrollToDonationOptions = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.getElementById("donate")?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <section
      id="donate-hero"
      className="relative isolate -mt-[76px] overflow-hidden bg-background pt-[76px]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-[64%] z-0 h-[320px] w-[560px] max-w-none -translate-x-1/2 opacity-[0.34] blur-[124px] dark:hidden sm:-top-24 sm:left-[65%] sm:h-[400px] sm:w-[680px] sm:opacity-[0.38] sm:blur-[136px] lg:-top-28 lg:left-[66%] lg:h-[500px] lg:w-[820px] lg:opacity-[0.42] lg:blur-[152px]"
      >
        <div className="absolute right-[4%] top-10 h-[66%] w-[54%] rounded-full bg-accent opacity-85" />
        <div className="absolute left-[32%] top-24 h-[52%] w-[42%] rounded-full bg-accent opacity-55" />
        <div className="absolute -left-[14%] top-[46%] h-[34%] w-[26%] rounded-full bg-primary opacity-35" />
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] opacity-[0.22] [background-image:radial-gradient(hsl(var(--foreground)/0.14)_0.75px,transparent_0.75px)] [background-size:18px_18px]"
      />

      <div className="container relative z-10 mx-auto flex min-h-[52svh] w-full items-center justify-center py-14 text-center md:py-[4.5rem] lg:py-20">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-[2.65rem] font-extrabold leading-[0.98] tracking-normal text-primary sm:text-5xl md:text-[3.35rem]">
            {t("donate.hero.support")}{" "}
            <span className="text-accent sm:whitespace-nowrap">
              {t("donate.hero.accountabilityArchive")}
            </span>
            <span className="block text-primary">{t("donate.hero.alive")}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
            {t("donate.hero.description")}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={scrollToDonationOptions}
              className="w-full font-semibold sm:w-auto"
            >
              <HeartHandshake className="h-5 w-5" aria-hidden="true" />
              {t("donate.hero.giveNow")}
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full border-border/90 bg-background/80 font-semibold text-primary hover:border-primary/25 hover:bg-muted/70 hover:text-primary sm:w-auto"
            >
              <a href={`mailto:${DONATION_INQUIRY_EMAIL}`}>
                <Mail className="h-5 w-5" aria-hidden="true" />
                {t("donate.hero.contactUs")}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
