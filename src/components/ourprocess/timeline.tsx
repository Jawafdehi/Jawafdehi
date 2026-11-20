import { useTranslation } from "react-i18next";

// Pipeline step order is fixed here; the copy lives in i18n under ourProcess.steps.*
const STEP_KEYS = [
  "discovery",
  "research",
  "compilation",
  "aiDrafting",
  "verification",
  "ongoingTracking",
] as const;

export function ProcessTimeline() {
  const { t } = useTranslation();

  // Six steps as hairline cards: the number in the display face and crimson,
  // the step's name, then its line.
  return (
    <section className="pb-20 pt-4 md:pb-28">
      <div className="layout-container">
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STEP_KEYS.map((key, index) => {
            const number = String(index + 1).padStart(2, "0");
            return (
              <li key={key} className="flex flex-col rounded-[28px] border border-border/70 bg-surface p-6 md:p-7">
                <span className="font-home-display text-3xl tabular-nums text-accent">{number}</span>
                <h3 className="mt-8 text-xl font-normal leading-snug text-primary md:text-2xl">
                  {t(`ourProcess.steps.${key}.title`)}
                </h3>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  {t(`ourProcess.steps.${key}.description`)}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
