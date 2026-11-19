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

import { cn } from "@/lib/utils";

import { HeroSearchTypeahead } from "@/components/home/hero-search-typeahead";

// The page of record: rows of blacked-out lines, every third ending in a
// crimson bar, spread evenly over the height of the words beside them. Widths
// are fixed per row, so it renders identically on the server and the client.
const RECORD_ROWS = Array.from({ length: 18 }, (_, i) => ({
  a: 18 + ((i * 37) % 30),
  b: 22 + ((i * 53) % 35),
  crimson: i % 3 === 0,
}));

export function Hero() {
  const { t } = useTranslation();

  return (
    <section id="hero" className="relative isolate -mt-[76px] overflow-hidden bg-primary-surface pt-[76px]">
      {/* The words and the page of record share one row, so the lines run
          exactly from the top of the eyebrow to the bottom of the search,
          whatever the language or the headline's wrapping. */}
      <div className="layout-container grid min-h-[calc(100svh-76px)] content-center py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,42%)] lg:gap-12">
        <div className="col-start-1 row-start-1">
        {/* Upright and one step up from the eyebrow default, so the motto
            reads at a comfortable size on navy (--accent-on-dark is 4.6:1). */}
        <p className="font-eyebrow text-sm tracking-[0.06em] text-[hsl(var(--accent-on-dark))] md:text-base">
          {t("home.hero.eyebrow")}
        </p>
        {/* Nepali is set at 0.8 of the English size: its 1.28 leading (which
            the matras need) then lands on the same line pitch as English's
            1.02, so the headline is the same height in both languages.
            Devanagari runs wider per character, so it gets a wider measure.
            Three slots so the crimson phrase can sit mid-sentence; the spaces
            live in the strings, since Nepali's tail joins the phrase (…ता|को). */}
        <h1 className="font-home-display mt-5 max-w-[16ch] text-[clamp(2.4rem,5.2vw,4.5rem)] text-primary-foreground [:root[lang=ne]_&]:max-w-[22ch] [:root[lang=ne]_&]:text-[clamp(1.92rem,4.16vw,3.6rem)]">
          {t("home.hero.titleLead")}
          <span className="hero-ink text-[hsl(var(--accent-on-dark))]">{t("home.hero.titleHighlight")}</span>
          {t("home.hero.titleTail")}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-primary-foreground/75">{t("home.hero.description")}</p>
        <div className="flex">
          <HeroSearchTypeahead />
        </div>
        </div>

        <div
          aria-hidden="true"
          className={cn(
            // Below lg the grid is one column: the lines share the words' cell,
            // behind them on the right and fainter, still running from the
            // eyebrow to the search bar. From lg up they take their own column.
            "relative col-start-1 row-start-1 -z-10 ml-auto flex w-3/5 overflow-hidden max-w-sm flex-col justify-between opacity-35 sm:opacity-50 [mask-image:linear-gradient(to_left,#000_25%,transparent)]",
            "lg:col-start-2 lg:z-auto lg:ml-0 lg:w-auto lg:max-w-none lg:opacity-100 lg:[mask-image:linear-gradient(to_left,#000_45%,transparent)]",
          )}
        >
          {/* Movement (index.css, .record-write / .record-scan): the lines write
              themselves in row by row, the crimson marks last, then a soft scan
              passes down now and then. Still under reduced motion. */}
          {RECORD_ROWS.map((row, i) => (
            <div key={i} className="flex gap-3">
              <span className="record-write h-3 rounded-sm bg-white/[0.06]" style={{ width: `${row.a}%`, ["--record-delay" as string]: `${150 + i * 45}ms` }} />
              <span className="record-write h-3 rounded-sm bg-white/[0.12]" style={{ width: `${row.b}%`, ["--record-delay" as string]: `${230 + i * 45}ms` }} />
              {row.crimson ? <span className="record-write h-3 w-[14%] rounded-sm bg-[hsl(var(--accent-on-dark))]/40" style={{ ["--record-delay" as string]: `${420 + i * 45}ms` }} /> : null}
            </div>
          ))}
          <span
            className="record-scan pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.12)_50%,transparent_100%)] [background-size:100%_40%] bg-no-repeat [background-position:center] [mask-image:linear-gradient(to_left,transparent,#000_35%)]"
          />
        </div>
      </div>
    </section>
  );
}
