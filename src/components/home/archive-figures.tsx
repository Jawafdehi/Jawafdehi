// The archive in four figures, in a section of their own directly under the
// hero (they used to sit inside it). Each figure links to the part of the
// archive it counts; the money figure carries the accent. Values come from
// Index.tsx, which fetches /api/statistics.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AnimatedCount } from "@/components/ui/animated-count";
import { cn } from "@/lib/utils";

type ArchiveFiguresProps = {
  casesDocumented: string;
  totalBigo: string;
  materials: string;
  courtCasesTracked: string;
};

type Figure = {
  label: string;
  value: string;
  href: string;
  /** The one figure that carries the accent — public money implicated. */
  highlight?: boolean;
};

export function ArchiveFigures(props: Readonly<ArchiveFiguresProps>) {
  const { t } = useTranslation();
  const stats: Figure[] = [
    { value: props.casesDocumented, label: t("home.hero.stats.casesDocumented"), href: "/search?type=case" },
    { value: props.totalBigo, label: t("home.hero.stats.totalBigo"), href: "/search?type=case", highlight: true },
    { value: props.materials, label: t("home.hero.stats.materials"), href: "/materials" },
    { value: props.courtCasesTracked, label: t("home.hero.stats.courtCasesTracked"), href: "/search?type=courtcase" },
  ];

  return (
    <section id="archive-figures" aria-label={t("home.figures.label")} className="pt-16 md:pt-24">
    <div className="layout-container grid grid-cols-2 gap-x-10 gap-y-10 xl:grid-cols-4">
      {stats.map(({ value, label, href, highlight }) => (
        <Link
          key={label}
          to={href}
          className="group block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 "
        >
          <p
            className={cn(
              "font-home-display text-2xl leading-tight tabular-nums sm:text-3xl xl:text-4xl",
              highlight ? "text-accent" : "text-primary",
            )}
          >
            <FigureValue value={value} />
          </p>
          {/* Sentence case, no letterspacing: uppercase+tracking split
              Devanagari matras in the Nepali locale (PR #359 review). */}
          <p className="mt-2 text-lg text-foreground/70 transition-colors group-hover:text-foreground">
            {label}
          </p>
        </Link>
      ))}
    </div>
    </section>
  );
}

function FigureValue({ value }: Readonly<{ value: string }>) {
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
