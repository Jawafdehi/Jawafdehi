import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FaDiscord } from "react-icons/fa";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { JAWAFDEHI_SOCIALS } from "@/config/constants";
import { cn } from "@/lib/utils";

type CtaProps = {
  className?: string;
};

/**
 * The "come and help" close on /volunteer and /team: one light card on the
 * mist shader (white with a blush of crimson and a wash of blue, the likhit
 * OCR card's ground), a display title, one line, and two pills: Discord in
 * navy, email in white on a hairline.
 */
export function Cta({ className }: Readonly<CtaProps>) {
  const { t } = useTranslation();
  return (
    <section id="contribute" className={cn("layout-container py-16 md:py-24", className)} aria-labelledby="contribute-title">
      <div className="relative isolate overflow-hidden rounded-[28px] border border-border/70 bg-surface px-6 py-12 md:px-12 md:py-16">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <ShaderBackdrop design="mist" />
        </div>
        <h2
          id="contribute-title"
          className="font-home-display max-w-2xl text-3xl leading-tight text-primary md:text-[2.75rem]"
        >
          {t("cta.title")}
        </h2>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">{t("cta.description")}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={JAWAFDEHI_SOCIALS.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-primary-surface px-6 text-[15px] text-primary-foreground transition-[transform,background-color] duration-150 ease-out hover:bg-primary-surface/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:active:scale-100"
          >
            <FaDiscord className="h-[18px] w-[18px]" aria-hidden="true" />
            {t("cta.discord")}
          </a>
          <a
            href="mailto:report@jawafdehi.org"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-surface/80 px-6 text-[15px] text-primary ring-1 ring-border/70 transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.08] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:active:scale-100"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {t("cta.email")}
          </a>
        </div>
      </div>
    </section>
  );
}
