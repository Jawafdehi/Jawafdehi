// The archive in three panels, under the hero: the MCP that brings it into an
// AI assistant (the one navy panel), what is in it, and how a case is followed
// from charge sheet to verdict. Each panel shows its idea with a small
// piece of interface rather than a paragraph.
import { FileText, Gavel, Landmark } from "@/components/icons";
import { useTranslation } from "react-i18next";

import { ArrowLink } from "@/components/ui/arrow-link";
import { PanelLabel } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { SplitHeading } from "@/components/ui/split-heading";

const PANEL_TITLE = "mt-2 font-home-display text-2xl leading-[1.15] md:text-[1.75rem]";

export function ArchiveBento({ casesDocumented }: Readonly<{ casesDocumented: string }>) {
  const { t } = useTranslation();
  const chips = t("home.bento.archive.chips", { returnObjects: true }) as string[];
  const steps = [
    { Icon: FileText, label: t("home.bento.follow.steps.chargeSheet") },
    { Icon: Gavel, label: t("home.bento.follow.steps.specialCourt") },
    { Icon: Landmark, label: t("home.bento.follow.steps.supremeCourt") },
  ];

  return (
    <section aria-labelledby="archive-bento-title" className="pt-16 md:pt-24">
      <div className="layout-container">
        <Reveal>
          <SplitHeading id="archive-bento-title" lead={t("home.bento.titleLead")} rest={t("home.bento.titleRest")} />
        </Reveal>

        {/* Three panels, no borders, three different surfaces: the MCP on a
            softened navy (the one highlight), the archive on grey, the case
            flow on a dotted field. */}
        {/* Three across only from xl: at lg (1024px) three columns left each
            panel ~300px and the archive's chips, count and the case flow all
            wrapped. Below xl the MCP spans the row and the other two pair up. */}
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {/* The MCP: the featured panel. The navy is lifted toward its top
              corner, so it reads as depth rather than a flat dark block. */}
          <Reveal className="h-full md:col-span-2 xl:col-span-1">
            <div className="flex h-full min-h-[360px] flex-col rounded-[28px] bg-primary-surface xl:min-h-[440px] bg-[radial-gradient(120%_90%_at_100%_0%,hsl(214_42%_30%)_0%,hsl(var(--primary-surface))_60%)] p-7 text-primary-foreground">
              <PanelLabel onDark>{t("home.bento.ask.label")}</PanelLabel>
              <h3 className={PANEL_TITLE}>{t("home.bento.ask.title")}</h3>
              <div aria-hidden="true" className="mt-6 flex flex-1 flex-col justify-center gap-3">
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-surface px-4 py-3 text-sm leading-6 text-primary">
                  {t("home.bento.ask.question")}
                </p>
                <p className="max-w-[90%] rounded-2xl rounded-bl-md bg-primary-foreground/10 px-4 py-3 text-sm leading-6 text-primary-foreground/90">
                  {t("home.bento.ask.answer")}
                </p>
              </div>
              <ArrowLink to="/mcp" tone="light" className="mt-6 w-full">
                {t("home.bento.ask.cta")}
              </ArrowLink>
            </div>
          </Reveal>

          {/* What is in it: grey, the count and the way in. */}
          <Reveal className="h-full" delayMs={80}>
            <div className="flex h-full min-h-[440px] flex-col rounded-[28px] bg-muted p-7">
              <PanelLabel>{t("home.bento.archive.label")}</PanelLabel>
              <h3 className={`${PANEL_TITLE} text-primary`}>{t("home.bento.archive.title")}</h3>
              {Array.isArray(chips) ? (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {chips.map((chip, i) => (
                    <li
                      key={chip}
                      className={
                        i === chips.length - 1
                          ? "rounded-full px-1 py-1 text-sm text-muted-foreground"
                          : "rounded-full bg-surface px-3.5 py-1 text-sm text-primary"
                      }
                    >
                      {chip}
                    </li>
                  ))}
                </ul>
              ) : null}
              {/* The label keeps body tracking (the display face's -0.035em ran
                  "corruption cases" together) and wraps as one unit. */}
              <p className="mt-auto flex flex-wrap items-baseline gap-x-3 pt-10 font-home-display text-5xl tabular-nums text-primary">
                {casesDocumented}
                <span className="whitespace-nowrap font-sans text-lg tracking-normal text-muted-foreground">
                  {t("home.bento.archive.casesLabel")}
                </span>
              </p>
              <ArrowLink to="/search" className="mt-6 w-full">
                {t("home.bento.archive.cta")}
              </ArrowLink>
            </div>
          </Reveal>

          {/* How a case is followed: the flow on a dotted field that fills the
              whole panel, so it has shape without a border or a fill. */}
          <Reveal className="h-full" delayMs={160}>
            <div className="flex h-full min-h-[440px] flex-col rounded-[28px] bg-muted/40 bg-[radial-gradient(hsl(var(--border))_1.2px,transparent_1.2px)] p-7 [background-size:16px_16px]">
              <PanelLabel>{t("home.bento.follow.label")}</PanelLabel>
              <h3 className={`${PANEL_TITLE} text-primary`}>{t("home.bento.follow.title")}</h3>
              <div aria-hidden="true" className="relative mt-6 flex-1">
                {/* Each step sits a step further in; a thin elbow joins it to
                    the one before. Sizes are in container units of the list. */}
                <ol className="relative flex h-full flex-col justify-center gap-5 py-4 [container-type:inline-size]">
                  {steps.map(({ Icon, label }, i) => (
                    <li key={label} className="relative flex items-center" style={{ marginLeft: `${i * 16}cqw` }}>
                      {i > 0 ? (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1/2 rounded-bl-lg border-b-2 border-l-2 border-border"
                          style={{ left: "calc(-16cqw + 18px)", width: "calc(16cqw - 18px)", height: "calc(100% + 1.25rem)" }}
                        />
                      ) : null}
                      {/* z-10: each elbow belongs to the step after it and is
                          painted later, so without this it ran across the chip
                          above. The chips sit over every line. */}
                      <span className="relative z-10 flex items-center gap-2.5 rounded-xl bg-surface px-3.5 py-2.5 text-sm text-primary shadow-[0_1px_2px_rgba(14,31,59,0.06)]">
                        <Icon className={i === 2 ? "h-4 w-4 text-accent" : "h-4 w-4 text-muted-foreground"} />
                        {label}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="mt-6 text-base leading-7 text-muted-foreground">{t("home.bento.follow.body")}</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
