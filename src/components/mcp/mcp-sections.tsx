// The sections of the /mcp product page, in reading order. Content follows the
// Jawafdehi MCP pilot flyer (November 2026): the problem, what the connector
// is, what the archive holds, two real answers, questions that work today,
// and the pilot. Setup lives in connect-panel.tsx.
import { useTranslation } from "react-i18next";

import { GrainTexture } from "@/components/brand-shaders/grain-texture";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

const CARD = "rounded-3xl border border-border/60 bg-surface shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)]";

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
  // The first two figures are the archive's headline (cases, and the money
  // alleged in them) and stand on their own on the left; the six collections
  // behind them sit in a quieter grid on the right.
  const [cases, amount, ...sources] = stats;

  return (
    <section id="inside" className="pt-16 md:pt-24">
      <div className="layout-container">
        <SectionHead title={t("mcp.inside.title")} />

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div className="space-y-8">
            {[cases, amount].map((stat, index) => (
              <Reveal key={stat.label} delayMs={index * 80}>
                <p className={cn("font-home-display text-4xl tabular-nums md:text-5xl", index === 1 ? "text-accent" : "text-primary")}>
                  {stat.value}
                </p>
                <p className="mt-2 text-lg text-foreground/70">{stat.label}</p>
              </Reveal>
            ))}
          </div>

          <ul className="grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-3">
            {sources.map((stat, index) => (
              <li key={stat.label}>
                <Reveal delayMs={(index % 3) * 60}>
                  <p className="font-home-display text-2xl tabular-nums text-primary">{stat.value}</p>
                  <p className="mt-1.5 text-base leading-6 text-foreground/65">{stat.label}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">{t("mcp.inside.updated")}</p>
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
  return (
    <section id="pilot" className="relative isolate mt-16 overflow-hidden bg-primary-surface py-16 text-primary-foreground md:mt-24 md:py-24">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <GrainTexture className="absolute inset-0 opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--primary-surface))_35%,hsl(var(--primary-surface)/0.6)_70%,transparent)]" />
      </div>
      <div className="layout-container grid gap-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16">
        <Reveal>
          <p className="font-eyebrow font-eyebrow-display text-sm text-[hsl(var(--accent-on-dark))]">{t("mcp.pilot.eyebrow")}</p>
          <h2 className="font-home-section-title mt-4">{t("mcp.pilot.title")}</h2>
          <p className="mt-4 max-w-md text-lg leading-8 text-primary-foreground/80">{t("mcp.pilot.body")}</p>
        </Reveal>
        <div>
          <ol className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {Array.isArray(steps) &&
              steps.map((step, index) => (
                <li key={step} className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-foreground"
                  >
                    {index + 1}
                  </span>
                  <p className="pt-0.5 text-lg leading-7 text-primary-foreground/90">{step}</p>
                </li>
              ))}
          </ol>
          <p className="mt-10 text-lg text-primary-foreground/80">
            {t("mcp.pilot.join")}{" "}
            <a
              href="mailto:inquiry@jawafdehi.org"
              className="rounded text-[hsl(var(--accent-on-dark))] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
            >
              inquiry@jawafdehi.org
            </a>
          </p>
          <p className="mt-2 text-base text-primary-foreground/60">{t("mcp.pilot.contactName")}</p>
        </div>
      </div>
    </section>
  );
}
