import { useTranslation } from "react-i18next";

import { PageHero } from "@/components/ui/page-hero";

export function CommitmentHero() {
  const { t } = useTranslation();

  return (
    <PageHero
      id="commitment-hero"
      description={t("commitment.hero.description")}
      descriptionClassName="max-w-4xl"
      title={
        <>
          {t("commitment.hero.nepalDeserves")}{" "}
          <span className="text-accent sm:whitespace-nowrap">
            {t("commitment.hero.permanentMemory")}
          </span>
          <span className="block text-primary">
            {t("commitment.hero.ofAccountability")}
          </span>
        </>
      }
    />
  );
}
