// Homepage hero — "The Ledger" layout.
//
// Split hero: editorial serif headline on the left, the Nepal particle map on
// an always-navy panel on the right (mockup B), with the animated stat band
// riding the hero's bottom edge on the same navy (mockup C). The navy panel is
// what makes the map legible: light points on dark navy read as Nepal at a
// glance, where the old full-bleed light-on-light backdrop was guessable at
// best and clipped by the viewport at worst.
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, FilePlus2, FolderSearch } from "lucide-react";

import { HeroSceneGate } from "@/components/home/hero-scene-gate";
import { AnimatedCount } from "@/components/ui/animated-count";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
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
  href?: string;
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
  const navigate = useNavigate();
  const [archiveQuery, setArchiveQuery] = useState("");

  const heroStats: HeroStat[] = [
    { value: casesDocumented, label: t("home.hero.stats.casesDocumented"), href: "/search?type=case" },
    {
      value: totalBigo,
      label: t("home.hero.stats.totalBigo"),
      href: "/search?type=case",
      highlight: true,
    },
    { value: materials, label: t("home.hero.stats.materials"), href: "/search?type=material" },
    {
      value: courtCasesTracked,
      label: t("home.hero.stats.courtCasesTracked"),
      href: "/search?type=courtcase",
    },
  ];

  const goToSearch = (query: string) => {
    const trimmedQuery = query.trim();
    const params = new URLSearchParams({ type: "case" });

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    navigate(`/search?${params.toString()}`);
  };

  const submitArchiveSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    goToSearch(archiveQuery);
  };

  return (
    <section
      id="hero"
      className="relative isolate -mt-[76px] overflow-hidden border-b bg-background pt-[76px]"
    >
      <div className="layout-container grid gap-8 py-10 sm:py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:py-16 xl:gap-16">
        {/* ── Left: the editorial column ── */}
        <div className="flex max-w-2xl flex-col items-start text-left">
          {/* Crimson rule — the editorial mark that opens the page. */}
          <div aria-hidden="true" className="h-1 w-14 rounded-full bg-accent" />

          <p className="font-eyebrow font-eyebrow-display mt-6 max-w-full">
            <em>{t("home.hero.eyebrow")}</em>
          </p>

          <h1 className="font-home-hero-title mt-4">
            {t("home.hero.titlePrefix")}{" "}
            <span className="italic text-accent">{t("home.hero.titleHighlight")}</span>{" "}
            {t("home.hero.titleSuffix")}
          </h1>

          <p className="font-home-hero-lede measure-intro mt-5">
            {t("home.hero.description")}
          </p>

          <form className="mt-7 w-full max-w-[min(100%,42rem)]" onSubmit={submitArchiveSearch}>
            <label className="sr-only" htmlFor="hero-archive-search">
              {t("home.hero.searchLabel")}
            </label>

            <SearchBar
              id="hero-archive-search"
              inputClassName="bg-background/95 shadow-lg shadow-primary-surface/5"
              onChange={(event) => setArchiveQuery(event.target.value)}
              placeholder={t("home.hero.searchPlaceholder")}
              submitLabel={t("home.hero.searchSubmit")}
              value={archiveQuery}
            />
          </form>

          {/* The two primary actions. Report carries the crimson accent — the one
              reserved color, spent here so a first-time visitor's eye lands on the
              action that grows the archive. Browse stays a quiet outline: the
              search bar above already serves the exploring visitor. */}
          <div className="mt-5 flex w-full max-w-[min(100%,42rem)] flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-accent font-bold text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90"
            >
              <Link to="/report">
                <FilePlus2 className="h-5 w-5" aria-hidden="true" />
                {t("header.reportCase")}
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg">
              <Link to="/search?type=case">
                <FolderSearch className="h-5 w-5" aria-hidden="true" />
                {t("header.browseCases")}
              </Link>
            </Button>
          </div>

          <Link
            className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
            to="/data-quality"
          >
            <span className="relative after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 group-hover:after:scale-x-100">
              {t("home.hero.coverageLink", "See what we cover")}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        </div>

        {/* ── Right: the navy map panel ── */}
        <HeroMapPanel />
      </div>

      {/* ── Stat band: the archive in numbers, on the hero's bottom edge ── */}
      <HeroStatBand stats={heroStats} />
    </section>
  );
}

/** The Nepal map on an always-navy panel: static (inverted) map as the no-JS /
 * no-WebGL / reduced-motion fallback, with the particle field fading in over
 * it when the lazy scene is ready. The whole silhouette stays inside the
 * panel — nothing bleeds off screen. Decorative throughout. */
function HeroMapPanel() {
  const [sceneReady, setSceneReady] = useState(false);

  return (
    <div
      aria-hidden="true"
      className="relative min-h-[280px] overflow-hidden rounded-3xl bg-primary shadow-[0_24px_60px_-28px_hsl(var(--primary)/0.6)] sm:min-h-[360px] lg:min-h-[520px] lg:self-stretch"
    >
      {/* Crimson glow — the one warm note on the navy field. */}
      <div className="absolute left-1/2 top-1/2 h-3/5 w-3/5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />

      {/* Static fallback map. map-light.svg draws in dark ink, so it is
          inverted to read light-on-navy; when the particle field is live it
          settles back and the particles carry the silhouette. It never
          unmounts — it IS the reduced-motion / no-WebGL rendering. */}
      <div
        className={cn(
          "absolute inset-5 transition-opacity duration-1000 sm:inset-8 lg:inset-10",
          sceneReady ? "opacity-[0.14]" : "opacity-90",
        )}
      >
        <img
          src="/assets/map-light.svg"
          alt=""
          decoding="async"
          {...{ fetchpriority: "low" }}
          className="h-full w-full object-contain [filter:invert(1)_brightness(1.6)]"
        />
      </div>

      {/* WebGL particle field — camera auto-fits the full silhouette to the
          panel (CameraFit in hero-scene.tsx), and forceDark keeps the points
          light on the always-navy surface regardless of theme. */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-1000",
          sceneReady ? "opacity-100" : "opacity-0",
        )}
      >
        <HeroSceneGate
          mapSrc="/assets/map-light.svg"
          forceDark
          onReady={() => setSceneReady(true)}
        />
      </div>
    </div>
  );
}

function HeroStatBand({ stats }: Readonly<{ stats: HeroStat[] }>) {
  return (
    <div className="bg-primary">
      <div className="layout-container grid grid-cols-2 gap-x-4 gap-y-7 py-8 md:grid-cols-4 md:py-10">
        {stats.map(({ value, label, href, highlight }) => {
          const content = (
            <>
              <p
                className={cn(
                  "text-3xl font-bold tabular-nums md:text-4xl",
                  highlight
                    ? // Accent lightened for navy (--accent-on-dark, 4.6:1 on
                      // --primary) — raw --accent is only 2.6:1 here.
                      "text-[hsl(var(--accent-on-dark))]"
                    : "text-primary-foreground",
                )}
              >
                <HeroStatValue value={value} />
              </p>

              <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground/60 transition-colors group-hover:text-primary-foreground/85">
                {label}
              </p>
            </>
          );

          return href ? (
            <Link
              key={label}
              to={href}
              className="group block rounded-lg px-1 py-1 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              {content}
            </Link>
          ) : (
            <div key={label} className="px-1 py-1">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeroStatValue({ value }: Readonly<{ value: string }>) {
  const normalizedValue = value.replace(/,/g, "");
  const numericValue = Number(normalizedValue);

  if (!Number.isFinite(numericValue) || normalizedValue.trim() === "") {
    return <>{value}</>;
  }

  // `display={value}` keeps the pre-animation text byte-identical to what the
  // API gave us, rather than re-deriving the grouping from the number.
  return <AnimatedCount end={numericValue} display={value} duration={0.9} />;
}
