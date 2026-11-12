// The archive in three panels, under the hero: what is in it (the one navy
// panel), how a case is followed from charge sheet to verdict, and the MCP
// that brings it into an AI assistant. Each panel shows its idea with a small
// piece of interface rather than a paragraph.
import { FileText, Gavel, Landmark } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ArrowLink } from "@/components/ui/arrow-link";
import { Panel, PanelLabel } from "@/components/ui/panel";
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

        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {/* What is in it: the featured navy panel. */}
          <Reveal className="h-full">
            <Panel tone="dark" className="h-full min-h-[440px]">
              <PanelLabel onDark>{t("home.bento.archive.label")}</PanelLabel>
              <h3 className={PANEL_TITLE}>{t("home.bento.archive.title")}</h3>
              {Array.isArray(chips) ? (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {chips.map((chip, i) => (
                    <li
                      key={chip}
                      className={
                        i === chips.length - 1
                          ? "rounded-full border border-primary-foreground/30 px-3.5 py-1 text-sm text-primary-foreground/70"
                          : "rounded-full bg-surface px-3.5 py-1 text-sm text-primary"
                      }
                    >
                      {chip}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-auto pt-10 font-home-display text-5xl tabular-nums">
                {casesDocumented}
                <span className="ml-3 font-sans text-lg text-primary-foreground/60">{t("home.bento.archive.casesLabel")}</span>
              </p>
              <ArrowLink to="/search?type=case" tone="light" className="mt-6 w-full">
                {t("home.bento.archive.cta")}
              </ArrowLink>
            </Panel>
          </Reveal>

          {/* How a case is followed: a small flow on a dotted grid. */}
          <Reveal className="h-full" delayMs={80}>
            <Panel className="h-full min-h-[440px]">
              <PanelLabel>{t("home.bento.follow.label")}</PanelLabel>
              <h3 className={`${PANEL_TITLE} text-primary`}>{t("home.bento.follow.title")}</h3>
              <div
                aria-hidden="true"
                className="relative mt-6 flex-1 rounded-2xl bg-[radial-gradient(hsl(var(--border))_1.2px,transparent_1.2px)] [background-size:16px_16px]"
              >
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
                      <span className="relative flex items-center gap-2.5 rounded-xl bg-surface px-3.5 py-2.5 text-sm text-primary">
                        <Icon className={i === 2 ? "h-4 w-4 text-accent" : "h-4 w-4 text-muted-foreground"} />
                        {label}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="mt-6 text-base leading-7 text-muted-foreground">{t("home.bento.follow.body")}</p>
            </Panel>
          </Reveal>

          {/* The MCP: a two-line exchange. */}
          <Reveal className="h-full" delayMs={160}>
            <Panel className="h-full min-h-[440px]">
              <PanelLabel>{t("home.bento.ask.label")}</PanelLabel>
              <h3 className={`${PANEL_TITLE} text-primary`}>{t("home.bento.ask.title")}</h3>
              <div aria-hidden="true" className="mt-6 flex flex-1 flex-col justify-center gap-3">
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary-surface px-4 py-3 text-sm leading-6 text-primary-foreground">
                  {t("home.bento.ask.question")}
                </p>
                <p className="max-w-[90%] rounded-2xl rounded-bl-md bg-surface px-4 py-3 text-sm leading-6 text-foreground">
                  {t("home.bento.ask.answer")}
                </p>
              </div>
              <ArrowLink to="/mcp" className="mt-6 w-full">
                {t("home.bento.ask.cta")}
              </ArrowLink>
            </Panel>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
