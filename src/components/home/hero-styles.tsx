// DEV ONLY: alternative homepage heroes, compared through the hero switch
// (?hero=redaction|wall|files|numbers; see Hero in hero.tsx). Every style keeps
// the brand's navy, crimson and white, the same headline, line and archive
// search; only the staging changes. Loaded lazily and only in development.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { CaseTypeBadge } from "@/components/CaseBadge";
import { HeroSearchTypeahead } from "@/components/home/hero-search-typeahead";
import { caseCardPropsFromSearchResult } from "@/lib/case-card-props";
import { setHeroTone } from "@/lib/hero-tone";
import { cn } from "@/lib/utils";
import { featuredCasesQuery } from "@/queries/home";
import { getStatistics } from "@/services/jds-api";
import { formatBigo } from "@/utils/number";

export type HeroStyle = "redaction" | "wall" | "files" | "numbers";

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

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
function Search({ light = false }: Readonly<{ light?: boolean }>) {
  return (
    <div
      className={cn(
        "w-full max-w-xl [&_form]:mx-0",
        light && "[&_input]:!border-border [&_input]:!shadow-[0_12px_32px_-16px_hsl(var(--primary)/0.25)]",
      )}
    >
      <HeroSearchTypeahead />
    </div>
  );
}

// --- 1. Redaction ---------------------------------------------------------
// Navy stage. Each word of the headline arrives under a crimson bar that
// slides off it, one word after another, like a document being declassified;
// the background carries faint redaction rules of a page of record.
function RedactionHero() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(reduced);
  useEffect(() => {
    if (reduced) return;
    const id = window.setTimeout(() => setRevealed(true), 250);
    return () => window.clearTimeout(id);
  }, [reduced]);
  const words = t("home.hero.title").split(" ");

  return (
    <section className="relative isolate -mt-[76px] overflow-hidden bg-primary-surface pt-[76px]">
      {/* A page of record, mostly blacked out: rows of bars, fading off left. */}
      <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 flex-col justify-center gap-4 px-12 [mask-image:linear-gradient(to_left,#000_30%,transparent)] lg:flex">
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <span className="h-3 rounded-sm bg-white/[0.06]" style={{ width: `${18 + ((i * 37) % 30)}%` }} />
            <span className="h-3 rounded-sm bg-white/[0.12]" style={{ width: `${22 + ((i * 53) % 35)}%` }} />
            {i % 3 === 0 ? <span className="h-3 w-[14%] rounded-sm bg-[hsl(var(--accent-on-dark))]/40" /> : null}
          </div>
        ))}
      </div>
      <div className="layout-container flex min-h-[calc(100svh-76px)] flex-col justify-center py-14">
        <p className="font-eyebrow text-sm tracking-[0.06em] text-[hsl(var(--accent-on-dark))] md:text-base">{t("home.hero.eyebrow")}</p>
        <h1 className="font-home-display mt-5 max-w-[16ch] text-[clamp(2.6rem,6vw,5.25rem)] text-primary-foreground [:root[lang=ne]_&]:max-w-[22ch]">
          {words.map((word, i) => (
            <span key={`${word}-${i}`} className="relative mr-[0.25em] inline-block">
              {word}
              <span
                aria-hidden="true"
                className="absolute inset-x-[-0.06em] inset-y-[0.12em] origin-right bg-accent"
                style={{
                  transform: revealed ? "scaleX(0)" : "scaleX(1)",
                  transition: `transform 560ms ${EASE_OUT} ${120 + i * 70}ms`,
                }}
              />
            </span>
          ))}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-primary-foreground/75">{t("home.hero.description")}</p>
        <div className="flex">
          <Search />
        </div>
      </div>
    </section>
  );
}

// --- 2. Archive wall ------------------------------------------------------
// Navy stage. Behind the words, columns of real case titles drift slowly
// upward (the record, still growing), faint and fading at top and bottom; the
// copy sits on a solid navy shoulder on the left.
function WallHero() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const cases = useFeaturedCases();
  const titles = cases.length ? cases.map((c) => c.title) : Array.from({ length: 7 }, () => "…");
  const columns = [0, 1, 2].map((col) => [...titles.slice(col), ...titles.slice(0, col)]);

  return (
    <section className="relative isolate -mt-[76px] overflow-hidden bg-primary-surface pt-[76px]">
      <style>{`@keyframes hero-drift { from { transform: translateY(0) } to { transform: translateY(-50%) } }`}</style>
      <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 grid w-full grid-cols-3 gap-4 px-6 opacity-25 [mask-image:linear-gradient(to_bottom,transparent,#000_20%,#000_80%,transparent)] lg:w-[56%] lg:opacity-100">
        {columns.map((column, col) => (
          <div key={col} className="overflow-hidden">
            <div
              className="flex flex-col gap-3"
              style={reduced ? undefined : ({ animation: `hero-drift ${70 + col * 18}s linear infinite` } as CSSProperties)}
            >
              {[...column, ...column].map((title, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <span className={cn("mb-2 block h-1.5 w-8 rounded-full", i % 3 === 0 ? "bg-accent/70" : "bg-white/20")} />
                  <p className="line-clamp-3 text-sm leading-6 text-primary-foreground/55">{title}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-y-0 left-0 -z-10 w-full bg-[linear-gradient(to_right,hsl(var(--primary-surface))_72%,hsl(var(--primary-surface)/0.6)_86%,transparent)] lg:w-[62%]" aria-hidden="true" />
      {/* Plain navy under the transparent navbar, so its links never sit on a card. */}
      <div className="absolute inset-x-0 top-0 -z-10 h-44 bg-[linear-gradient(to_bottom,hsl(var(--primary-surface))_50%,transparent)]" aria-hidden="true" />
      <div className="layout-container flex min-h-[calc(100svh-76px)] flex-col justify-center py-14">
        <div className="max-w-2xl">
          <p className="font-eyebrow text-sm tracking-[0.06em] text-[hsl(var(--accent-on-dark))] md:text-base">{t("home.hero.eyebrow")}</p>
          <h1 className="font-home-display mt-5 text-[clamp(2.4rem,5vw,4.5rem)] text-primary-foreground">{t("home.hero.title")}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-primary-foreground/75">{t("home.hero.description")}</p>
          <div className="flex">
            <Search />
          </div>
        </div>
      </div>
    </section>
  );
}

// --- 3. Case files ---------------------------------------------------------
// White stage. The words on the left; on the right three real cases fanned out
// as file cards, each with a crimson type stamp and its amount, the front one
// on navy. They lift apart on hover.
function FilesHero() {
  const { t } = useTranslation();
  const cases = useFeaturedCases().slice(0, 3);
  // A deck: the two behind are offset upward, a little smaller and turned,
  // so each shows its top edge; on hover the deck fans out sideways.
  const deck = [
    { rest: "translate(-3%, -34%) scale(0.9) rotate(-4deg)", fan: "translate(-30%, -16%) scale(0.9) rotate(-9deg)" },
    { rest: "translate(3%, -17%) scale(0.95) rotate(2.5deg)", fan: "translate(24%, -20%) scale(0.94) rotate(6deg)" },
    { rest: "none", fan: "translate(0, 6%)" },
  ];
  const [fanned, setFanned] = useState(false);

  return (
    <section className="relative isolate overflow-hidden bg-background">
      <div className="layout-container grid min-h-[calc(100svh-76px)] items-center gap-12 py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <p className="font-eyebrow text-sm tracking-[0.06em] text-accent md:text-base">{t("home.hero.eyebrow")}</p>
          <h1 className="font-home-display mt-5 text-[clamp(2.4rem,5vw,4.5rem)] text-primary">{t("home.hero.title")}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">{t("home.hero.description")}</p>
          <Search light />
        </div>
        <div
          className="relative mx-auto hidden aspect-[4/3.4] w-full max-w-[30rem] lg:block"
          onPointerEnter={() => setFanned(true)}
          onPointerLeave={() => setFanned(false)}
        >
          {cases.map((c, i) => {
            const front = i === cases.length - 1;
            return (
              <div
                key={c.id}
                className={cn(
                  "absolute inset-x-6 top-[22%] rounded-[24px] border p-7 shadow-[0_24px_48px_-24px_hsl(var(--primary)/0.35)] transition-transform duration-500 motion-reduce:transition-none",
                  front ? "border-primary-surface bg-primary-surface text-primary-foreground" : "border-border/70 bg-surface text-primary",
                )}
                style={{ transform: fanned ? deck[i].fan : deck[i].rest, transitionTimingFunction: EASE_OUT }}
              >
                <div className="flex items-center gap-2">
                  <CaseTypeBadge caseType="CORRUPTION" className={cn("px-3 py-1 text-sm", front && "border-transparent bg-accent text-accent-foreground")}>
                    {t("cases.type.corruption", "Corruption")}
                  </CaseTypeBadge>
                  {c.tags[0] ? (
                    <span className={cn("truncate rounded-full px-3 py-1 text-sm", front ? "bg-white/10 text-primary-foreground/80" : "bg-muted text-primary")}>
                      {c.tags[0]}
                    </span>
                  ) : null}
                </div>
                <p className={cn("mt-5 line-clamp-3 text-xl leading-snug", front ? "text-primary-foreground" : "text-primary")}>{c.title}</p>
                {c.bigo ? (
                  <p className={cn("mt-6 text-2xl font-medium tabular-nums", front ? "text-[hsl(var(--accent-on-dark))]" : "text-accent")}>
                    {formatBigo(c.bigo)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// --- 4. The numbers ---------------------------------------------------------
// Split stage: the words and search on white at the left; on the right a navy
// panel of the archive's live figures, counting up once when they arrive.
function CountUp({ value, format }: Readonly<{ value?: number; format: (v: number) => string }>) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value ?? 0 : 0);
  const raf = useRef<number>();
  useEffect(() => {
    if (value == null) return;
    if (reduced) return setShown(value);
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
      <div className="grid min-h-[calc(100svh-76px)] lg:grid-cols-2">
        <div className="flex flex-col justify-center px-4 py-16 sm:px-8 lg:pl-[max(2rem,calc((100vw-1400px)/2+2rem))] lg:pr-16">
          <p className="font-eyebrow text-sm tracking-[0.06em] text-accent md:text-base">{t("home.hero.eyebrow")}</p>
          <h1 className="font-home-display mt-5 text-[clamp(2.4rem,4.6vw,4.25rem)] text-primary">{t("home.hero.title")}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">{t("home.hero.description")}</p>
          <Search light />
        </div>
        <div className="flex flex-col justify-center bg-primary-surface px-6 py-16 sm:px-12 lg:pr-[max(2rem,calc((100vw-1400px)/2+2rem))]">
          <dl className="divide-y divide-white/10">
            {rows.map((row) => (
              <div key={row.label} className="py-6 first:pt-0 last:pb-0">
                <dt className="text-[15px] text-primary-foreground/60">{row.label}</dt>
                <dd className={cn("font-home-display mt-2 text-[clamp(2.25rem,4vw,3.5rem)] tabular-nums", row.accent ? "text-[hsl(var(--accent-on-dark))]" : "text-primary-foreground")}>
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

const STYLES: Record<HeroStyle, () => JSX.Element> = {
  redaction: RedactionHero,
  wall: WallHero,
  files: FilesHero,
  numbers: NumbersHero,
};

const LIGHT: ReadonlySet<HeroStyle> = new Set(["files", "numbers"]);

export default function HeroStyleSwitch({ style }: Readonly<{ style: HeroStyle }>) {
  // Light stages tell the navbar, so its at-rest text is navy, not white.
  useEffect(() => {
    setHeroTone(LIGHT.has(style) ? "light" : "dark");
    return () => setHeroTone("dark");
  }, [style]);
  const Style = STYLES[style];
  return <Style />;
}
