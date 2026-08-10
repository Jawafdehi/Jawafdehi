import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Archive, Scale, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Feature = {
  id: string;
  titleKey: string;
  detailKey: string;
  icon: LucideIcon;
  iconClassName: string;
  iconWrapClassName: string;
  badgeKey?: string;
};

function useFeatures(): Feature[] {
  const { t } = useTranslation();
  return [
    {
      id: "case-archive",
      titleKey: t("home.features.caseArchive.title"),
      detailKey: t("home.features.caseArchive.detail"),
      icon: Archive,
      iconClassName: "text-primary",
      iconWrapClassName: "bg-primary-surface/10",
    },
    {
      id: "plain-language",
      titleKey: t("home.features.plainLanguage.title"),
      detailKey: t("home.features.plainLanguage.detail"),
      icon: Scale,
      iconClassName: "text-primary",
      iconWrapClassName: "bg-primary-surface/10",
    },
    {
      id: "ai-research",
      titleKey: t("home.features.aiResearch.title"),
      detailKey: t("home.features.aiResearch.detail"),
      icon: Sparkles,
      iconClassName: "text-alert-strong",
      iconWrapClassName: "bg-alert-strong/10",
      badgeKey: t("home.features.aiResearch.badge"),
    },
  ];
}

export function Features() {
  const features = useFeatures();
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const activeFeature = features.find((feature) => feature.id === activeFeatureId);

  return (
    <div onMouseLeave={() => setActiveFeatureId(null)}>
      <section id="features" className="py-12 md:py-20 bg-background border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
            {features.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                isActive={feature.id === activeFeatureId}
                onActivate={() => setActiveFeatureId(feature.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {activeFeature ? <FeatureDetail feature={activeFeature} /> : null}
    </div>
  );
}

function FeatureDetail({ feature }: Readonly<{ feature: Feature }>) {
  const Icon = feature.icon;

  return (
    <div
      id="feature-detail"
      className="border-b border-border bg-muted/30 py-7 transition-all duration-300 md:py-9"
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
              feature.iconWrapClassName,
            )}
            aria-hidden="true"
          >
            <Icon className={cn("h-5 w-5", feature.iconClassName)} />
          </div>

          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold text-foreground">{feature.titleKey}</h3>
              {feature.badgeKey ? (
                <span className="rounded-full bg-alert-strong/10 px-2 py-0.5 text-xs font-semibold text-alert-strong">
                  {feature.badgeKey}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-muted-foreground leading-relaxed">{feature.detailKey}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  feature,
  isActive,
  onActivate,
}: Readonly<{
  feature: Feature;
  isActive: boolean;
  onActivate: () => void;
}>) {
  const Icon = feature.icon;

  return (
    <button
      type="button"
      aria-expanded={isActive}
      aria-controls="feature-detail"
      onClick={onActivate}
      onFocus={onActivate}
      onMouseEnter={onActivate}
      className={cn(
        "w-full cursor-default appearance-none space-y-4 border-0 bg-transparent p-0 text-left [font:inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-8",
        isActive && "cursor-default",
      )}
    >
      <div
        className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center",
          feature.iconWrapClassName,
        )}
      >
        <Icon className={cn("h-6 w-6", feature.iconClassName)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-bold text-foreground">{feature.titleKey}</h3>
        {feature.badgeKey ? (
          <span className="rounded-full bg-alert-strong/10 px-2 py-0.5 text-xs font-semibold text-alert-strong">
            {feature.badgeKey}
          </span>
        ) : null}
      </div>
    </button>
  );
}
