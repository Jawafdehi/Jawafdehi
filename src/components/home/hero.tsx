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
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { HeroSearchTypeahead } from "@/components/home/hero-search-typeahead";
import { AnimatedCount } from "@/components/ui/animated-count";
import { cn } from "@/lib/utils";

type HeroProps = {
  casesDocumented: string;
  totalBigo: string;
  materials: string;
  courtCasesTracked: string;
};

type HeroStat = {
  label: string;
  value: string;
  href: string;
  /** The one figure that carries the accent — public money implicated. */
  highlight?: boolean;
};

export function Hero({
  casesDocumented,
  totalBigo,
  materials,
  courtCasesTracked,
}: Readonly<HeroProps>) {
  const { t } = useTranslation();

  const stats: HeroStat[] = [
    { value: casesDocumented, label: t("home.hero.stats.casesDocumented"), href: "/search?type=case" },
    { value: totalBigo, label: t("home.hero.stats.totalBigo"), href: "/search?type=case", highlight: true },
    { value: materials, label: t("home.hero.stats.materials"), href: "/materials" },
    { value: courtCasesTracked, label: t("home.hero.stats.courtCasesTracked"), href: "/search?type=courtcase" },
  ];

  return (
    <section id="hero" className="relative isolate -mt-[76px] overflow-hidden bg-primary-surface pt-[76px]">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <ShaderBackdrop design="diamond" />
        {/* The pattern fades out toward the figures, so they sit on calm navy
            without a box around them. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,hsl(var(--primary-surface))_0%,hsl(var(--primary-surface)/0.9)_14%,transparent_32%)]" />
      </div>

      {/* A solid panel cut out of the field, copy centred in it. */}
      <div className="layout-container grid min-h-[calc(100svh-76px-6.5rem)] place-items-center py-14">
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

      <HeroLedger stats={stats} />
    </section>
  );
}

/** The archive in four figures along the foot of the hero. Each figure links
 * to the part of the archive it counts. */
function HeroLedger({ stats }: Readonly<{ stats: HeroStat[] }>) {
  return (
    <div className="layout-container grid grid-cols-2 gap-x-6 gap-y-8 pb-14 md:grid-cols-4">
      {stats.map(({ value, label, href, highlight }) => (
        <Link
          key={label}
          to={href}
          className="group block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-surface"
        >
          <p
            className={cn(
              "font-home-display whitespace-nowrap text-[1.35rem] tabular-nums sm:text-3xl md:text-4xl",
              highlight ? "text-[hsl(var(--accent-on-dark))]" : "text-primary-foreground",
            )}
          >
            <HeroStatValue value={value} />
          </p>
          {/* Sentence case, no letterspacing: uppercase+tracking split
              Devanagari matras in the Nepali locale (PR #359 review). */}
          <p className="mt-2 text-lg text-primary-foreground/80 transition-colors group-hover:text-primary-foreground">
            {label}
          </p>
        </Link>
      ))}
    </div>
  );
}

function HeroStatValue({ value }: Readonly<{ value: string }>) {
  // Finish pop: when the count-up lands, the figure does a brief settle-pop
  // (scale + brightness, .animate-stat-pop in index.css). onEnd only ever
  // fires when the animation actually ran, so static renders never pop.
  const [popped, setPopped] = useState(false);

  // Split the formatted figure into constant-prefix / number / constant-suffix
  // so currency figures spin too: "Rs 1.91 Kharab" animates 0.00 -> 1.91 with
  // the "Rs " and " Kharab" held steady. Placeholders with no digits ("—")
  // fall through and render as-is.
  const match = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(\D*)$/.exec(value);
  if (!match) {
    return <>{value}</>;
  }
  const [, prefix, figure, suffix] = match;
  const numericValue = Number(figure.replace(/,/g, ""));
  const decimals = figure.includes(".") ? figure.split(".")[1].length : 0;

  if (!Number.isFinite(numericValue)) {
    return <>{value}</>;
  }

  // `display={value}` keeps the pre-animation text byte-identical to what the
  // API gave us, rather than re-deriving the grouping from the number.
  return (
    <span className={cn(popped && "animate-stat-pop")}>
      <AnimatedCount
        end={numericValue}
        display={value}
        duration={0.9}
        decimals={decimals}
        prefix={prefix || undefined}
        suffix={suffix || undefined}
        onEnd={() => setPopped(true)}
      />
    </span>
  );
}
