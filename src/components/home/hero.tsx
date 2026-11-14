// Homepage hero: the digital archive first, MCP as one way into it.
//
// The page sells the archive: corruption cases, court records and the
// documents behind them, in one open record. The hero says that in as few
// words as possible, on a plain navy stage, beside a page of record with its
// lines blacked out (a few in crimson): the archive's subject, drawn rather
// than described. The archive search is the main action; the MCP is named once
// as the newest way in. Its own page is /mcp.
//
// Non-negotiables:
//   * a navy stage, the same --primary-surface navy as the report band and the
//     footer: the navbar is transparent over it at rest (Navbar.tsx,
//     DARK_HERO_PATHS), and SSR, no-JS and no-WebGL visitors see exactly this
//     (the record lines are plain markup, no shader)
//   * --accent-on-dark for crimson on navy (raw --accent is 2.6:1)
import { useTranslation } from "react-i18next";

import { HeroSearchTypeahead } from "@/components/home/hero-search-typeahead";

// The page of record: rows of blacked-out lines, every third ending in a
// crimson bar. Widths are fixed per row, so it renders identically on the
// server and the client.
const RECORD_ROWS = Array.from({ length: 14 }, (_, i) => ({
  a: 18 + ((i * 37) % 30),
  b: 22 + ((i * 53) % 35),
  crimson: i % 3 === 0,
}));

export function Hero() {
  const { t } = useTranslation();

  return (
    <section id="hero" className="relative isolate -mt-[76px] overflow-hidden bg-primary-surface pt-[76px]">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 flex-col justify-center gap-4 px-12 [mask-image:linear-gradient(to_left,#000_30%,transparent)] lg:flex"
      >
        {RECORD_ROWS.map((row, i) => (
          <div key={i} className="flex gap-3">
            <span className="h-3 rounded-sm bg-white/[0.06]" style={{ width: `${row.a}%` }} />
            <span className="h-3 rounded-sm bg-white/[0.12]" style={{ width: `${row.b}%` }} />
            {row.crimson ? <span className="h-3 w-[14%] rounded-sm bg-[hsl(var(--accent-on-dark))]/40" /> : null}
          </div>
        ))}
      </div>

      <div className="layout-container flex min-h-[calc(100svh-76px)] flex-col justify-center py-14">
        {/* Upright and one step up from the eyebrow default, so the motto
            reads at a comfortable size on navy (--accent-on-dark is 4.6:1). */}
        <p className="font-eyebrow text-sm tracking-[0.06em] text-[hsl(var(--accent-on-dark))] md:text-base">
          {t("home.hero.eyebrow")}
        </p>
        {/* Devanagari runs wider per character, so Nepali gets a wider measure. */}
        <h1 className="font-home-display mt-5 max-w-[16ch] text-[clamp(2.6rem,6vw,5.25rem)] text-primary-foreground [:root[lang=ne]_&]:max-w-[22ch]">
          {t("home.hero.title")}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-primary-foreground/75">{t("home.hero.description")}</p>
        <div className="flex">
          <HeroSearchTypeahead />
        </div>
      </div>
    </section>
  );
}
