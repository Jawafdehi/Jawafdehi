import { Trans } from "react-i18next";

import { PageHero } from "@/components/ui/page-hero";

export function OurProcessHero() {
  return (
    <PageHero
      id="process-hero"
      title={
        <Trans i18nKey="ourProcess.hero.heading">
          {/* One line: Trans counts children, and the translation puts the
              second highlight at index 3, so no {" "} may sit between them. */}
          How a <span className="text-accent">corruption</span> case goes from discovery to the <span className="text-accent">public archive</span>
        </Trans>
      }
    />
  );
}
