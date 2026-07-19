import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { REPORT, CITATIONS } from "@/data/research-corruption";
import { AccountabilityFunnel, type FunnelStage } from "@/components/data-quality/AccountabilityFunnel";
import { StatusDonut, type DonutSegment } from "@/components/data-quality/StatusDonut";
import { BreakdownBar } from "@/components/data-quality/BreakdownBar";
import { ConvictionByCharge, type ChargeRow } from "@/components/research/ConvictionByCharge";
import { JusticeSpread } from "@/components/research/JusticeSpread";
import { FiledDecidedTrend } from "@/components/research/FiledDecidedTrend";

const CANONICAL = "https://jawafdehi.org/research/corruption-accountability";

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">{children}</p>
);

const SectionHeading = ({ children }: { children: ReactNode }) => (
  <h2 className="font-display text-[1.7rem] font-bold leading-tight tracking-tight text-foreground md:text-[2.25rem]">
    {children}
  </h2>
);

const ResearchCorruption = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ne") ? "ne" : "en";

  const o = REPORT.outcome;
  const decidedClean = o.convicted + o.partial + o.acquitted;
  const convPct = Math.round((o.convicted / decidedClean) * 100);
  const acqPct = Math.round((o.acquitted / decidedClean) * 100);
  const partPct = Math.round((o.partial / decidedClean) * 100);
  const lessThanFull = acqPct + partPct;
  const courtAvgConv = (o.convicted / decidedClean) * 100;

  // Funnel — uniform accent hue; the shrinking widths + "% of complaints" tell it.
  const funnelStages: FunnelStage[] = REPORT.funnel.map((s) => ({
    key: s.key,
    label: t(
      `research.corruption.funnel.stage.${s.key}`,
      (
        {
          complaints: "Complaints to the CIAA",
          filed: "Prosecutions filed",
          convicted: "Full convictions (est.)",
        } as Record<string, string>
      )[s.key],
    ),
    count: s.count,
    color: "hsl(var(--accent))",
  }));

  const outcomeSegments: DonutSegment[] = [
    { key: "convicted", label: t("research.corruption.outcome.convicted", "Convicted"), value: o.convicted, color: "hsl(var(--primary))" },
    { key: "partial", label: t("research.corruption.outcome.partial", "Partial"), value: o.partial, color: "hsl(var(--alert))" },
    { key: "acquitted", label: t("research.corruption.outcome.acquitted", "Acquitted"), value: o.acquitted, color: "hsl(var(--accent))" },
  ];

  const chargeRows: ChargeRow[] = REPORT.byCharge.map((c) => ({
    label: lang === "ne" ? c.ne : c.en,
    sublabel: lang === "ne" ? c.en : c.ne,
    convicted: c.convicted,
    partial: c.partial,
    acquitted: c.acquitted,
  }));

  const mixItems = REPORT.mix.map((m) => ({ label: lang === "ne" ? m.ne : m.en, count: m.count }));

  const gapKeys = ["intake", "charging", "adjudication", "appeal", "recovery"] as const;
  const gapDark = new Set(["appeal", "recovery"]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{t("research.corruption.meta.title", "Where Nepal's corruption accountability leaks")} · Jawafdehi</title>
        <meta name="description" content={t("research.corruption.meta.description", "A quantitative read of CIAA corruption prosecutions at Nepal's Special Court — conviction rates, the charge types that stick, and where accountability is lost.")} />
        <link rel="canonical" href={CANONICAL} />
      </Helmet>

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="border-b bg-muted/20">
          <div className="container mx-auto px-6 py-12 md:py-16">
            <Eyebrow>{t("research.corruption.hero.eyebrow", "Research · Corruption Accountability")}</Eyebrow>
            <h1 className="max-w-3xl font-display text-[2rem] font-bold leading-tight tracking-tight text-foreground md:text-5xl">
              {t("research.corruption.hero.title", "Where Nepal's corruption accountability actually leaks")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              {t("research.corruption.hero.lead", "How many complaints become cases, how those cases resolve, and which charges the system convicts — drawn from court records ingested from Nepal's judiciary and the CIAA's own annual reports. Every figure links to the record behind it.")}
            </p>
            <p className="mt-4 text-sm italic text-muted-foreground/80">
              {t("research.corruption.hero.snapshot", "Snapshot as of BS {{bs}}. Court records collected from Nepal's Special Court and wider judiciary.", { bs: REPORT.snapshotBs })}
            </p>
          </div>
        </section>

        <div className="container mx-auto max-w-4xl space-y-16 px-6 py-14">
          {/* 1 · Funnel */}
          <section>
            <Eyebrow>{t("research.corruption.funnel.eyebrow", "The funnel")}</Eyebrow>
            <SectionHeading>{t("research.corruption.funnel.heading", "About 0.2% of complaints end in a full conviction")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.funnel.lead", "In a single year the CIAA received roughly 37,000 complaints and filed about 137 prosecutions. Apply the measured full-conviction rate and only a few dozen end in a full conviction.")}
            </p>
            <div className="mt-8">
              <AccountabilityFunnel
                stages={funnelStages}
                denominator={REPORT.ciaa.complaintsYear}
                isLoading={false}
                ofLabel={(pct) => t("research.corruption.funnel.ofComplaints", "{{pct}}% of complaints", { pct })}
              />
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              {t("research.corruption.funnel.caption", "Complaint and prosecution counts: CIAA 35th annual report (FY 2081/82). The conviction stage applies this archive's measured 46% full-conviction rate to the filed count.")}{" "}
              <a href={CITATIONS.ciaa35} className="text-accent hover:underline">{t("research.corruption.cite.ciaa35", "CIAA 35th annual report")}</a>
            </p>
          </section>

          {/* 2 · Outcomes */}
          <section>
            <Eyebrow>{t("research.corruption.outcomes.eyebrow", "Outcomes")}</Eyebrow>
            <SectionHeading>{t("research.corruption.outcomes.heading", "Fewer than half of decided prosecutions end in a clean conviction")}</SectionHeading>
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-12">
              <StatusDonut
                segments={outcomeSegments}
                centerValue={decidedClean.toLocaleString()}
                centerLabel={t("research.corruption.outcomes.donutCenter", "decided")}
              />
              <div>
                <p className="text-lg leading-8 text-foreground/80">
                  {t("research.corruption.outcomes.lead", "Of {{n}} decided prosecutions with a clear verdict, {{conv}}% end in a full conviction, {{acq}}% in outright acquittal, and {{part}}% in partial conviction — so {{less}}% end in something less than a clean conviction.", { n: decidedClean.toLocaleString(), conv: convPct, acq: acqPct, part: partPct, less: lessThanFull })}
                </p>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {t("research.corruption.outcomes.note", "The CIAA reports a higher “success” rate because it counts partial convictions as successes; we keep full and partial separate. Case-grain dispositions from the Special Court record.")}{" "}
                  <Link to="/courtcases" className="text-accent hover:underline">{t("research.corruption.cite.courtRecords", "Browse the court records")}</Link>
                </p>
              </div>
            </div>
          </section>

          {/* 3 · Conviction by charge */}
          <section>
            <Eyebrow>{t("research.corruption.byCharge.eyebrow", "What actually sticks")}</Eyebrow>
            <SectionHeading>{t("research.corruption.byCharge.heading", "Conviction depends overwhelmingly on what was charged")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.byCharge.lead", "Fake-credential cases convict at 88% and make up nearly half of all convictions. The signature financial-graft charges — bribery, embezzlement, illicit wealth — mostly fail, bottoming out at illegal benefit (4.6%).")}
            </p>
            <div className="mt-8">
              <ConvictionByCharge
                rows={chargeRows}
                avgPct={courtAvgConv}
                seriesLabels={{
                  convicted: t("research.corruption.outcome.convicted", "Convicted"),
                  partial: t("research.corruption.outcome.partial", "Partial"),
                  acquitted: t("research.corruption.outcome.acquitted", "Acquitted"),
                }}
                avgLabel={t("research.corruption.byCharge.avgLine", "46% court average")}
              />
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              {t("research.corruption.byCharge.caption", "Decided cases per charge type, split by outcome. Cited to the underlying charge sheets and court records.")}{" "}
              <a href={CITATIONS.chargeSheets} className="text-accent hover:underline">{t("research.corruption.cite.chargeSheets", "Charge sheets")}</a>
            </p>
          </section>

          {/* 4 · Per-justice */}
          <section>
            <Eyebrow>{t("research.corruption.justice.eyebrow", "Which bench you draw")}</Eyebrow>
            <SectionHeading>{t("research.corruption.justice.heading", "Full-conviction rates run from 85% to 25% across the court's judges")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.justice.lead", "Bench-grain attribution — every panel member is credited with the panel's outcome, dot size scaled to caseload. Sitting on the same court, hearing the same prosecutor, benches diverge threefold. Descriptive, not causal.")}
            </p>
            <div className="mt-8">
              <JusticeSpread
                justices={REPORT.justices}
                avgPct={courtAvgConv}
                bandLabels={{
                  high: t("research.corruption.justice.bandHigh", "Convicts more (>55%)"),
                  mid: t("research.corruption.justice.bandMid", "Near average"),
                  low: t("research.corruption.justice.bandLow", "Acquits more (<37%)"),
                }}
                avgLabel={t("research.corruption.justice.avgLine", "court avg 46%")}
              />
            </div>
          </section>

          {/* 5 · Trends + mix */}
          <section>
            <Eyebrow>{t("research.corruption.volume.eyebrow", "Volume")}</Eyebrow>
            <SectionHeading>{t("research.corruption.volume.heading", "What flows through the court, and what gets charged")}</SectionHeading>
            <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-8">
              <div>
                <h3 className="text-base font-semibold text-foreground">{t("research.corruption.volume.trendTitle", "Cases filed vs. decided, by year")}</h3>
                <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("research.corruption.volume.trendSub", "Bikram Sambat year. The filing peak (2076) precedes the verdict peak (2080) by ~4 years.")}</p>
                <FiledDecidedTrend
                  years={REPORT.trend.years}
                  filed={REPORT.trend.filed}
                  decided={REPORT.trend.decided}
                  filedLabel={t("research.corruption.volume.filed", "Filed")}
                  decidedLabel={t("research.corruption.volume.decided", "Decided")}
                />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{t("research.corruption.volume.mixTitle", "The charge mix")}</h3>
                <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("research.corruption.volume.mixSub", "Substantive prosecutions by offense family (petitions excluded).")}</p>
                <BreakdownBar items={mixItems} tooltipLabel={t("research.corruption.volume.mixTooltip", "Prosecutions")} labelWidth={150} />
              </div>
            </div>
          </section>

          {/* 6 · Gaps */}
          <section>
            <Eyebrow>{t("research.corruption.gaps.eyebrow", "Where the gap is")}</Eyebrow>
            <SectionHeading>{t("research.corruption.gaps.heading", "Attrition concentrates at the CIAA stage — then goes dark")}</SectionHeading>
            <div className="mt-8 space-y-3">
              {gapKeys.map((k, i) => (
                <div
                  key={k}
                  className={`rounded-xl border border-border bg-card p-5 shadow-sm ${gapDark.has(k) ? "border-l-4 border-l-muted-foreground" : "border-l-4 border-l-accent"}`}
                >
                  <h3 className="text-base font-semibold text-foreground">
                    {i + 1} · {t(`research.corruption.gaps.${k}.title`, {
                      intake: "Intake & screening (CIAA)",
                      charging: "Charging strategy (CIAA)",
                      adjudication: "Adjudication (Special Court)",
                      appeal: "Appeal (Supreme Court) — dark",
                      recovery: "Recovery & sanction — dark",
                    }[k] as string)}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {t(`research.corruption.gaps.${k}.body`, {
                      intake: "~37,000 complaints a year produce ~137 prosecutions (≈0.4%); most complaints are shelved internally with no public verdict. The single biggest, least-visible leak.",
                      charging: "49% of convictions are easy documentary fake-certificate cases; core financial corruption converts at ~31%, with the signature charges collapsing. The system convicts paperwork, not plunder.",
                      adjudication: "38% outright acquittal, 54% less-than-full-conviction, and a threefold spread across benches. Year-to-year the rate swung 88% → 33%, partly on one 2078 apex-court ruling.",
                      appeal: "The CIAA appeals many losses and defendants appeal convictions, but appellate outcomes carry no decision data in the record. How often a verdict is overturned is currently unmeasurable.",
                      recovery: "Billions in damages are claimed each year, but no source tracks how much is ever recovered, or whether the convicted serve meaningful sanction.",
                    }[k] as string)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 7 · Appendix */}
          <section>
            <details className="rounded-xl border border-border bg-muted/20 p-5">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                {t("research.corruption.appendix.summary", "Methodology, discrepancies & sources")}
              </summary>
              <div className="mt-4 space-y-3 text-xs leading-5 text-muted-foreground">
                <p>{t("research.corruption.appendix.corpus", "Corpus. Of ~12,600 Special Court records, most are procedural petitions. We isolate CIAA prosecutions as cases filed in the name of the Government of Nepal (~3,278), of which ~2,850 are substantive corruption charges after removing petitions, money-laundering (a separate agency), and unclassified matters.")}</p>
                <p>{t("research.corruption.appendix.outcomes", "Outcomes. Verdicts are coded per hearing as convicted / acquitted / partial; each case is taken at its terminal deciding hearing. The conviction rate is over the ~92% of decided cases carrying an unambiguous disposition (2,835 of 3,069).")}</p>
                <p>{t("research.corruption.appendix.dates", "Dates. Verdict dates are parsed from the case status text; filings from the registration date. Bikram Sambat throughout.")}</p>
                <p>{t("research.corruption.appendix.justice", "Per-justice. Attribution is bench-grain: every member of a panel is credited with the panel's outcome, so this describes the benches a justice sat on, not that justice's individual effect. It is descriptive, and small differences are noise.")}</p>
                <p>{t("research.corruption.appendix.discrepancy", "Discrepancy with CIAA figures. The CIAA reports a ~53% “success” rate; that counts full + partial convictions together, and is fiscal-year, whereas our full-conviction rate (46%) is cumulative and separates the two. CIAA's “cases filed” per fiscal year also differ from our Bikram-Sambat-year filing counts because of year binning, case-versus-defendant counting, and record timing. Never compare the two without aligning definition and period.")}</p>
                <p>{t("research.corruption.appendix.entity", "Identity. Only ~3% of listed defendants (607 of 19,222) are resolved to a canonical, cross-referenced identity, so office-level and repeat-offender cuts are deferred as low-confidence.")}</p>
                <p>{t("research.corruption.appendix.limits", "Limits. These are the records in the archive as of the snapshot date; appellate outcomes are largely absent, and amount-recovered is untracked anywhere.")}</p>
              </div>
            </details>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-foreground">{t("research.corruption.sources.heading", "Sources — all in-platform")}</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li><a href={CITATIONS.ciaaReports} className="text-accent hover:underline">{t("research.corruption.sources.ciaaReports", "CIAA annual reports (complaints, prosecutions filed, amounts claimed)")}</a></li>
                <li><a href={CITATIONS.ciaaPressReleases} className="text-accent hover:underline">{t("research.corruption.sources.pressReleases", "CIAA charge-sheet announcements")}</a></li>
                <li><a href={CITATIONS.chargeSheets} className="text-accent hover:underline">{t("research.corruption.sources.chargeSheets", "Charge sheets (abhiyog patra)")}</a></li>
                <li><Link to="/courtcases" className="text-accent hover:underline">{t("research.corruption.sources.courtRecords", "Special Court records (outcomes, charge types, verdict dates)")}</Link></li>
                <li><Link to="/data-quality" className="text-accent hover:underline">{t("research.corruption.sources.dataQuality", "Live coverage counts")}</Link></li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ResearchCorruption;
