import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CountUp from "react-countup";

import { SearchBar } from "@/components/ui/search-bar";
import { cn } from "@/lib/utils";

type HeroProps = {
  casesDocumented: string;
  officialsAndEntitiesTracked: string;
  courtRecords: string;
  materials: string;
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

const heroCopy = {
  eyebrow: "Accountability has no expiry.",
  titlePrefix: "Nepal's Permanent",
  titleHighlight: "Corruption Case",
  titleSuffix: "Archive",
  description:
    "Search Nepal's public accountability archive in one place. Find corruption cases, tracked people and offices, updates, and Jawafdehi resources.",
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
  officialsAndEntitiesTracked,
  courtRecords,
  materials,
}: Readonly<HeroProps>) {
  const navigate = useNavigate();
  const [archiveQuery, setArchiveQuery] = useState("");

  // All four stats link to the Data Quality dashboard, which explains what each
  // dataset tracks and how complete it is.
  const heroStats: HeroStat[] = [
    { value: casesDocumented, label: "Cases documented", href: "/data-quality" },
    {
      value: officialsAndEntitiesTracked,
      label: "Officials & entities tracked",
      href: "/data-quality",
    },
    { value: courtRecords, label: "Court records", href: "/data-quality" },
    { value: materials, label: "Materials", href: "/data-quality" },
  ];

  const goToSearch = (query: string) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      navigate("/search");
      return;
    }

    const params = new URLSearchParams({ q: trimmedQuery });
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

      <div className="container relative z-10 mx-auto flex min-h-[72svh] flex-col items-start justify-center px-6 py-14 text-left sm:px-8 sm:py-16 md:min-h-[74svh] md:items-center md:px-6 md:py-20 md:text-center lg:min-h-[76svh] lg:py-24">
        <p className="max-w-full text-[clamp(0.68rem,1.8vw,0.75rem)] font-bold uppercase tracking-[0.26em] text-accent sm:tracking-[0.28em]">
          <em>{heroCopy.eyebrow}</em>
        </p>

        <h1 className="mt-5 max-w-[min(100%,9.6em)] text-[clamp(2.35rem,10.6vw,3.55rem)] font-extrabold leading-[0.96] tracking-[-0.045em] text-primary sm:max-w-[min(100%,10.8em)] sm:text-[clamp(3rem,8vw,4rem)] md:max-w-4xl md:text-6xl md:leading-[1.02] lg:text-6xl">
  {heroCopy.titlePrefix}{" "}
  <span className="text-accent">{heroCopy.titleHighlight}</span>{" "}
  {heroCopy.titleSuffix}
</h1>

        <p className="mt-6 max-w-[min(100%,34rem)] text-[clamp(0.95rem,2.8vw,1.05rem)] leading-8 text-muted-foreground md:max-w-2xl md:text-lg">
          {heroCopy.description}
        </p>

        <form
          className="mt-8 w-full max-w-[min(100%,42rem)] md:max-w-4xl"
          onSubmit={submitArchiveSearch}
        >
          <label className="sr-only" htmlFor="hero-archive-search">
            Search the Jawafdehi archive
          </label>

          <SearchBar
            id="hero-archive-search"
            inputClassName="bg-background/95 shadow-lg shadow-primary/5"
            onChange={(event) => setArchiveQuery(event.target.value)}
            placeholder="Search cases, people, offices, locations, or allegations"
            submitLabel="Search Jawafdehi"
            value={archiveQuery}
          />
        </form>

        <HeroStats stats={heroStats} />
      </div>
    </section>
  );
}

function HeroStats({ stats }: Readonly<{ stats: HeroStat[] }>) {
  return (
    <div className="mt-10 grid w-full max-w-[min(100%,42rem)] grid-cols-2 gap-4 sm:gap-5 md:max-w-3xl md:grid-cols-4 md:gap-0">
      {stats.map(({ value, label, href }, index) => {
        const content = (
          <>
            <p className="text-[clamp(1.35rem,5vw,1.75rem)] font-extrabold leading-none text-primary tabular-nums md:text-3xl">
              <HeroStatValue value={value} />
            </p>

            <p className="mt-2 text-[clamp(0.72rem,2.6vw,0.9rem)] leading-5 text-muted-foreground">
              {label}
            </p>
          </>
        );

        return (
          <div
            key={label}
            className={cn(
              "min-w-0 text-left",
              "md:px-6 md:text-center",
              index > 0 && "md:border-l md:border-border",
            )}
          >
            {href ? (
              <Link
                to={href}
                className="group block rounded-md transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {content}
              </Link>
            ) : (
              content
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
