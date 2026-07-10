import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { NewsletterForm } from "@/components/home/newsletter-form";

/**
 * Landing-page section pairing the newsletter signup with volunteer and
 * donation calls to action.
 */
export function ShareOurVision() {
  const { t } = useTranslation();

  return (
    <section
      id="share-our-vision"
      className="border-b border-primary bg-primary py-12 text-primary-foreground md:py-16"
      aria-labelledby="share-our-vision-title"
    >
      <div className="container mx-auto px-4">
        <h2
          id="share-our-vision-title"
          className="text-3xl font-bold leading-tight tracking-normal text-primary-foreground md:text-4xl"
        >
          {t("newsletter.vision.title")}
        </h2>

        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-0 md:divide-x md:divide-primary-foreground/20">
          <div className="md:pr-10 lg:pr-16">
            <h3 className="text-xl font-semibold text-primary-foreground">
              {t("newsletter.vision.stayInformed.title")}
            </h3>
            <p className="mt-3 max-w-md text-sm leading-6 text-primary-foreground/75 md:text-base">
              {t("newsletter.vision.stayInformed.description")}
            </p>
            <NewsletterForm
              withLastName
              inverted
              submitLabel={t("newsletter.form.subscribe")}
              className="mt-6 max-w-md"
            />
          </div>

          <div className="flex flex-col gap-10 md:pl-10 lg:pl-16">
            <div>
              <h3 className="text-xl font-semibold text-primary-foreground">
                {t("newsletter.vision.engage.title")}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-primary-foreground/75 md:text-base">
                {t("newsletter.vision.engage.description")}
              </p>
              <Button
                variant="outline"
                className="mt-5 border-primary-foreground/45 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                asChild
              >
                <Link to="/volunteer">
                  {t("newsletter.vision.engage.cta")} <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-primary-foreground">
                {t("newsletter.vision.donate.title")}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-primary-foreground/75 md:text-base">
                {t("newsletter.vision.donate.description")}
              </p>
              <Button
                variant="outline"
                className="mt-5 border-primary-foreground bg-primary-foreground text-primary shadow-lg shadow-primary-foreground/10 hover:bg-primary-foreground/90 hover:text-primary"
                asChild
              >
                <Link to="/donate">{t("newsletter.vision.donate.cta")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
