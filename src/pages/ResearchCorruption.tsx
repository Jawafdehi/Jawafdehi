import { useMemo, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";

import { REPORT, CITATIONS, verdictYearRates, fyLabel } from "@/data/research-corruption";
import { AccountabilityFunnel, type FunnelStage } from "@/components/data-quality/AccountabilityFunnel";
import { StatusDonut, type DonutSegment } from "@/components/data-quality/StatusDonut";
import { BreakdownBar } from "@/components/data-quality/BreakdownBar";
import { ConvictionByCharge, type ChargeRow } from "@/components/research/ConvictionByCharge";
import { JusticeSpread } from "@/components/research/JusticeSpread";
import { FiledDecidedTrend } from "@/components/research/FiledDecidedTrend";
import { RateTrend } from "@/components/research/RateTrend";
import { PipelineHealth } from "@/components/research/PipelineHealth";
import { ChargeMixByYear } from "@/components/research/ChargeMixByYear";
import { FiledByMonth } from "@/components/research/FiledByMonth";

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
  // English-only for now: the Nepali copy on this page is an unreviewed first pass, so
  // force the report body + every chart label to English regardless of the global
  // EN/NE toggle, via a translator fixed to 'en'. `tGlobal` stays bound to the user's
  // language so the one courtesy notice below can still speak Nepali.
  // Re-enable Nepali = restore `const { t } = useTranslation()` and set
  // `const lang = i18n.language?.startsWith("ne") ? "ne" : "en"`.
  const { t: tGlobal, i18n } = useTranslation();
  const t = useMemo(() => i18n.getFixedT("en"), [i18n]);
  // `as` rather than a plain annotation: a `const` with a literal initializer gets narrowed
  // to "en" by control-flow analysis, which makes every `lang === "ne"` below a type error.
  const lang = "en" as "en" | "ne";

  const o = REPORT.outcome;
  const decidedClean = o.convicted + o.partial + o.acquitted;
  const convPct = Math.round((o.convicted / decidedClean) * 100);
  const acqPct = Math.round((o.acquitted / decidedClean) * 100);
  const partPct = Math.round((o.partial / decidedClean) * 100);
  const lessThanFull = acqPct + partPct;
  const courtAvgConv = (o.convicted / decidedClean) * 100;

  // Funnel — uniform accent hue; the shrinking widths + "% of complaints" tell it.
  // Notes carry the "share of the previous stage" story the single denominator can't:
  // the big drop is intake screening, and the CIAA prosecutes ~1 in 7 of what it investigates.
  const funnelStageNote: Record<string, string> = {
    investigated: t("research.corruption.funnel.stage.investigatedNote", "only 3.3% go to a full investigation"),
    filed: t("research.corruption.funnel.stage.filedNote", "≈1 in 7 investigated are prosecuted"),
    convicted: t("research.corruption.funnel.stage.convictedNote", "≈45% of prosecutions convict"),
  };
  const funnelStages: FunnelStage[] = REPORT.funnel.map((s) => ({
    key: s.key,
    label: t(
      `research.corruption.funnel.stage.${s.key}`,
      (
        {
          complaints: "Complaints to the CIAA",
          investigated: "Complaints fully investigated",
          filed: "Prosecutions filed",
          convicted: "Full convictions (est.)",
        } as Record<string, string>
      )[s.key],
    ),
    count: s.count,
    color: "hsl(var(--accent))",
    note: funnelStageNote[s.key],
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

  // --- Cross-check: the CIAA's own reports against the court's register ---
  // `FiledDecidedTrend` is reused here as a generic two-series-by-fiscal-year line chart;
  // its `filed`/`decided` prop names are historical, the labels are what the reader sees.
  const cc = REPORT.crossCheck;
  const agreementYears = REPORT.sourceAgreement.map((r) => r.fy);
  const agreementCiaa = REPORT.sourceAgreement.map((r) => r.ciaaFiled);
  const agreementRegister = REPORT.sourceAgreement.map((r) => r.registerComparable);
  const agreementGapPct = ((cc.registerComparableTotal - cc.ciaaFiledTotal) / cc.ciaaFiledTotal) * 100;
  const maxYearGap = Math.max(...REPORT.sourceAgreement.map((r) => Math.abs(r.registerComparable - r.ciaaFiled)));
  const surplusItems = cc.surplusReasons.map((r) => ({ label: lang === "ne" ? r.ne : r.en, count: r.count }));

  // --- Over time: outcome-rate trend, decomposition, and pipeline pace/backlog ---
  const rates = verdictYearRates(REPORT.overTime.byVerdictYear);
  const outcomePoints = rates.map((r) => ({
    year: r.year,
    convPct: Math.round(r.convPct),
    acqPct: Math.round(r.acqPct),
    partPct: Math.round(r.partPct),
  }));
  const decompPoints = rates.map((r) => ({
    year: r.year,
    allConvPct: Math.round(r.convPct),
    coreConvPct: Math.round(r.coreConvPct),
  }));
  const completeThrough = REPORT.overTime.completeThroughFy;
  const pipelinePoints = REPORT.overTime.cohorts.map((c) => ({
    year: c.fy,
    pending: c.pending,
    monthsSolid: c.fy <= completeThrough ? c.medianMonths : null,
    monthsProvisional: c.fy >= completeThrough ? c.medianMonths : null,
  }));

  // Pooled narrative figures (kept in sync with the baked counts).
  const poolConv = (pred: (fy: number) => boolean) => {
    let c = 0;
    let total = 0;
    REPORT.overTime.byVerdictYear.forEach((r) => {
      if (!pred(r.fy)) return;
      c += r.convicted;
      total += r.convicted + r.partial + r.acquitted;
    });
    return total ? Math.round((c / total) * 100) : 0;
  };
  const earlyConvPct = poolConv((fy) => fy <= 2071);
  const recentConvPct = poolConv((fy) => fy >= 2079);
  const fakeShareStart = Math.round(rates[0].fakeSharePct);
  const fakeShareMin = Math.round(Math.min(...rates.filter((r) => r.year >= 2079).map((r) => r.fakeSharePct)));
  const completeCohorts = REPORT.overTime.cohorts.filter((c) => c.fy <= completeThrough);
  const peakDelayMonths = Math.max(...completeCohorts.map((c) => c.medianMonths));
  const peakDelayYear = completeCohorts.find((c) => c.medianMonths === peakDelayMonths)?.fy ?? completeThrough;

  const gapKeys = ["intake", "charging", "adjudication", "appeal", "recovery"] as const;
  const gapDark = new Set(["appeal", "recovery"]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        {/* This report is served English-only for now; keep the crawlable copy in English. */}
        <html lang="en" />
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
              {t("research.corruption.hero.snapshot", "Snapshot as of {{bs}} BS, spanning 14 fiscal years of court records (FY2069/70–2082/83).", { bs: REPORT.snapshotBs })}{" "}
              <a
                href="#methodology"
                onClick={(e) => {
                  // <base href="/"> makes a bare "#methodology" resolve to the site
                  // root, so scroll in-page ourselves instead of letting it navigate.
                  e.preventDefault();
                  document.getElementById("methodology")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="font-medium not-italic text-accent hover:underline"
              >
                {t("research.corruption.hero.methodologyLink", "How we built and cross-checked these numbers →")}
              </a>
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {tGlobal("research.corruption.hero.englishOnlyNotice", "This report is currently available in English only.")}
            </p>
          </div>
        </section>

        <div className="container mx-auto max-w-4xl space-y-16 px-6 py-14">
          {/* 1 · Funnel */}
          <section>
            <Eyebrow>{t("research.corruption.funnel.eyebrow", "The funnel")}</Eyebrow>
            <SectionHeading>{t("research.corruption.funnel.heading", "About 0.2% of complaints end in a full conviction")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.funnel.lead", "In a single year the CIAA registered about 28,554 new complaints. Most were screened out at intake — only 947 (3.3%) went to a full investigation — and of those it prosecuted 137, roughly one in seven. Apply the measured full-conviction rate and only a few dozen end in a full conviction.")}
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
              {t("research.corruption.funnel.caption", "Complaint, investigation and prosecution counts: CIAA 35th annual report (FY 2081/82), cross-checked against the court records. The steep drop is at intake screening, not the courtroom — most complaints never warrant a full investigation (many are outside the CIAA's jurisdiction or evidence-free); of those it does investigate, it prosecutes about 1 in 7. The conviction stage applies this archive's measured 45% full-conviction rate to the filed count.")}{" "}
              <a href={CITATIONS.ciaa35} className="text-accent hover:underline">{t("research.corruption.cite.ciaa35", "CIAA 35th annual report")}</a>
            </p>
          </section>

          {/* 2 · Cross-check — the seam between the CIAA-sourced funnel above and the
              register-sourced sections below. Everything after this point is the court's
              own record, so this is where that record has to earn its place. */}
          <section>
            <Eyebrow>{t("research.corruption.crossCheck.eyebrow", "Cross-check")}</Eyebrow>
            <SectionHeading>{t("research.corruption.crossCheck.heading", "The court's register holds more CIAA cases than the CIAA reports")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.crossCheck.lead", "The CIAA's annual reports and the Special Court's register are independent accounts of the same events — the Commission deciding to prosecute, and the court opening a docket. Across {{years}} fiscal years they agree to {{gap}}%: {{ciaa}} filings the CIAA published against {{register}} comparable cases in the register. Where they diverge it is almost entirely one offence — fake-credential cases account for {{fake}} of the {{net}} net difference, while every offence both sources label the same way matches exactly.", { years: cc.yearsCompared, gap: agreementGapPct.toFixed(1), ciaa: cc.ciaaFiledTotal.toLocaleString(), register: cc.registerComparableTotal.toLocaleString(), fake: cc.fakeCertDelta, net: cc.netDelta })}
            </p>

            <div className="mt-8">
              <h3 className="text-base font-semibold text-foreground">{t("research.corruption.crossCheck.agreementTitle", "Prosecutions filed each year, as each source records them")}</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("research.corruption.crossCheck.agreementSub", "At this scale the two records are almost indistinguishable — no single year differs by more than {{max}} cases — and that is the first finding rather than a drafting problem. The CIAA series is drawn as a wide band with the register dashed over it so both stay legible. FY2082/83 is absent because the CIAA's 36th annual report has not been published, so there is no figure to compare against.", { max: maxYearGap })}</p>
              <FiledDecidedTrend
                years={agreementYears}
                filed={agreementCiaa}
                decided={agreementRegister}
                filedLabel={t("research.corruption.crossCheck.seriesCiaa", "CIAA annual reports")}
                decidedLabel={t("research.corruption.crossCheck.seriesRegister", "Court register")}
                overlapping
              />
            </div>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.crossCheck.caseLevelLead", "For the {{years}} years where the gap is widest we checked it case by case, matching the accused named in the reports' own filing tables against the accused named in the register. The direction of the divergence turns out to be the opposite of what a missing-records story would predict: every one of the {{listed}} cases the CIAA says it filed is in the register. What the register holds instead is {{surplus}} fake-credential cases that those years' own filing tables never list.", { years: cc.yearsExamined, listed: cc.ciaaListed, surplus: cc.registerSurplus })}
            </p>

            <div className="mt-8">
              <h3 className="text-base font-semibold text-foreground">{t("research.corruption.crossCheck.surplusTitle", "Why {{n}} register cases are missing from the CIAA's own tables", { n: cc.registerSurplus })}</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("research.corruption.crossCheck.surplusSub", "Two of these reasons are documented rather than inferred. Five cases are a difference of principle about which year a filing belongs to: the CIAA attributes it to the year the Commission decided to prosecute, the court to the year the docket was registered — and all five appear in the previous year's report, with decision dates in Ashadh and filing dates that match the register's registration date to the day. Four more are absent from one year's report but described in the next report as prosecutions the CIAA filed at the Special Court and won: one CIAA document contradicting another.")}</p>
              <BreakdownBar items={surplusItems} tooltipLabel={t("research.corruption.crossCheck.surplusTooltip", "Cases")} labelWidth={230} />
            </div>

            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              {t("research.corruption.crossCheck.caption", "Filing counts from the CIAA's annual reports, cross-checked against the Special Court register. The register side removes {{excluded}} cases in streams the CIAA does not file — money laundering, petitions filed against the CIAA itself, and offences outside its jurisdiction — an exclusion that is marginally over-broad, since the FY2081/82 report shows the CIAA filed two money-laundering cases itself. Three limits travel with this: only {{years}} of the 14 years and one of the 13 offence families have been checked at case level; {{unexplained}} of the {{surplus}} surplus cases remain unexplained; and the reading that the annual report under-counts its own fake-credential filings is established for four specific cases and well supported for the rest, not proven for all.", { excluded: cc.nonCiaaStreams, years: cc.yearsExamined, unexplained: 9, surplus: cc.registerSurplus })}{" "}
              <a href={CITATIONS.ciaaReports} className="text-accent hover:underline">{t("research.corruption.cite.ciaaReports", "CIAA annual reports")}</a>
              {" · "}
              <Link to="/courtcases" className="text-accent hover:underline">{t("research.corruption.cite.courtRecords", "Browse the court records")}</Link>
            </p>
          </section>

          {/* 3 · The docket — volume and composition together, and both before "what
              sticks", so the charge families are defined before conviction rates use them. */}
          <section>
            <Eyebrow>{t("research.corruption.volume.eyebrow", "The docket")}</Eyebrow>
            <SectionHeading>{t("research.corruption.volume.heading", "What the court is actually asked to try")}</SectionHeading>
            <div className="mt-8">
              <h3 className="text-base font-semibold text-foreground">{t("research.corruption.volume.trendTitle", "Cases filed vs. decided, by year")}</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("research.corruption.volume.trendSub", "Fiscal year. The filing peak (FY2076/77) precedes the decided peak (FY2080/81) by ~4 years.")}</p>
              <FiledDecidedTrend
                years={REPORT.trend.years}
                filed={REPORT.trend.filed}
                decided={REPORT.trend.decided}
                filedLabel={t("research.corruption.volume.filed", "Filed")}
                decidedLabel={t("research.corruption.volume.decided", "Decided")}
              />
            </div>

            <div className="mt-10">
              <h3 className="text-base font-semibold text-foreground">{t("research.corruption.volume.mixTitle", "The charge mix")}</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("research.corruption.volume.mixSub", "Prosecutions by offence family: the substantive corruption charges plus the money-laundering dockets tried at the same court. The unclassifiable remainder is left out.")}</p>
              <BreakdownBar items={mixItems} tooltipLabel={t("research.corruption.volume.mixTooltip", "Prosecutions")} labelWidth={150} />
            </div>

            <div className="mt-10">
              <h3 className="text-base font-semibold text-foreground">{t("research.corruption.volume.mixByYearTitle", "How the charge mix shifted, by year")}</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("research.corruption.volume.mixByYearSub", "Substantive prosecutions by fiscal filing year. Fake-credential cases (crimson) dominated the early docket — about 70% in FY2069/70 — then fell to single digits by FY2077/78–2079/80 (with a rebound in FY2080/81), while the newer illegal-benefit charge (absent before FY2078/79) and loss to government grew.")}</p>
              <ChargeMixByYear
                data={REPORT.chargeMixByYear}
                percentLabel={t("research.corruption.volume.mixPercentToggle", "Show as 100%")}
                labels={{
                  bribery: t("research.corruption.volume.mixLabels.bribery", "Bribery"),
                  fake: t("research.corruption.volume.mixLabels.fake", "Fake credential"),
                  embezzlement: t("research.corruption.volume.mixLabels.embezzlement", "Embezzlement"),
                  benefit: t("research.corruption.volume.mixLabels.benefit", "Illegal benefit"),
                  loss: t("research.corruption.volume.mixLabels.loss", "Loss to government"),
                  other: t("research.corruption.volume.mixLabels.other", "Other"),
                }}
              />
            </div>
          </section>

          {/* 4 · Outcomes */}
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

          {/* 5 · Conviction by charge — reads directly off §3's charge families. */}
          <section>
            <Eyebrow>{t("research.corruption.byCharge.eyebrow", "What actually sticks")}</Eyebrow>
            <SectionHeading>{t("research.corruption.byCharge.heading", "Conviction depends overwhelmingly on what was charged")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.byCharge.lead", "Fake-credential cases convict at 90% and make up nearly half of all convictions. The signature financial-graft charges — bribery, embezzlement, illicit wealth — mostly fail, bottoming out at illegal benefit (4.5%).")}
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
                avgLabel={t("research.corruption.byCharge.avgLine", "45% court average")}
              />
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              {t("research.corruption.byCharge.caption", "Decided cases per charge type, split by outcome. Cited to the underlying charge sheets and court records.")}{" "}
              <a href={CITATIONS.chargeSheets} className="text-accent hover:underline">{t("research.corruption.cite.chargeSheets", "Charge sheets")}</a>
            </p>
          </section>

          {/* 6 · Over time */}
          <section>
            <Eyebrow>{t("research.corruption.overTime.eyebrow", "Over time")}</Eyebrow>
            <SectionHeading>{t("research.corruption.overTime.heading", "The court convicts far less than it used to")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.overTime.lead", "In the early years the Special Court fully convicted roughly {{early}}% of the corruption defendants it decided; across FY2079/80–2082/83 that fell to about {{recent}}%. Acquittals now routinely outnumber convictions.", { early: earlyConvPct, recent: recentConvPct })}
            </p>

            <div className="mt-8">
              <h3 className="text-base font-semibold text-foreground">{t("research.corruption.overTime.rateTitle", "Outcome mix by verdict year")}</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("research.corruption.overTime.rateSub", "Share of decided cases by verdict fiscal year. Acquittals overtook full convictions around FY2078/79.")}</p>
              <RateTrend
                data={outcomePoints}
                series={[
                  { key: "convPct", label: t("research.corruption.outcome.convicted", "Convicted"), color: "hsl(var(--primary))", width: 2.25 },
                  { key: "acqPct", label: t("research.corruption.outcome.acquitted", "Acquitted"), color: "hsl(var(--accent))", width: 2.25 },
                  { key: "partPct", label: t("research.corruption.outcome.partial", "Partial"), color: "hsl(var(--alert))", width: 1.75 },
                ]}
              />
            </div>

            <div className="mt-10">
              <h3 className="text-base font-semibold text-foreground">{t("research.corruption.overTime.decompTitle", "Is the decline real? Easy wins vs. core graft")}</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">
                {t("research.corruption.overTime.decompSub", "Documentary fake-credential cases — which convict at ~90% — fell from {{start}}% of the decided docket to as little as {{min}}%. Core financial graft, though, convicts in the same ~30% band throughout — so the headline decline is mostly that change of mix (the easy wins leaving), not the court convicting serious graft any less. The sharp dips (FY2078/79, FY2080/81) are acquittal spikes.", { start: fakeShareStart, min: fakeShareMin })}
              </p>
              <RateTrend
                data={decompPoints}
                series={[
                  { key: "allConvPct", label: t("research.corruption.overTime.seriesAll", "All charges"), color: "hsl(var(--primary))", width: 2.25 },
                  { key: "coreConvPct", label: t("research.corruption.overTime.seriesCore", "Core graft (excl. fake credential)"), color: "hsl(var(--accent))", dashed: true },
                ]}
                refPct={courtAvgConv}
                refLabel={t("research.corruption.overTime.avgLine", "45% cumulative")}
              />
            </div>

            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              {t("research.corruption.overTime.caption", "Full-conviction rate by verdict fiscal year, case-grain, from Special Court records.")}{" "}
              <Link to="/courtcases" className="text-accent hover:underline">{t("research.corruption.cite.courtRecords", "Browse the court records")}</Link>
            </p>
          </section>

          {/* 7 · Pace — split out of the old combined volume section so it asks one
              question: how long a case takes, and when in the year filings land. */}
          <section>
            <Eyebrow>{t("research.corruption.pace.eyebrow", "Pace")}</Eyebrow>
            <SectionHeading>{t("research.corruption.pace.heading", "How long a prosecution takes, and when they arrive")}</SectionHeading>
            <div className="mt-8">
              <h3 className="text-base font-semibold text-foreground">{t("research.corruption.volume.paceTitle", "Time to verdict, and the backlog")}</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("research.corruption.volume.paceSub", "By filing cohort. Cohorts through FY2079/80 took a median {{peak}} months at their slowest (FY{{peakYear}}); {{pending}} cases filed since are still awaiting a verdict.", { peak: peakDelayMonths, peakYear: fyLabel(peakDelayYear), pending: REPORT.outcome.ongoing })}</p>
              <PipelineHealth
                data={pipelinePoints}
                monthsLabel={t("research.corruption.volume.months", "Median months to verdict")}
                backlogLabel={t("research.corruption.volume.backlog", "Awaiting verdict")}
                provisionalLabel={t("research.corruption.volume.provisional", "Provisional (cohort still open)")}
              />
            </div>

            <div className="mt-10">
              <h3 className="text-base font-semibold text-foreground">{t("research.corruption.volume.monthTitle", "When cases are filed, by Nepali month")}</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("research.corruption.volume.monthSub", "Mean cases filed per Nepali month across FY2069/70–2082/83; error bars show ±1 standard deviation. Filings peak in Ashadh — the fiscal year-end — and trough in Kartik, the Dashain/Tihar festival month.")}</p>
              <FiledByMonth
                data={REPORT.filedByMonth}
                peakMonth={3}
                meanLabel={t("research.corruption.volume.monthMean", "Mean cases filed")}
                sdLabel={t("research.corruption.volume.monthSd", "±1 SD")}
              />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("research.corruption.volume.monthCaption", "Bars are the mean across 14 complete fiscal years (FY2069/70–2082/83); whiskers are ±1 standard deviation — how much each month swings from year to year. Registration date from Special Court records.")}</p>
            </div>
          </section>

          {/* 8 · Per-justice — last of the explanatory cuts. Charge type and time come
              first so the bench spread is read against them, not instead of them. */}
          <section>
            <Eyebrow>{t("research.corruption.justice.eyebrow", "Which bench you draw")}</Eyebrow>
            <SectionHeading>{t("research.corruption.justice.heading", "Full-conviction rates run from 78% to 21% across the court's judges")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.justice.lead", "Bench-grain attribution — every panel member is credited with the panel's outcome, dot size scaled to caseload. Sitting on the same court, hearing the same prosecutor, benches diverge more than threefold. Descriptive, not causal: some of this spread is the charge mix and the era a bench sat in, which the two sections above set out.")}
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
                avgLabel={t("research.corruption.justice.avgLine", "court avg 45%")}
              />
            </div>
          </section>

          {/* 9 · Gaps */}
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
                      intake: "~28,600 new complaints a year produce ~137 prosecutions (≈0.5% of all complaints); most are screened out at intake — only ~1 in 7 of those the CIAA fully investigates is prosecuted — and the rest are shelved with no public verdict. The single biggest, least-visible leak.",
                      charging: "46% of convictions are easy documentary fake-certificate cases; core financial corruption converts at ~32%, with the signature charges collapsing. The system convicts paperwork, not plunder.",
                      adjudication: "39% outright acquittal, 55% less-than-full conviction, and more than a threefold spread across benches. Year-to-year the full-conviction rate swung from ~86% to ~14%, partly on one FY2078/79 apex-court ruling.",
                      appeal: "The CIAA appeals many losses and defendants appeal convictions, but appellate outcomes carry no decision data in the record. How often a verdict is overturned is currently unmeasurable.",
                      recovery: "Billions in damages are claimed each year, but no source tracks how much is ever recovered, or whether the convicted serve meaningful sanction.",
                    }[k] as string)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 10 · Methodology — the single, global methodology for the whole report */}
          <section id="methodology" className="scroll-mt-24">
            <Eyebrow>{t("research.corruption.appendix.eyebrow", "Methodology")}</Eyebrow>
            <SectionHeading>{t("research.corruption.appendix.heading", "How this report was built and cross-checked")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.appendix.sourcesLead", "Two independent public records, cross-checked against each other — and both browsable on Jawafdehi. Complaint, investigation and prosecution counts come from the CIAA's own annual reports; conviction outcomes come from our mirror of Nepal's Special Court and wider judiciary. Where the two overlap — the cases filed each year — they agree to 1.2%, and the section above sets out case by case where they do not. Every figure on this page links to the record behind it.")}
            </p>
            <details className="mt-6 rounded-xl border border-border bg-muted/20 p-5">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                {t("research.corruption.appendix.summary", "Full methodology, discrepancies & limits")}
              </summary>
              <div className="mt-4 space-y-3 text-xs leading-5 text-muted-foreground">
                <p>{t("research.corruption.appendix.corpus", "Corpus. Of ~12,600 Special Court records, most are procedural petitions. We isolate CIAA prosecutions as the Special Court's -CR- criminal register — 2,949 cases filed FY2069/70–2082/83 (the register is the definition; no plaintiff filter) — of which 2,795 are substantive corruption charges after removing money-laundering (a separate statute, 93 cases) and unclassified matters (61).")}</p>
                <p>{t("research.corruption.appendix.funnel", "The funnel. Of 28,554 newly registered complaints in the year, only 947 (3.3%) went to a full investigation; most of the rest were screened out at intake — shelved or referred — much of it legitimate (outside the CIAA's jurisdiction, no supporting evidence, or duplicates). Of the complaints it fully investigated, the CIAA filed charges in 137 — about 1 in 7 (the CIAA reports this as 13% of its investigation decisions). So “0.5% of all complaints reach court” and “~1 in 7 of the complaints it investigates is prosecuted” are both true and measure different stages; the steep drop is concentrated at screening, not the courtroom.")}</p>
                <p>{t("research.corruption.appendix.outcomes", "Outcomes. Verdicts are coded per hearing as convicted / acquitted / partial; each case is taken at its terminal deciding hearing. The conviction rate is over the 2,728 register cases carrying an unambiguous ठहर / आंशिक / सफाई disposition. That is a different set from the 2,740 whose case status reads फैसला (which the filed-vs-decided trend counts), and neither contains the other: 2,628 cases are in both, 112 are marked decided but carry no hearing with a recorded disposition, and 100 carry a disposition without the corresponding status.")}</p>
                <p>{t("research.corruption.appendix.derivedVerdicts", "Where a verdict came from. Cases that reached the mirror without ever appearing on a published cause list carry no court-published disposition, so the only way to count them at all is to read the verdict out of the judgment text. {{n}} verdicts were recovered that way (37 conviction, 26 acquittal, 6 partial) and every one of them is EXCLUDED from every rate on this page — a rate that quietly mixed court-published and machine-read verdicts would misrepresent its own source. We report the number rather than filtering silently.", { n: REPORT.verdictsModelDerivedExcluded })}</p>
                <p>{t("research.corruption.appendix.dates", "Dates. Verdict dates are parsed from the case status text; filings from the registration date. Bikram Sambat throughout.")}</p>
                <p>{t("research.corruption.appendix.overTime", "Over time. Yearly rates are grouped by verdict fiscal year; the sharp rise in acquittals from FY2078/79 is a genuine surge in the record, not a coding artifact. Time-to-verdict is measured by filing cohort: cohorts through FY2079/80 are essentially fully decided, but recent cohorts are still open, so their apparent speed reflects only the cases already resolved (survivorship) and is drawn as provisional.")}</p>
                <p>{t("research.corruption.appendix.justice", "Per-justice. Attribution is bench-grain: every member of a panel is credited with the panel's outcome, so this describes the benches a justice sat on, not that justice's individual effect. It is descriptive, and small differences are noise.")}</p>
                <p>{t("research.corruption.appendix.discrepancy", "Discrepancy with CIAA figures. The CIAA reports a ~53% “success” rate; that counts full + partial convictions together, whereas our full-conviction rate (45%) is cumulative and separates the two. Never compare the two without aligning definition and period. The filing counts are a separate question, measured rather than assumed — see the cross-check section above.")}</p>
                <p>{t("research.corruption.appendix.crossCheck", "The cross-check. Matching the reports' per-case filing tables to the register is name matching, not a key lookup: the early high-divergence years print no case number at all, and a case number alone does not identify a court in any event — the same NNN-CR-NNNN format is used by the Special Court, the Supreme Court and the district courts, so a number lifted out of its column resolves to the wrong case. Names were matched after folding Devanagari spelling variants, and the residue was resolved by hand on the date: every pair we accepted matches the printed filing date to the register's registration date to the day. Three pairs were accepted this way and are flagged as such in the published data, so a reader who rejects them can re-derive the totals without them.")}</p>
                <p>{t("research.corruption.appendix.entity", "Identity. Only ~7% of distinct defendants (607 of 8,321) are resolved to a canonical, cross-referenced identity, so office-level and repeat-offender cuts are deferred as low-confidence.")}</p>
                <p>
                  {t("research.corruption.appendix.likhitPre", "Reading the source PDFs. The CIAA reports are Nepali-language PDFs set in legacy Devanagari fonts that ordinary tools garble. We convert them to clean, checkable Markdown with ")}
                  <a href="https://github.com/Jawafdehi/likhit" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{t("research.corruption.appendix.likhitName", "likhit")}</a>
                  {t("research.corruption.appendix.likhitPost", " — Jawafdehi's open-source universal Nepali document-to-markdown converter — then verify every figure by eye against the original page.")}
                </p>
                <p>{t("research.corruption.appendix.limits", "Limits. These are the records in the archive as of the snapshot date ({{bs}} BS); figures update as new records are mirrored. Appellate outcomes are largely absent, and amount-recovered is untracked anywhere.", { bs: REPORT.snapshotBs })}</p>
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
