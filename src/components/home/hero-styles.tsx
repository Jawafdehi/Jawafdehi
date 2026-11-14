// DEV ONLY: alternative homepage heroes, compared through the hero switch
// (?hero=record|numbers|seal|register|search; see Hero in hero.tsx). Every
// style keeps the brand's navy, crimson and white, the same headline, line and
// archive search; only the staging changes. Loaded lazily, in development only.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { HeroSearchTypeahead } from "@/components/home/hero-search-typeahead";
import { caseCardPropsFromSearchResult } from "@/lib/case-card-props";
import { setHeroTone } from "@/lib/hero-tone";
import { cn } from "@/lib/utils";
import { featuredCasesQuery } from "@/queries/home";
import { getStatistics } from "@/services/jds-api";
import { formatBigo } from "@/utils/number";

export type HeroStyle = "record" | "numbers" | "seal" | "register" | "search";

function useReducedMotion() {
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  return reduced;
}

/** The featured cases the page already loads (same query key, so no refetch). */
function useFeaturedCases() {
  const { i18n } = useTranslation();
  const { data } = useQuery({ ...featuredCasesQuery(), staleTime: 5 * 60 * 1000 });
  return useMemo(
    () => (data?.results ?? []).map((result) => caseCardPropsFromSearchResult(result, i18n.language)),
    [data, i18n.language],
  );
}

function useStats() {
  const { data } = useQuery({ queryKey: ["statistics"], queryFn: getStatistics, staleTime: 5 * 60 * 1000 });
  return data;
}

// The archive search. On a white stage its field gets a hairline and a soft
// shadow; it was styled for navy, where white on navy needs neither.
function Search({ light = false, className }: Readonly<{ light?: boolean; className?: string }>) {
  return (
    <div
      className={cn(
        "w-full max-w-xl [&_form]:mx-0",
        light && "[&_input]:!border-border [&_input]:!shadow-[0_12px_32px_-16px_hsl(var(--primary)/0.25)]",
        className,
      )}
    >
      <HeroSearchTypeahead />
    </div>
  );
}

function Eyebrow({ onDark = false }: Readonly<{ onDark?: boolean }>) {
  const { t } = useTranslation();
  return (
    <p className={cn("font-eyebrow text-sm tracking-[0.06em] md:text-base", onDark ? "text-[hsl(var(--accent-on-dark))]" : "text-accent")}>
      {t("home.hero.eyebrow")}
    </p>
  );
}

/**
 * A page of record, mostly blacked out: rows of redaction bars, a few in
 * crimson. Shared by Record (on navy) and The numbers (inside its card).
 */
function RecordLines({ rows = 14, onDark = true, className }: Readonly<{ rows?: number; onDark?: boolean; className?: string }>) {
  return (
    <div aria-hidden="true" className={cn("flex flex-col justify-center gap-4", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3">
          <span className={cn("h-3 rounded-sm", onDark ? "bg-white/[0.06]" : "bg-primary/[0.06]")} style={{ width: `${18 + ((i * 37) % 30)}%` }} />
          <span className={cn("h-3 rounded-sm", onDark ? "bg-white/[0.12]" : "bg-primary/[0.1]")} style={{ width: `${22 + ((i * 53) % 35)}%` }} />
          {i % 3 === 0 ? <span className="h-3 w-[14%] rounded-sm bg-[hsl(var(--accent-on-dark))]/40" /> : null}
        </div>
      ))}
    </div>
  );
}

// --- Record ---------------------------------------------------------------
// Navy stage, the words on the left, and on the right a page of record with
// its lines blacked out. (The Redaction style without the bars over the words.)
function RecordHero() {
  const { t } = useTranslation();
  return (
    <section className="relative isolate -mt-[76px] overflow-hidden bg-primary-surface pt-[76px]">
      <RecordLines className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 px-12 [mask-image:linear-gradient(to_left,#000_30%,transparent)] lg:flex" />
      <div className="layout-container flex min-h-[calc(100svh-76px)] flex-col justify-center py-14">
        <Eyebrow onDark />
        <h1 className="font-home-display mt-5 max-w-[16ch] text-[clamp(2.6rem,6vw,5.25rem)] text-primary-foreground [:root[lang=ne]_&]:max-w-[22ch]">
          {t("home.hero.title")}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-primary-foreground/75">{t("home.hero.description")}</p>
        <Search />
      </div>
    </section>
  );
}

// --- The numbers ------------------------------------------------------------
// White stage: the words and search on the left; on the right, inside the page
// margins, a rounded navy card of the archive's live figures (counting up
// once) over the faint record lines. It used to be a full-bleed half that ran
// to the window's edge with nothing leading into it.
function CountUp({ value, format }: Readonly<{ value?: number; format: (v: number) => string }>) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value ?? 0 : 0);
  const raf = useRef<number>();
  useEffect(() => {
    if (value == null) return;
    if (reduced) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1200);
      setShown(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [value, reduced]);
  return <>{value == null ? "—" : format(shown)}</>;
}

function NumbersHero() {
  const { t } = useTranslation();
  const stats = useStats();
  const rows = [
    { label: t("home.hero.stats.casesDocumented"), value: stats?.published_cases, format: (v: number) => v.toLocaleString() },
    { label: t("home.hero.stats.totalBigo"), value: stats?.total_bigo, format: formatBigo, accent: true },
    { label: t("home.hero.stats.courtCasesTracked"), value: stats?.ngm?.court_cases_total, format: (v: number) => v.toLocaleString() },
    { label: t("home.hero.stats.materials"), value: stats?.materials?.total, format: (v: number) => v.toLocaleString() },
  ];
  return (
    <section className="relative isolate overflow-hidden bg-background">
      <div className="layout-container grid min-h-[calc(100svh-76px)] items-center gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16">
        <div>
          <Eyebrow />
          <h1 className="font-home-display mt-5 text-[clamp(2.4rem,4.6vw,4.25rem)] text-primary">{t("home.hero.title")}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">{t("home.hero.description")}</p>
          <Search light />
        </div>
        <div className="relative isolate overflow-hidden rounded-[28px] bg-primary-surface p-8 md:p-10">
          <RecordLines rows={12} className="absolute inset-y-0 right-0 -z-10 w-1/2 px-6 opacity-40 [mask-image:linear-gradient(to_left,#000_20%,transparent_95%)]" />
          <dl className="divide-y divide-white/10">
            {rows.map((row) => (
              <div key={row.label} className="py-5 first:pt-0 last:pb-0">
                <dt className="text-[15px] text-primary-foreground/60">{row.label}</dt>
                <dd className={cn("font-home-display mt-1.5 text-[clamp(2rem,3.4vw,3rem)] tabular-nums", row.accent ? "text-[hsl(var(--accent-on-dark))]" : "text-primary-foreground")}>
                  <CountUp value={row.value} format={row.format} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

// --- Seal -------------------------------------------------------------------
// Navy stage. On the right a large round seal in crimson: the motto running
// around its rim (turning very slowly), the wordmark at its centre, like the
// seal that certifies a record. Still under reduced motion.
function SealHero() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const rim = `${t("home.hero.eyebrow").replace(/\.$/, "")} · जवाफदेही · `;
  return (
    <section className="relative isolate -mt-[76px] overflow-hidden bg-primary-surface pt-[76px]">
      <style>{`@keyframes hero-seal { to { transform: rotate(360deg) } }`}</style>
      <div className="layout-container grid min-h-[calc(100svh-76px)] items-center gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div>
          <Eyebrow onDark />
          <h1 className="font-home-display mt-5 text-[clamp(2.5rem,5.4vw,4.75rem)] text-primary-foreground">{t("home.hero.title")}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-primary-foreground/75">{t("home.hero.description")}</p>
          <Search />
        </div>
        <div aria-hidden="true" className="relative mx-auto hidden aspect-square w-full max-w-[26rem] lg:block">
          <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" style={reduced ? undefined : { animation: "hero-seal 90s linear infinite" }}>
            <defs>
              <path id="seal-rim" d="M200,200 m-150,0 a150,150 0 1,1 300,0 a150,150 0 1,1 -300,0" />
            </defs>
            <text className="fill-[hsl(var(--accent-on-dark))]" style={{ fontSize: 19, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              <textPath href="#seal-rim" textLength="930">{rim.repeat(2)}</textPath>
            </text>
          </svg>
          <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
            <circle cx="200" cy="200" r="186" fill="none" stroke="hsl(var(--accent-on-dark))" strokeOpacity="0.55" strokeWidth="2" />
            <circle cx="200" cy="200" r="122" fill="none" stroke="hsl(var(--accent-on-dark))" strokeOpacity="0.55" strokeWidth="2" />
            <circle cx="200" cy="200" r="114" fill="hsl(var(--accent))" />
          </svg>
          <img src="/assets/logo-dark.svg" alt="" className="absolute left-1/2 top-1/2 w-[36%] -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    </section>
  );
}

// --- Register ---------------------------------------------------------------
// White ruled paper with a crimson margin rule, like a court register. The
// words on the left; on the right the register itself, real cases entered one
// per ruled line: number, name, amount, in tabular figures.
function caseNumberOf(title: string): string | null {
  return title.match(/\((\d{3}-[A-Z]{2}-\d{4})\)/)?.[1] ?? null;
}

function RegisterHero() {
  const { t } = useTranslation();
  const cases = useFeaturedCases().slice(0, 7);
  const ruled = {
    backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 47px, hsl(var(--border)) 47px, hsl(var(--border)) 48px)",
  };
  return (
    <section className="relative isolate overflow-hidden bg-background">
      <div aria-hidden="true" className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,transparent,#000_15%,#000_85%,transparent)]" style={ruled} />
      <div className="layout-container relative grid min-h-[calc(100svh-76px)] items-center gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
        {/* The register's margin: one crimson rule down the page. */}
        <span aria-hidden="true" className="absolute inset-y-0 left-4 w-px bg-accent/50 sm:left-6 md:left-8" />
        <div className="pl-4 sm:pl-6">
          <Eyebrow />
          <h1 className="font-home-display mt-5 text-[clamp(2.4rem,5vw,4.5rem)] text-primary">{t("home.hero.title")}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">{t("home.hero.description")}</p>
          <Search light />
        </div>
        <ol className="hidden rounded-[24px] border border-border/70 bg-surface/90 p-2 shadow-[0_24px_48px_-28px_hsl(var(--primary)/0.3)] backdrop-blur-sm lg:block">
          {cases.map((c, i) => (
            <li key={c.id}>
              <Link
                to={c.slug ? `/case/${c.slug}` : "/search?type=case"}
                className="grid min-h-12 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-muted"
              >
                <span className="text-sm tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] text-primary">{c.title.replace(/\s*\(\d{3}-[A-Z]{2}-\d{4}\)\s*$/, "")}</span>
                  {caseNumberOf(c.title) ? <span className="block text-[13px] tabular-nums text-muted-foreground">{caseNumberOf(c.title)}</span> : null}
                </span>
                <span className="text-[15px] font-medium tabular-nums text-accent">{c.bigo ? formatBigo(c.bigo) : "—"}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// --- Search first -----------------------------------------------------------
// White. The search is the hero: the headline above it at a smaller size,
// the field large and centred, and a few real searches as pills under it.
const EXAMPLE_SEARCHES = ["Ncell", "TERAMOCS", "Budhigandaki", "Lalita Niwas", "Sunil Paudel"];

function SearchFirstHero() {
  const { t } = useTranslation();
  return (
    <section className="relative isolate overflow-hidden bg-background">
      <div className="layout-container flex min-h-[calc(100svh-76px)] flex-col items-center justify-center py-14 text-center">
        <Eyebrow />
        <h1 className="font-home-display mt-5 max-w-[20ch] text-[clamp(2.2rem,4.4vw,3.75rem)] text-primary">{t("home.hero.title")}</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">{t("home.hero.description")}</p>
        <Search light className="max-w-2xl [&_form]:mx-auto [&_form]:max-w-2xl [&_input]:!h-16 [&_input]:!text-lg" />
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[15px] text-muted-foreground">{t("home.hero.try", "Try")}</span>
          {EXAMPLE_SEARCHES.map((q) => (
            <Link
              key={q}
              to={`/search?q=${encodeURIComponent(q)}`}
              className="inline-flex h-9 items-center rounded-full bg-muted px-4 text-[15px] text-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.08] active:scale-[0.97]"
            >
              {q}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const STYLES: Record<HeroStyle, () => JSX.Element> = {
  record: RecordHero,
  numbers: NumbersHero,
  seal: SealHero,
  register: RegisterHero,
  search: SearchFirstHero,
};

const LIGHT: ReadonlySet<HeroStyle> = new Set(["numbers", "register", "search"]);

export default function HeroStyleSwitch({ style }: Readonly<{ style: HeroStyle }>) {
  // Light stages tell the navbar, so its at-rest text is navy, not white.
  useEffect(() => {
    setHeroTone(LIGHT.has(style) ? "light" : "dark");
    return () => setHeroTone("dark");
  }, [style]);
  const Style = STYLES[style];
  return <Style />;
}
