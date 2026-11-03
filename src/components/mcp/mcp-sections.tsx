// The sections of the /mcp product page, in reading order. Content follows the
// Jawafdehi MCP pilot flyer (November 2026): the problem, what the connector
// is, what the archive holds, two real answers, questions that work today,
// and the pilot. Setup lives in connect-panel.tsx.
import { ArrowUpRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { GrainTexture } from "@/components/brand-shaders/grain-texture";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

const CARD = "rounded-3xl border border-border/60 bg-surface";

function SectionHead({ title }: Readonly<{ title: string }>) {
  return (
    <Reveal>
      <h2 className="font-home-section-title text-primary">{title}</h2>
    </Reveal>
  );
}

export function McpOverview() {
  const { t } = useTranslation();
  const blocks = [
    { label: t("mcp.overview.problemLabel"), text: t("mcp.overview.problem"), point: t("mcp.overview.problemPoint") },
    { label: t("mcp.overview.whatLabel"), text: t("mcp.overview.what"), point: t("mcp.overview.whatPoint") },
  ];
  return (
    <section id="overview" className="pt-16 md:pt-24">
      <div className="layout-container grid gap-12 md:grid-cols-2 md:gap-16">
        {blocks.map((block, index) => (
          <Reveal key={block.label} delayMs={index * 80}>
            <Eyebrow className="mb-4 text-sm md:text-base">{block.label}</Eyebrow>
            <p className="text-lg leading-8 text-foreground/75 md:text-xl md:leading-9">
              {block.text} <span className="text-foreground">{block.point}</span>
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

type Stat = { value: string; label: string };

export function McpInside() {
  const { t } = useTranslation();
  const stats = t("mcp.inside.stats", { returnObjects: true }) as Stat[];
  if (!Array.isArray(stats)) return null;
  // One grid, one size: the money alleged (the second figure) is the only
  // one set apart, by colour alone.
  return (
    <section id="inside" className="pt-16 md:pt-24">
      <div className="layout-container">
        <SectionHead title={t("mcp.inside.title")} />

        <ul className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <li key={stat.label}>
              <Reveal delayMs={(index % 4) * 60}>
                <p className={cn("font-home-display text-2xl tabular-nums md:text-3xl", index === 1 ? "text-accent" : "text-primary")}>
                  {stat.value}
                </p>
                <p className="mt-2 text-base leading-6 text-foreground/65">{stat.label}</p>
              </Reveal>
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}

/** Set to the hosted file (e.g. on s3.jawafdehi.org) once the MCP demo video
 * is recorded; until then the demo section does not render. */
const MCP_DEMO_VIDEO: { src: string; poster: string } | null = null;

export function McpDemo() {
  const { t } = useTranslation();
  if (!MCP_DEMO_VIDEO) return null;
  return (
    <section id="demo" className="pt-16 md:pt-24">
      <div className="layout-container">
        <SectionHead title={t("mcp.demo.title")} />
        <Reveal>
          <video
            className="mt-10 aspect-video w-full rounded-3xl border border-border/60 bg-primary-surface shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)]"
            src={MCP_DEMO_VIDEO.src}
            poster={MCP_DEMO_VIDEO.poster}
            controls
            playsInline
            preload="none"
            aria-label={t("mcp.demo.label")}
          />
        </Reveal>
      </div>
    </section>
  );
}

type Question = { question: string; answer: string };

export function McpQuestions() {
  const { t } = useTranslation();
  const items = t("mcp.questions.items", { returnObjects: true }) as Question[];
  return (
    <section id="questions" className="pt-16 md:pt-24">
      <div className="layout-container">
        <SectionHead title={t("mcp.questions.title")} />
        <ul className="mt-10 grid gap-6 md:grid-cols-2">
          {Array.isArray(items) &&
            items.map((item, index) => (
              <li key={item.question}>
                <Reveal className="h-full" delayMs={(index % 2) * 80}>
                  <article className={`${CARD} h-full p-6 md:p-7`}>
                    <h3 className="font-home-display text-xl leading-snug text-primary md:text-2xl">“{item.question}”</h3>
                    <p className="mt-4 text-lg leading-8 text-foreground/70">{item.answer}</p>
                  </article>
                </Reveal>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}

export function McpPilot() {
  const { t } = useTranslation();
  const steps = t("mcp.pilot.steps", { returnObjects: true }) as string[];
  // The flyer's four lines are two promises: what the pilot gives (free
  // access, a setup call) and what it asks back (real use, honest feedback).
  const groups = Array.isArray(steps)
    ? [
        { label: t("mcp.pilot.youGet"), items: steps.slice(0, 2) },
        { label: t("mcp.pilot.weAsk"), items: steps.slice(2) },
      ]
    : [];
  return (
    <section id="pilot" className="relative isolate mt-16 overflow-hidden bg-primary-surface py-16 text-primary-foreground md:mt-24 md:py-24">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <GrainTexture className="absolute inset-0 opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--primary-surface))_35%,hsl(var(--primary-surface)/0.6)_70%,transparent)]" />
      </div>
      <div className="layout-container grid grid-cols-1 gap-12 md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] md:gap-16">
        {/* No button: joining means writing an email, so the address itself
            is the call to action. */}
        <Reveal>
          <h2 className="font-home-section-title text-[hsl(var(--accent-on-dark))]">{t("mcp.pilot.title")}</h2>
          <p className="mt-4 max-w-md text-lg leading-8 text-primary-foreground/80 md:text-xl md:leading-9">
            {t("mcp.pilot.tagline")} {t("mcp.pilot.body")}
          </p>
          <p className="mt-10 text-sm text-primary-foreground/60 md:text-base">{t("mcp.pilot.join")}</p>
          <a
            href="mailto:inquiry@jawafdehi.org"
            className="font-home-display mt-2 inline-flex items-center gap-3 rounded text-2xl text-primary-foreground underline decoration-primary-foreground/30 underline-offset-[6px] transition-colors hover:decoration-[hsl(var(--accent-on-dark))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60 md:text-3xl"
          >
            inquiry@jawafdehi.org
            <ArrowUpRight aria-hidden="true" className="h-6 w-6 shrink-0 text-[hsl(var(--accent-on-dark))]" />
          </a>
          <p className="mt-3 text-base text-primary-foreground/60">{t("mcp.pilot.contactName")}</p>
        </Reveal>
        {/* Stretched to the left column's height with the two groups pushed
            apart, so both columns start and end on the same lines. */}
        <div className="flex flex-col gap-10 md:justify-between">
          {groups.map((group, index) => (
            <Reveal key={group.label} delayMs={index * 80}>
              <h3 className="text-sm text-primary-foreground/60 md:text-base">{group.label}</h3>
              <ul className="mt-4 space-y-3">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-lg leading-7 md:text-xl md:leading-8">
                    <Check aria-hidden="true" className="mt-1.5 h-4 w-4 shrink-0 text-[hsl(var(--accent-on-dark))]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
