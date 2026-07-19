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

  return (
    <section className="bg-muted/10 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-9 md:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:gap-16">
          {STEP_KEYS.map((key, index) => {
            const number = String(index + 1).padStart(2, "0");
            return (
              <article key={key} className="relative">
                <div className="mb-4 flex min-h-14 items-end gap-4">
                  <div className=" flex-shrink-0 text-5xl font-black leading-none text-accent/80  md:text-4xl">
                    {number}
                  </div>
                  <h3 className=" text-xl font-bold leading-tight tracking-normal text-foreground md:text-2xl">
                    {t(`ourProcess.steps.${key}.title`)}
                  </h3>
                </div>
                <p className="font-paragraph font-paragraph-muted max-w-[34rem]">
                  {t(`ourProcess.steps.${key}.description`)}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
