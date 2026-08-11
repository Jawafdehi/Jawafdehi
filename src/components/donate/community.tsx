import { useTranslation } from "react-i18next";

import { Eyebrow } from "@/components/ui/eyebrow";

export function Community() {
  const { t } = useTranslation();

  return (
    <section
      id="donate-community"
      className="overflow-hidden bg-background "
      aria-labelledby="donate-community-title"
    >
      <div className="layout-container flex flex-col items-center text-center">
        <div className="mx-auto max-w-5xl">
          <Eyebrow className="mb-3">
            {t("donate.community.eyebrow")}
          </Eyebrow>
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

        <div className="relative mx-auto  flex h-[20rem] w-full items-center justify-center  md:h-[24rem]">
          <img
            src="/assets/world-map.svg"
            alt=""
            aria-hidden="true"
            width="612"
            height="344"
            className="mx-auto h-full w-auto max-w-full object-contain opacity-95"
          />
        </div>
      </div>
    </section>
  );
}
