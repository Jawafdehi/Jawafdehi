import { useTranslation } from "react-i18next";

/** The mission, as two paragraphs of reading text under a section title. */
export function CommitmentMission() {
  const { t } = useTranslation();
  return (
    <section id="mission" aria-labelledby="mission-title" className="pt-4">
      <div className="layout-container">
        <h2 id="mission-title" className="font-home-section-title text-primary">
          {t("commitment.mission.title")}
        </h2>
        <div className="mt-6 max-w-3xl space-y-5 text-lg leading-8 text-muted-foreground">
          <p>{t("commitment.mission.paragraph1")}</p>
          <p>{t("commitment.mission.paragraph2")}</p>
        </div>
      </div>
    </section>
  );
}
