import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CountUp from "react-countup";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

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
};

type HeroMapImage = {
  src: string;
  className: string;
};

const heroMapImages: HeroMapImage[] = [
  {
    src: "/assets/map-light.svg",
    className: "block dark:hidden",
  },
  {
    src: "/assets/map.svg",
    className: "hidden dark:block",
  },
];

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
    { value: totalBigo, label: t("home.hero.stats.totalBigo"), href: "/search?type=case" },
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
      <HeroBackdrop images={heroMapImages} />

      <div className="layout-container relative z-10 flex min-h-[72svh] flex-col items-start justify-center py-14 text-left sm:items-center sm:py-16 sm:text-center md:min-h-[74svh] md:py-20 lg:min-h-[76svh] lg:py-24">
        <p className="font-eyebrow font-eyebrow-display max-w-full">
          <em>{t("home.hero.eyebrow")}</em>
        </p>

        <h1 className="font-home-hero-title mt-5">
          {t("home.hero.titlePrefix")} <span className="text-accent">{t("home.hero.titleHighlight")}</span>{" "}
          {t("home.hero.titleSuffix")}
        </h1>

        <p className="font-home-hero-lede measure-intro mt-6">
          {t("home.hero.description")}
        </p>

        <form
          className="mt-8 w-full max-w-[min(100%,42rem)] md:max-w-4xl"
          onSubmit={submitArchiveSearch}
        >
          <label className="sr-only" htmlFor="hero-archive-search">
            {t("home.hero.searchLabel")}
          </label>

          <SearchBar
            id="hero-archive-search"
            inputClassName="bg-background/95 shadow-lg shadow-primary/5"
            onChange={(event) => setArchiveQuery(event.target.value)}
            placeholder={t("home.hero.searchPlaceholder")}
            submitLabel={t("home.hero.searchSubmit")}
            value={archiveQuery}
          />
        </form>

        <HeroStats stats={heroStats} />

        <Link
          className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
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
    </section>
  );
}

function HeroStats({ stats }: Readonly<{ stats: HeroStat[] }>) {
  return (
    <div className="mt-10 grid w-full max-w-[min(100%,42rem)] grid-cols-2 gap-3 sm:gap-4 md:max-w-3xl md:grid-cols-4">
      {stats.map(({ value, label, href }, index) => {
        const content = (
          <>
            <p className="font-stat-value tabular-nums transition-colors group-hover:text-primary">
              <HeroStatValue value={value} />
            </p>

            <p className="font-stat-label mt-2 transition-colors group-hover:text-foreground">
              {label}
            </p>
          </>
        );

        return (
          <div
            key={label}
            className={cn(
              "min-w-0 text-left",
              "sm:text-center",
              index > 0 && "md:border-l md:border-border/70 md:pl-3",
            )}
          >
            {href ? (
              <Link
                to={href}
                className="group block h-full rounded-lg border border-transparent bg-background/45 px-3 py-3 shadow-sm shadow-transparent transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-background/85 hover:text-accent hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {content}
              </Link>
            ) : (
              <div className="px-3 py-3">{content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HeroStatValue({ value }: Readonly<{ value: string }>) {
  const normalizedValue = value.replace(/,/g, "");
  const numericValue = Number(normalizedValue);

  if (!Number.isFinite(numericValue) || normalizedValue.trim() === "") {
    return <>{value}</>;
  }

  return <CountUp end={numericValue} duration={0.9} separator="," />;
}

function HeroBackdrop({ images }: Readonly<{ images: HeroMapImage[] }>) {
  return (
    <>
      {/* Mobile: subtle red wash, no Nepal map */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 md:hidden"
      >
        <div className="absolute inset-0 bg-background" />

        <div className="absolute inset-0 bg-[linear-gradient(115deg,hsl(var(--background))_0%,hsl(var(--background))_46%,hsl(var(--accent)/0.105)_100%)]" />

        <div className="absolute right-[-20%] top-[-14%] h-[470px] w-[370px] rounded-full bg-accent/10 blur-[112px]" />

        <div className="absolute right-[-34%] top-[18%] h-[380px] w-[320px] rounded-full bg-accent/8 blur-[100px]" />
      </div>

      {/* Desktop/tablet: warm glow behind map */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[18%] z-0 hidden h-[440px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_64%_46%,hsl(var(--accent)/0.28),hsl(var(--accent)/0.15)_30%,hsl(var(--primary)/0.08)_52%,transparent_76%)] opacity-70 blur-3xl md:block lg:h-[540px] lg:w-[1120px] lg:opacity-75 dark:opacity-40"
      />

      {/* Desktop/tablet only: responsive Nepal map */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[48%] z-0 hidden h-[500px] w-[min(1280px,112vw)] -translate-x-1/2 -translate-y-1/2 -rotate-[8deg] opacity-[0.30] md:block lg:h-[620px] lg:w-[min(1680px,118vw)] lg:opacity-[0.34] xl:h-[660px] xl:w-[min(1780px,120vw)] dark:opacity-[0.20]"
      >
        {images.map(({ src, className }) => (
          <img
            key={src}
            src={src}
            alt=""
            className={cn(
              className,
              "absolute inset-0 h-full w-full max-w-none object-contain saturate-[1.18] contrast-[1.03] mix-blend-multiply dark:mix-blend-screen",
            )}
          />
        ))}
      </div>

      {/* Desktop/tablet readability wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 hidden bg-[radial-gradient(ellipse_at_50%_46%,hsl(var(--background)/0.86)_0%,hsl(var(--background)/0.70)_30%,hsl(var(--background)/0.38)_56%,transparent_84%)] md:block lg:bg-[radial-gradient(ellipse_at_50%_46%,hsl(var(--background)/0.84)_0%,hsl(var(--background)/0.66)_30%,hsl(var(--background)/0.34)_56%,transparent_84%)]"
      />
    </>
  );
}
