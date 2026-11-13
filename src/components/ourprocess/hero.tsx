import { Trans, useTranslation } from "react-i18next";

import { PageHero } from "@/components/ui/page-hero";

export function OurProcessHero() {
  // `t` passed in, not read from context: a bare <Trans> does not re-render on
  // a language change, so it kept the Nepali the app first renders in before
  // switching to a stored English preference.
  const { t } = useTranslation();
  return (
    <PageHero
      id="process-hero"
      title={
        <Trans i18nKey="ourProcess.hero.heading" t={t}>
          {/* One line: Trans counts children, and the translation puts the
              second highlight at index 3, so no {" "} may sit between them. */}
          How a <span className="text-accent">corruption</span> case goes from discovery to the <span className="text-accent">public archive</span>
        </Trans>
      }
    />
  );
}
