import { Globe, HeartHandshake, Search, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TbBrandOpenSource } from "react-icons/tb";

type ImpactItem = { title: string; desc: string };

const impactIcons = [Globe, Search, ShieldCheck, TbBrandOpenSource];

const isImpactItem = (item: unknown): item is ImpactItem =>
  typeof item === "object" &&
  item !== null &&
  "title" in item &&
  "desc" in item &&
  typeof item.title === "string" &&
  typeof item.desc === "string";

export function DonationDescription() {
  const { t } = useTranslation();
  const rawImpactItems = t("donate.impact.items", {
    returnObjects: true,
  });
  const impactItems = Array.isArray(rawImpactItems)
    ? rawImpactItems.filter(isImpactItem)
    : [];

  return (
    <section
      id="donate-impact"
      className="bg-muted/10 pb-10 pt-12 md:pb-12 md:pt-14 lg:pt-16"
      aria-labelledby="donate-impact-title"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {t("donate.impact.eyebrow")}
          </p>
          <h2
            id="donate-impact-title"
            className="text-3xl font-bold text-foreground md:text-4xl"
          >
            {t("donate.impact.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-foreground/70">
            {t("donate.impact.description")}
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-10 md:mt-16 md:grid-cols-2 md:gap-12 lg:grid-cols-4 lg:gap-10">
          {impactItems.map((item, index) => {
            const Icon = impactIcons[index] ?? HeartHandshake;

            return (
              <div
                key={item.title}
                className="mx-auto flex max-w-[16rem] flex-col items-center text-center"
              >
                <Icon
                  aria-hidden="true"
                  className="mb-5 h-8 w-8 text-primary"
                  strokeWidth={1.45}
                />
                <h3 className="mb-2 text-lg font-bold leading-tight text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm leading-6 text-foreground/70">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
