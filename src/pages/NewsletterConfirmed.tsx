import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { Helmet } from "react-helmet-async";

import { Button } from "@/components/ui/button";

/**
 * Landing page SendPulse redirects to after a subscriber clicks the double
 * opt-in confirmation link in their email. Purely informational — SendPulse has
 * already flipped the contact to Active by the time they arrive here; this page
 * just confirms it and points them back into the archive.
 */
export default function NewsletterConfirmed() {
  const { t } = useTranslation();

  return (
    <main className="bg-background py-16 md:py-24">
      <Helmet>
        <title>{t("newsletter.confirmed.title")} — Jawafdehi</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="layout-container max-w-xl text-center">
        <div className="space-y-6">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-primary md:text-4xl">
              {t("newsletter.confirmed.title")}
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              {t("newsletter.confirmed.message")}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/cases">{t("newsletter.confirmed.exploreCases")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">{t("newsletter.confirmed.home")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
