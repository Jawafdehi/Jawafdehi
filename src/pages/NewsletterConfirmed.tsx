import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

import { EmptyState } from "@/components/ui/empty-state";

const PILL_DARK =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary-surface px-5 text-[15px] text-primary-foreground transition-[transform,background-color] duration-150 ease-out hover:bg-primary-surface/90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const PILL =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-muted px-5 text-[15px] text-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.08] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Landing page SendPulse redirects to after a subscriber clicks the double
 * opt-in confirmation link in their email. Purely informational — SendPulse has
 * already flipped the contact to Active by the time they arrive here; this page
 * just confirms it and points them back into the archive.
 */
export default function NewsletterConfirmed() {
  const { t } = useTranslation();

  return (
    <main className="bg-background py-8 md:py-12">
      <Helmet>
        <title>{t("newsletter.confirmed.title")} — Jawafdehi</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="layout-container">
        <EmptyState
          kind="celebrate"
          headingLevel="h1"
          title={t("newsletter.confirmed.title")}
          description={t("newsletter.confirmed.message")}
          actions={
            <>
              <Link to="/search?type=case" className={PILL_DARK}>
                {t("newsletter.confirmed.exploreCases")}
              </Link>
              <Link to="/" className={PILL}>
                {t("newsletter.confirmed.home")}
              </Link>
            </>
          }
        />
      </div>
    </main>
  );
}
