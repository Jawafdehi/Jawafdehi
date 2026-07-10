import { Trans } from "react-i18next";

import { PageHero } from "@/components/ui/page-hero";

export function OurProcessHero() {
  return (
    <PageHero
      id="process-hero"
      contentClassName="min-h-0 px-8 py-10 sm:px-8 md:min-h-[35svh] md:px-8 md:py-12 lg:py-14"
      title={
        <Trans i18nKey="ourProcess.hero.heading">
          How a <span className="text-accent">corruption</span> case goes from discovery to the{" "}
          <span className="text-accent">public archive</span>
        </Trans>
      }
    />
  );
}
