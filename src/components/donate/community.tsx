import { useTranslation } from "react-i18next";

import { GlobeGate } from "@/components/donate/globe-gate";
import { Eyebrow } from "@/components/ui/eyebrow";

export function Community() {
  const { t } = useTranslation();

  return (
    <section
      id="donate-community"
      className="overflow-hidden bg-background py-16 md:py-20"
      aria-labelledby="donate-community-title"
    >
      <div className="layout-container flex flex-col items-center text-center">
        <div className="mx-auto max-w-5xl">
          <Eyebrow className="mb-3">{t("donate.community.eyebrow")}</Eyebrow>
          <h2
            id="donate-community-title"
            className="text-3xl font-bold leading-tight tracking-normal text-primary md:text-4xl"
          >
            {t("donate.community.title")}
          </h2>
          <p className="mt-5 text-base leading-8 text-foreground/70">
            {t("donate.community.description")}
          </p>
        </div>

        {/* The stage is always navy — the globe's dots and labels are lit for a
            dark backdrop. The static world map is the no-WebGL / reduced-motion
            / data-saver fallback; when the scene mounts it simply fades in on
            top (see globe-gate.tsx for the gates). */}
        <div className="relative mx-auto mt-10 w-full max-w-4xl overflow-hidden rounded-xl bg-primary-surface">
          <div className="relative h-[20rem] md:h-[26rem]">
            <img
              src="/assets/world-map.svg"
              alt=""
              aria-hidden="true"
              width="612"
              height="344"
              loading="lazy"
              className="absolute inset-0 m-auto h-full w-auto max-w-full object-contain opacity-30 invert"
            />
            <GlobeGate />
          </div>
        </div>
      </div>
    </section>
  );
}
