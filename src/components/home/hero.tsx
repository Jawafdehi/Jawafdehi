// Homepage hero — the digital archive first, MCP as one way into it.
//
// The page sells the archive: corruption cases, court records and the
// documents behind them, in one open record. The hero says that in as few
// words as possible, in a solid panel cut out of the diamond field (a 2×2
// Bayer dither, like a register's grid), offers the archive search as the main
// action, and names the MCP once as the newest way in. Its own page is /mcp, which carries
// the grain design instead.
//
// Non-negotiables:
//   * a navy stage, the same --primary-surface navy as the report band and the
//     footer: the navbar is transparent over it at rest (Navbar.tsx,
//     DARK_HERO_PATHS), and it is what SSR/no-WebGL visitors see
//   * --accent-on-dark for crimson text on navy (raw --accent is 2.6:1)
//   * reduced motion: the shader renders one still frame
import { useTranslation } from "react-i18next";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { HeroSearchTypeahead } from "@/components/home/hero-search-typeahead";

export function Hero() {
  const { t } = useTranslation();

  return (
    <section id="hero" className="relative isolate -mt-[76px] overflow-hidden bg-primary-surface pt-[76px]">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <ShaderBackdrop design="diamond" />
        {/* The pattern fades out under the transparent navbar, so its links
            always sit on plain navy. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--primary-surface))_0px,hsl(var(--primary-surface))_60px,transparent_170px)]" />
      </div>

      {/* A solid panel cut out of the field, copy centred in it. */}
      <div className="layout-container grid min-h-[calc(100svh-76px)] place-items-center py-14">
        <div className="w-full max-w-5xl bg-primary-surface px-6 py-12 text-center sm:px-12 md:py-16 lg:px-20">
          {/* Upright and one step up from the eyebrow default, so the motto
              reads at a comfortable size on navy (--accent-on-dark is 4.6:1). */}
          <p className="font-eyebrow font-eyebrow-display text-sm text-[hsl(var(--accent-on-dark))] md:text-base">
            {t("home.hero.eyebrow")}
          </p>
          <h1 className="font-home-display mx-auto mt-5 max-w-[18ch] text-[clamp(2.3rem,5.2vw,4.5rem)] text-primary-foreground">
            {t("home.hero.title")}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary-foreground/75">
            {t("home.hero.description")}
          </p>
          {/* The typeahead lays itself out as a form; centre it in the panel. */}
          <div className="flex justify-center">
            <HeroSearchTypeahead />
          </div>
        </div>
      </div>

    </section>
  );
}
