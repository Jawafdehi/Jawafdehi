import { Github, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";

export function VolunteerHero() {
  const { t } = useTranslation();

  return (
    <PageHero
      id="volunteer-hero"
      description={t("volunteer.hero.description")}
      actionsClassName="flex flex-col items-center justify-center gap-3 sm:flex-row"
      actions={
        <>
          <Button asChild size="lg" className="font-semibold">
            <a
              href="https://github.com/Jawafdehi"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-5 w-5" aria-hidden="true" />
              {t("volunteer.hero.github")}
            </a>
          </Button>
          <Button asChild variant="secondary" size="lg" className="font-semibold">
            <a href="mailto:report@jawafdehi.org">
              <Mail className="h-5 w-5" aria-hidden="true" />
              {t("volunteer.hero.email")}
            </a>
          </Button>
        </>
      }
      title={
        <>
          {t("volunteer.hero.helpBuild")}{" "}
          <span className="text-accent sm:whitespace-nowrap">
            {t("volunteer.hero.permanentAccountability")}
          </span>
          <span className="block text-primary">{t("volunteer.hero.record")}</span>
        </>
      }
    />
  );
}
