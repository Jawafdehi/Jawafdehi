// Homepage hero — "The Stage" (Option A).
//
// The Nepal particle map is no longer a side panel: it is the full-bleed
// backdrop of a dark, viewport-filling stage. The field assembles from deep
// scatter on load (hero-scene.tsx), rests tilted back like a floor beneath
// the content, and scroll scrubs extra tilt/sink/fade so leaving the hero
// plays as one continuous camera move. The content — headline, one large
// search pill, two actions — sits dead-center: the primary job of this page
// is a citizen arriving to search the archive.
//
// Non-negotiables carried over from the split design:
//   * static fallback — the inverted map-light.svg IS the no-JS / no-WebGL /
//     reduced-motion rendering; the WebGL field fades in over it
//   * reduced motion — the scene gate blocks WebGL, and the scroll-scrub
//     listener below never attaches
//   * the navy stat band rides the hero's bottom edge, --accent-on-dark
//     carrying the money figure (raw --accent is 2.6:1 on navy)
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ChevronDown, FilePlus2, FolderSearch } from "lucide-react";

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

  // Scroll progress over roughly the first viewport, shared with the WebGL
  // scene as a mutable ref (read per frame, never re-renders React) and
  // applied to the content as a parallax lift + fade. One passive listener,
  // one rAF — and none of it under prefers-reduced-motion.
  const scrollProgress = useRef(0);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const span = Math.max(1, window.innerHeight * 0.9);
      const s = Math.min(1, window.scrollY / span);
      scrollProgress.current = s;
      const node = contentRef.current;
      if (node) {
        node.style.transform = `translate3d(0, ${(-56 * s).toFixed(1)}px, 0)`;
        node.style.opacity = (1 - 0.9 * s).toFixed(3);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const heroStats: HeroStat[] = [
    { value: casesDocumented, label: t("home.hero.stats.casesDocumented"), href: "/search?type=case" },
    {
      value: totalBigo,
      label: t("home.hero.stats.totalBigo"),
      href: "/search?type=case",
      highlight: true,
    },
    { value: materials, label: t("home.hero.stats.materials"), href: "/materials" },
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
      className="relative isolate -mt-[76px] overflow-hidden bg-primary pt-[76px]"
    >
      {/* ── The stage: backdrop + centered content, one viewport tall ── */}
      <div className="relative">
        <HeroStage scrollRef={scrollProgress} />

        <div
          ref={contentRef}
          className="layout-container relative flex min-h-[calc(100svh-76px)] flex-col items-center justify-center pb-24 pt-8 text-center will-change-transform"
        >
          <p className="font-eyebrow font-eyebrow-display max-w-full text-[hsl(var(--accent-on-dark))]">
            <em>{t("home.hero.eyebrow")}</em>
          </p>

          <h1 className="font-home-hero-title mx-auto mt-5 text-primary-foreground">
            {t("home.hero.titlePrefix")}{" "}
            <span className="italic text-[hsl(var(--accent-on-dark))]">
              {t("home.hero.titleHighlight")}
            </span>{" "}
            {t("home.hero.titleSuffix")}
          </h1>

          <p className="font-home-hero-lede measure-intro mx-auto mt-5 text-primary-foreground/75">
            {t("home.hero.description")}
          </p>

          {/* The central action: one large search pill. Light on the navy
              stage so it is unmistakably *the* control on the page. */}
          <form className="mt-8 w-full max-w-2xl" onSubmit={submitArchiveSearch}>
            <label className="sr-only" htmlFor="hero-archive-search">
              {t("home.hero.searchLabel")}
            </label>

            <SearchBar
              id="hero-archive-search"
              inputClassName="h-14 rounded-full border-transparent bg-background text-base shadow-[0_24px_60px_-20px_hsl(var(--primary-foreground)/0.25)]"
              buttonClassName="h-11 w-11 bg-accent text-accent-foreground hover:bg-accent/90"
              onChange={(event) => setArchiveQuery(event.target.value)}
              placeholder={t("home.hero.searchPlaceholder")}
              submitLabel={t("home.hero.searchSubmit")}
              value={archiveQuery}
            />
          </form>

          {/* Secondary actions. Report keeps the crimson accent; Browse is a
              glass pill — the search bar above already serves the explorer. */}
          <div className="mt-6 flex w-full max-w-2xl flex-col justify-center gap-3 sm:w-auto sm:flex-row">
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

            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-primary-foreground/30 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/search?type=case">
                <FolderSearch className="h-5 w-5" aria-hidden="true" />
                {t("header.browseCases")}
              </Link>
            </Button>
          </div>

          <Link
            className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary-foreground/70 transition-colors hover:text-primary-foreground focus-visible:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60 focus-visible:ring-offset-4 focus-visible:ring-offset-primary"
            to="/data-quality"
          >
            <span className="relative after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100">
              {t("home.hero.coverageLink", "See what we cover")}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1"
            />
          </Link>
        </div>

        {/* Scroll cue — decorative; the stat band below the fold is the payoff. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-1.5 text-primary-foreground/50"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">
            {t("home.hero.scrollCue", "Scroll")}
          </span>
          <ChevronDown className="h-4 w-4 motion-safe:animate-bounce" />
        </div>
      </div>

      {/* ── Stat band: the archive in numbers, on the hero's bottom edge ── */}
      <HeroStatBand stats={heroStats} />
    </section>
  );
}

/** The full-bleed backdrop: crimson glow, the static (inverted, CSS-tilted)
 * map as the no-JS / no-WebGL / reduced-motion fallback, the WebGL particle
 * field over it, and a radial navy scrim that keeps the centered content
 * readable over both. Decorative throughout. */
function HeroStage({ scrollRef }: Readonly<{ scrollRef: { current: number } }>) {
  const [sceneReady, setSceneReady] = useState(false);

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {/* Crimson glow low on the stage — the one warm note on the navy field. */}
      <div className="absolute left-1/2 top-[64%] h-[55%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl" />

      {/* Static fallback map, perspective-tilted to match the stage pose.
          map-light.svg draws in dark ink, so it is inverted to read light on
          navy. It never unmounts — when the particle field is live it settles
          to a faint ghost that adds density under the points. */}
      <div
        className={cn(
          "absolute inset-x-[-6%] bottom-[-4%] top-[30%] [perspective:1100px] transition-opacity duration-1000",
          sceneReady ? "opacity-10" : "opacity-60",
        )}
      >
        <img
          src="/assets/map-light.svg"
          alt=""
          decoding="async"
          {...{ fetchpriority: "low" }}
          className="h-full w-full object-contain [filter:invert(1)_brightness(1.7)] [transform:rotateX(38deg)]"
        />
      </div>

      {/* WebGL particle field — full-bleed, stage pose, scroll-scrubbed.
          forceDark keeps the points light on the always-navy stage. */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-1000",
          sceneReady ? "opacity-100" : "opacity-0",
        )}
      >
        <HeroSceneGate
          mapSrc="/assets/map-light.svg"
          forceDark
          stage
          scrollRef={scrollRef}
          onReady={() => setSceneReady(true)}
        />
      </div>

      {/* Readability scrim — navy pooled behind the centered content. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_62%_52%_at_50%_42%,hsl(var(--primary)/0.9),hsl(var(--primary)/0.45)_55%,transparent_80%)]" />
    </div>
  );
}

function HeroStatBand({ stats }: Readonly<{ stats: HeroStat[] }>) {
  return (
    // No divider above: both the stage and this band are bg-primary, and the
    // map backdrop + numbers should read as one continuous surface — spacing
    // does the separating (PR #359 visual review, item 3).
    <div className="relative bg-primary">
      {/* max-w-4xl = 56rem = the hero title's measure (--font-home-hero-measure-md),
          so the band aligns with the headline column instead of spreading
          across the full layout container (item 4). */}
      <div className="layout-container">
        <div className="mx-auto grid w-full max-w-4xl grid-cols-2 gap-x-4 gap-y-7 pb-14 pt-6 md:grid-cols-4 md:pb-16 md:pt-8">
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

              {/* Sentence case, no letterspacing: uppercase+tracking got lost
                  under the figures and visibly split Devanagari matras in the
                  Nepali locale (PR #359 visual review, items 1-2). */}
              <p className="mt-1.5 text-sm font-semibold text-primary-foreground/75 transition-colors group-hover:text-primary-foreground/90">
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
