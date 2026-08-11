import { useTranslation } from "react-i18next";

export function CommitmentMission() {
  const { t } = useTranslation();
  return (
    <section id="mission" className="bg-muted/10 pb-12 pt-4 md:pb-16 md:pt-5">
      <div className="layout-container">
        <h2 className="mb-10 text-center text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
          {t("commitment.mission.title")}
        </h2>

        <div className="mx-auto max-w-4xl space-y-5 text-center">
          <p className="font-paragraph font-paragraph-foreground">
            {t("commitment.mission.paragraph1")}
          </p>
          <p className="font-paragraph font-paragraph-foreground">
            {t("commitment.mission.paragraph2")}
          </p>
        </div>
      </div>
    </section>
  );
}
