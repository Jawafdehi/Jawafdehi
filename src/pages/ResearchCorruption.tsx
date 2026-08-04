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
import { AccountabilityStages, type AccountabilityStage } from "@/components/research/AccountabilityStages";

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
  // EVERY rate below is over CASES. The court records one verdict per case and publishes no
  // per-accused outcome at all, so a per-person conviction rate cannot be derived from this
  // data and must never be implied by the copy.
  const decidedClean = o.convicted + o.partial + o.acquitted;
  const convPct = Math.round((o.convicted / decidedClean) * 100);
  const acqPct = Math.round((o.acquitted / decidedClean) * 100);
  const partPct = Math.round((o.partial / decidedClean) * 100);
  const lessThanFull = acqPct + partPct;
  const courtAvgConv = (o.convicted / decidedClean) * 100;

  // The CIAA's headline complaint number is its total WORKLOAD; the funnel starts at new
  // intake instead, so the difference has to be stated rather than quietly dropped.
  const carriedOver = REPORT.ciaa.complaintsWorkloadYear - REPORT.ciaa.complaintsYear;

  // Funnel — uniform accent hue; the shrinking widths + "% of complaints" tell it.
  // Notes carry the "share of the previous stage" story the single denominator can't:
  // the big drop is intake screening, and the CIAA prosecutes ~1 in 7 of what it investigates.
  const funnelStageNote: Record<string, string> = {
    investigated: t("research.corruption.funnel.stage.investigatedNote", "only 3.3% go to a full investigation"),
    filed: t("research.corruption.funnel.stage.filedNote", "≈1 in 7 investigated are prosecuted"),
    convicted: t("research.corruption.funnel.stage.convictedNote", "≈45% of prosecuted cases convict"),
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

  // Per-charge figures for the prose, derived so they cannot drift from the chart beside them.
  // `share` is out of all full convictions, i.e. the same denominator as the outcome donut.
  const charge = (en: string) => {
    const c = REPORT.byCharge.find((x) => x.en === en);
    if (!c) return { pct: 0, share: 0, decided: 0 };
    const decided = c.convicted + c.partial + c.acquitted;
    const raw = (c.convicted / decided) * 100;
    return {
      pct: Math.round(raw),
      // One decimal for the low end, where rounding to an integer loses real precision:
      // illegal benefit is 4.5%, and 4% reads as a different claim.
      pct1: raw.toFixed(1),
      share: Math.round((c.convicted / o.convicted) * 100),
      decided,
    };
  };
  const fake = charge("Fake credential");
  const bribery = charge("Bribery");
  const benefit = charge("Illegal benefit");
  // What is left once the two charges that carry the court are removed — the honest measure
  // of how the rest of the financial-graft docket does.
  const restOfDocket = (() => {
    let cv = 0;
    let dec = 0;
    REPORT.byCharge.forEach((c) => {
      if (c.en === "Fake credential" || c.en === "Bribery") return;
      cv += c.convicted;
      dec += c.convicted + c.partial + c.acquitted;
    });
    return dec ? Math.round((cv / dec) * 100) : 0;
  })();

  // Chart totals, derived so the captions that disclose them cannot drift. The by-charge chart
  // covers fewer cases than the donut (unclassifiable charge text) and the mix chart covers
  // more than the substantive corpus (it keeps the unclassified matters inside "Other").
  const chargeDecidedTotal = REPORT.byCharge.reduce((s, c) => s + c.convicted + c.partial + c.acquitted, 0);
  const mixTotal = REPORT.chargeMixByYear.reduce(
    (s, r) => s + r.bribery + r.fake + r.embezzlement + r.benefit + r.loss + r.other,
    0,
  );
  const justiceDecisions = REPORT.justices.reduce((s, j) => s + j.decisions, 0);

  const chargeRows: ChargeRow[] = REPORT.byCharge.map((c) => ({
    label: lang === "ne" ? c.ne : c.en,
    sublabel: lang === "ne" ? c.en : c.ne,
    convicted: c.convicted,
    partial: c.partial,
    acquitted: c.acquitted,
  }));

  // --- Cross-check: the CIAA's own reports against the court's register (methodology) ---
  const cc = REPORT.crossCheck;
  const agreementGapPct = ((cc.registerComparableTotal - cc.ciaaFiledTotal) / cc.ciaaFiledTotal) * 100;
  const surplusItems = cc.surplusReasons.map((r) => ({ label: lang === "ne" ? r.ne : r.en, count: r.count }));
  // Derived, not typed: the residual bucket and the widest single-year gap both belong to the
  // table and must move with it.
  const surplusUnexplained = cc.surplusReasons.find((r) => r.unexplained)?.count ?? 0;
  const worstYearGap = Math.max(...REPORT.sourceAgreement.map((r) => Math.abs(r.registerComparable - r.ciaaFiled)));

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

  // Pooled narrative figures. Pooling is not a stylistic choice here: annual denominators run
  // as low as 32 decided cases, and the core-graft denominator as low as 13, so a single year's
  // rate turns on a handful of verdicts. Copy must describe the pooled LEVEL and treat the
  // year-to-year line as noise — never the other way round.
  const pool = (pred: (fy: number) => boolean) => {
    let conv = 0;
    let acq = 0;
    let total = 0;
    let coreConv = 0;
    let coreTotal = 0;
    REPORT.overTime.byVerdictYear.forEach((r) => {
      if (!pred(r.fy)) return;
      const t = r.convicted + r.partial + r.acquitted;
      conv += r.convicted;
      acq += r.acquitted;
      total += t;
      coreConv += r.convicted - r.fakeConv;
      coreTotal += t - r.fakeDisp;
    });
    return {
      conv,
      acq,
      convPct: total ? Math.round((conv / total) * 100) : 0,
      corePct: coreTotal ? Math.round((coreConv / coreTotal) * 100) : 0,
    };
  };
  const early = pool((fy) => fy <= 2071);
  const recent = pool((fy) => fy >= 2079);
  // How often acquittals actually finished ahead of full convictions in a year. Three of
  // fourteen — so "acquittals now outnumber convictions" is a pooled fact about the recent
  // window, not a description of the line.
  const acqAheadYears = REPORT.overTime.byVerdictYear.filter((r) => r.acquitted > r.convicted).length;
  const coreLow = rates.reduce((a, b) => (b.coreConvPct < a.coreConvPct ? b : a));
  const coreHigh = rates.reduce((a, b) => (b.coreConvPct > a.coreConvPct ? b : a));
  const fakeShareStart = Math.round(rates[0].fakeSharePct);
  const fakeShareMin = Math.round(Math.min(...rates.filter((r) => r.year >= 2079).map((r) => r.fakeSharePct)));
  const completeCohorts = REPORT.overTime.cohorts.filter((c) => c.fy <= completeThrough);
  const peakDelayMonths = Math.max(...completeCohorts.map((c) => c.medianMonths));
  const peakDelayYear = completeCohorts.find((c) => c.medianMonths === peakDelayMonths)?.fy ?? completeThrough;

  // The pipeline as an ordered walk. The last two stages are `noData`: they happen, and we
  // hold nothing on what they produce.
  //
  // Say that as a fact about US, not about the world. "Not measurable" and "no source reports
  // it" are claims we are not in a position to make — we searched and came up empty, which is
  // weaker and is all we can defend. It also happens to be the more useful claim, because it
  // invites the correction that would close the gap.
  const stages: AccountabilityStage[] = [
    {
      key: "intake",
      owner: t("research.corruption.gaps.intake.owner", "CIAA"),
      title: t("research.corruption.gaps.intake.title", "Complaint intake & screening"),
      body: t("research.corruption.gaps.intake.body", "About 28,600 new complaints arrive a year and roughly 137 prosecutions come out the far end — near 0.5%. Most are screened out here: shelved, referred elsewhere, or closed for want of evidence or jurisdiction, and much of that is legitimate. But it happens with no public verdict on any individual complaint, which makes this both the largest drop in the pipeline and the least visible."),
    },
    {
      key: "charging",
      owner: t("research.corruption.gaps.charging.owner", "CIAA"),
      title: t("research.corruption.gaps.charging.title", "Investigation & charging"),
      body: t("research.corruption.gaps.charging.body", "Of the complaints it fully investigates the CIAA prosecutes about 1 in 7, and what it charges shapes the outcome more than anything the court does. Two charges do almost all the work: fake credentials convict at {{fakePct}}% and bribery at {{briberyPct}}%, and between them they account for four in five convictions. Take those two out and the rest of the docket converts at {{rest}}%.", { fakePct: fake.pct, briberyPct: bribery.pct, rest: restOfDocket }),
    },
    {
      key: "adjudication",
      owner: t("research.corruption.gaps.adjudication.owner", "Special Court"),
      title: t("research.corruption.gaps.adjudication.title", "Trial & verdict"),
      body: t("research.corruption.gaps.adjudication.body", "{{acq}}% of decided cases end in outright acquittal and {{less}}% in something short of a clean conviction, with more than a threefold spread across benches. Year to year the full-conviction rate has swung from about 86% to about 14%.", { acq: acqPct, less: lessThanFull }),
    },
    {
      key: "appeal",
      owner: t("research.corruption.gaps.appeal.owner", "Supreme Court"),
      title: t("research.corruption.gaps.appeal.title", "Appeal"),
      body: t("research.corruption.gaps.appeal.body", "We can see how many appeals are filed: in FY2081/82 alone the CIAA appealed {{appeals}} Special Court verdicts to the Supreme Court, and defendants appeal their convictions too. We cannot see how they end. They clearly do end — the CIAA filed {{reviews}} review petitions that same year against Supreme Court rulings on its own appeals — but our court records hold no decision for them and we have not found the outcomes published anywhere as data. So we cannot tell you how often a Special Court verdict survives on appeal. That is a gap in what we have, not a claim that the answer is unknowable.", { appeals: REPORT.ciaa.appealsFiledYear, reviews: REPORT.ciaa.appealReviewPetitionsYear }),
      noData: true,
    },
    {
      key: "recovery",
      owner: t("research.corruption.gaps.recovery.owner", "State"),
      title: t("research.corruption.gaps.recovery.title", "Recovery & sanction"),
      body: t("research.corruption.gaps.recovery.body", "Billions of rupees in damages are demanded each year — Rs 6.02 billion in FY2081/82 alone. How much of it is ever collected, and whether those convicted serve a meaningful sanction, we do not know: we have not found a source that tracks either, and we hold no data of our own on it. It may be recorded somewhere we have not looked. What we can say is that we cannot follow the money past the verdict."),
      noData: true,
    },
  ];

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

            {/* The 37,026 figure is the one in circulation, so the page has to reconcile it. */}
            <div className="mt-6 rounded-xl border border-border bg-muted/20 p-5">
              <h3 className="text-sm font-semibold text-foreground">
                {t("research.corruption.funnel.workloadTitle", "Why this starts at {{intake}} and not {{workload}}", { intake: REPORT.ciaa.complaintsYear.toLocaleString(), workload: REPORT.ciaa.complaintsWorkloadYear.toLocaleString() })}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {t("research.corruption.funnel.workloadBody", "You will more often see {{workload}} complaints quoted for this year, and that number is also the CIAA's own. It is the Commission's total workload: {{intake}} complaints newly registered during the year plus {{carried}} still open from previous years. Both appear in the same table of the 35th report. A funnel that starts at {{workload}} would count those {{carried}} a second time, having already counted them in an earlier year, so this one starts at new intake — which also makes the percentage at each stage smaller and more conservative than the headline version.", { workload: REPORT.ciaa.complaintsWorkloadYear.toLocaleString(), intake: REPORT.ciaa.complaintsYear.toLocaleString(), carried: carriedOver.toLocaleString() })}
              </p>
            </div>

            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              {t("research.corruption.funnel.caption", "Complaint, investigation and prosecution counts: CIAA 35th annual report (FY 2081/82), cross-checked against the court records. The steep drop is at intake screening, not the courtroom — most complaints never warrant a full investigation (many are outside the CIAA's jurisdiction or evidence-free); of those it does investigate, it prosecutes about 1 in 7. The conviction stage applies this archive's measured 45% full-conviction rate to the filed count.")}{" "}
              <a href={CITATIONS.ciaa35} className="text-accent hover:underline">{t("research.corruption.cite.ciaa35", "CIAA 35th annual report")}</a>
            </p>
          </section>

          {/* 2 · Outcomes — the headline finding. The definitional care lives here because
              this is the number that gets quoted. */}
          <section>
            <Eyebrow>{t("research.corruption.outcomes.eyebrow", "Outcomes")}</Eyebrow>
            <SectionHeading>{t("research.corruption.outcomes.heading", "Fewer than half of decided prosecutions end in a clean conviction")}</SectionHeading>
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-12">
              <StatusDonut
                segments={outcomeSegments}
                centerValue={decidedClean.toLocaleString()}
                centerLabel={t("research.corruption.outcomes.donutCenter", "cases decided")}
              />
              <div>
                <p className="text-lg leading-8 text-foreground/80">
                  {t("research.corruption.outcomes.lead", "Of {{n}} decided cases with a clear verdict, {{conv}}% end in a full conviction, {{acq}}% in outright acquittal, and {{part}}% in partial conviction — so {{less}}% end in something less than a clean conviction.", { n: decidedClean.toLocaleString(), conv: convPct, acq: acqPct, part: partPct, less: lessThanFull })}
                </p>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {t("research.corruption.outcomes.note", "The CIAA puts its own “success” rate at {{ciaa}}% because it counts partial convictions as successes. On that same definition this archive gives {{incl}}% — so matching the CIAA's definition does not close the gap with our {{full}}%, it reverses it. We keep full and partial separate and lead with the stricter number.", { ciaa: REPORT.ciaa.successRatePct, incl: convPct + partPct, full: convPct })}{" "}
                  <Link to="/courtcases" className="text-accent hover:underline">{t("research.corruption.cite.courtRecords", "Browse the court records")}</Link>
                </p>
              </div>
            </div>

            {/* Read this before quoting any conviction number. */}
            <div className="mt-8 rounded-xl border border-border bg-muted/20 p-5">
              <h3 className="text-sm font-semibold text-foreground">
                {t("research.corruption.outcomes.grainTitle", "What these numbers count, and what “partial” covers")}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {t("research.corruption.outcomes.grainCases", "These are cases, not people. The court records one verdict per case and publishes no outcome for each accused separately, so nothing here is a per-person conviction rate and none of it should be read as the share of individuals convicted. A single case may have one accused or a dozen.")}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {t("research.corruption.outcomes.grainPartial", "That is also why the middle category does two jobs at once. A partial verdict (आंशिक ठहर) covers a case where one accused was convicted on some charges and cleared of others, AND a case with several accused where some were convicted and others acquitted. The court's record does not distinguish the two, so neither can we. A partial verdict tells you the prosecution did not fail outright; it does not tell you how many people were convicted, or of what.")}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {t("research.corruption.outcomes.grainFull", "“Full conviction” (ठहर) is the strict reading: the charge was upheld against the case as the court framed it. We lead with it because it is the one category that cannot be read two ways — and we publish the including-partial rate ({{incl}}%) alongside it everywhere, so both readings are always available.", { incl: convPct + partPct })}
              </p>
            </div>
          </section>

          {/* 3 · The docket — volume and how the charge mix moved. */}
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
              <h3 className="text-base font-semibold text-foreground">{t("research.corruption.volume.mixByYearTitle", "How the charge mix shifted, by year")}</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("research.corruption.volume.mixByYearSub", "Register cases by fiscal filing year — {{n}} of the {{corpus}}, money laundering excluded. “Other” folds together seven smaller charge families and the matters whose charge text could not be classified. Fake-credential cases (crimson) dominated the early docket — about 70% in FY2069/70 — then fell to single digits by FY2077/78–2079/80, with a rebound in FY2080/81. The illegal-benefit charge was barely used before FY2078/79 (a single earlier case, in FY2069/70) and loss to government grew.", { n: mixTotal.toLocaleString(), corpus: REPORT.corpus.ciaaProsecutions.toLocaleString() })}</p>
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

          {/* 4 · Conviction by charge — reads directly off §3's charge families. */}
          <section>
            <Eyebrow>{t("research.corruption.byCharge.eyebrow", "What actually sticks")}</Eyebrow>
            <SectionHeading>{t("research.corruption.byCharge.heading", "Conviction depends overwhelmingly on what was charged")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.byCharge.lead", "Two charges carry the court. Fake-credential cases convict at {{fakePct}}% and supply {{fakeShare}}% of every full conviction. Bribery — the largest docket on the court, {{briberyDecided}} decided cases — convicts at {{briberyPct}}%, the second-highest rate of any charge and a shade above the court average, and supplies another {{briberyShare}}%. Between them that is four in five convictions. It is the rest of the docket that mostly fails: embezzlement, illicit enrichment and loss to government all convert in the low twenties or below, and illegal benefit sits at the bottom on {{benefitPct}}%.", { fakePct: fake.pct, fakeShare: fake.share, briberyDecided: bribery.decided.toLocaleString(), briberyPct: bribery.pct, briberyShare: bribery.share, benefitPct: benefit.pct1 })}
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
              {t("research.corruption.byCharge.caption", "Decided cases per charge type, split by outcome — {{n}} of the {{clean}} cases with a clear verdict; the rest carry charge text we could not classify. Money laundering keeps its own row here even though it sits outside the substantive corpus, because it is prosecuted under a separate statute. Every rate is per case, never per accused. Cited to the underlying charge sheets and court records.", { n: chargeDecidedTotal.toLocaleString(), clean: decidedClean.toLocaleString() })}{" "}
              <a href={CITATIONS.chargeSheets} className="text-accent hover:underline">{t("research.corruption.cite.chargeSheets", "Charge sheets")}</a>
            </p>
          </section>

          {/* 5 · Over time */}
          <section>
            <Eyebrow>{t("research.corruption.overTime.eyebrow", "Over time")}</Eyebrow>
            <SectionHeading>{t("research.corruption.overTime.heading", "The court convicts far less than it used to")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.overTime.lead", "In its first three years the Special Court fully convicted roughly {{early}}% of the corruption cases it decided; across FY2079/80–2082/83 that fell to about {{recent}}%. Acquittals have drawn level rather than taken over: across those recent years they slightly outnumber full convictions, {{acq}} to {{conv}}, but in only {{aheadYears}} of the 14 years did they finish a year ahead.", { early: early.convPct, recent: recent.convPct, acq: recent.acq, conv: recent.conv, aheadYears: acqAheadYears })}
            </p>

            <div className="mt-8">
              <h3 className="text-base font-semibold text-foreground">{t("research.corruption.overTime.rateTitle", "Outcome mix by verdict year")}</h3>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("research.corruption.overTime.rateSub", "Share of decided cases by verdict fiscal year. Acquittals spike above full convictions in FY2078/79 and FY2080/81 — and edge ahead again in FY2082/83 — but they do not stay there.")}</p>
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
                {t("research.corruption.overTime.decompSub", "Documentary fake-credential cases — which convict at ~90% — fell from {{start}}% of the decided docket to as little as {{min}}%. Core financial graft converts at much the same level now as it did then: {{coreEarly}}% across the first three years against {{coreRecent}}% across the last four. So the headline decline is mostly that change of mix — the easy wins leaving — not the court convicting serious graft any less. Read the dashed line as a level, not a trend: it swings from {{coreHigh}}% in FY{{coreHighYear}} to {{coreLow}}% in FY{{coreLowYear}} because in some years only a few dozen core-graft cases were decided.", { start: fakeShareStart, min: fakeShareMin, coreEarly: early.corePct, coreRecent: recent.corePct, coreHigh: Math.round(coreHigh.coreConvPct), coreHighYear: fyLabel(coreHigh.year), coreLow: Math.round(coreLow.coreConvPct), coreLowYear: fyLabel(coreLow.year) })}
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

          {/* 6 · Pace */}
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
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("research.corruption.volume.monthCaption", "Bars are the mean across the 14 fiscal years FY2069/70–2082/83 — all complete for filings, which is what this chart measures; the most recent cases are filed but many are still awaiting a verdict. Whiskers are ±1 standard deviation, i.e. how much each month swings from year to year. Registration date from Special Court records.")}</p>
            </div>
          </section>

          {/* 7 · Per-justice — last of the explanatory cuts. Charge type and time come
              first so the bench spread is read against them, not instead of them. */}
          <section>
            <Eyebrow>{t("research.corruption.justice.eyebrow", "Which bench you draw")}</Eyebrow>
            <SectionHeading>{t("research.corruption.justice.heading", "Full-conviction rates run from 78% to 21% across the court's benches")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.justice.lead", "The court records one verdict per case and no individual vote, so this is a property of the panels a justice sat on rather than of the justice: every panel member is credited with the panel's outcome, and a judge who dissented is credited with it too. Dot size is scaled to caseload. Sitting on the same court, hearing the same prosecutor, benches diverge more than threefold — but descriptively, not causally: some of that spread is the charge mix and the era a bench sat in, which the two sections above set out.")}
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
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              {t("research.corruption.justice.caption", "Justices who sat on at least {{min}} decided cases — {{n}} of the 41 in the record; below that a rate turns on a handful of verdicts and means little. Because every member of a panel is credited with the panel's outcome, the {{n}} shown are credited with {{decisions}} decisions between them, well above the {{cases}} cases those decisions came from.", { min: REPORT.justiceMinDecisions, n: REPORT.justices.length, decisions: justiceDecisions.toLocaleString(), cases: decidedClean.toLocaleString() })}
            </p>
          </section>

          {/* 8 · The pipeline, stage by stage */}
          <section>
            <Eyebrow>{t("research.corruption.gaps.eyebrow", "Where the gap is")}</Eyebrow>
            <SectionHeading>{t("research.corruption.gaps.heading", "Attrition concentrates at the CIAA stage — then we lose the trail")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.gaps.lead", "Follow one complaint from the day it is filed to the day someone is sanctioned for it. Five stages, two institutions — and our record of it runs out before the end.")}
            </p>
            <div className="mt-8">
              <AccountabilityStages stages={stages} noDataLabel={t("research.corruption.gaps.noDataLabel", "No data yet")} />
            </div>
            <p className="mt-6 text-xs leading-5 text-muted-foreground">
              {t("research.corruption.gaps.caption", "The dashed stages mark the limits of our own record, not a verdict on what happens inside them. We can see what goes in — appeals filed, damages demanded, both published by the CIAA. We have not been able to find what comes out. Whether that is because nobody publishes it or because we have not looked in the right place, we cannot tell from here, so we are not going to claim the stronger version. If you know of a dataset, report or registry covering appeal outcomes or amounts recovered, please tell us and we will fold it in.")}{" "}
              <a href="mailto:inquiry@jawafdehi.org" className="text-accent hover:underline">inquiry@jawafdehi.org</a>
              {t("research.corruption.gaps.captionSource", " · Appeal and damages figures: ")}
              <a href={CITATIONS.ciaa35} className="text-accent hover:underline">{t("research.corruption.cite.ciaa35", "CIAA 35th annual report")}</a>
            </p>
          </section>

          {/* 9 · Methodology — the single, global methodology for the whole report,
              including the cross-check against the CIAA's own reports. */}
          <section id="methodology" className="scroll-mt-24">
            <Eyebrow>{t("research.corruption.appendix.eyebrow", "Methodology")}</Eyebrow>
            <SectionHeading>{t("research.corruption.appendix.heading", "How this report was built and cross-checked")}</SectionHeading>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
              {t("research.corruption.appendix.sourcesLead", "Two independent public records, cross-checked against each other — and both browsable on Jawafdehi. Complaint, investigation and prosecution counts come from the CIAA's own annual reports; conviction outcomes come from our mirror of Nepal's Special Court and wider judiciary. Every figure on this page links to the record behind it.")}
            </p>

            <div className="mt-8">
              <h3 className="text-base font-semibold text-foreground">{t("research.corruption.crossCheck.heading", "Do the two records agree?")}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("research.corruption.crossCheck.lead", "The CIAA's annual reports and the Special Court's register are independent accounts of the same events — the Commission deciding to prosecute, and the court opening a docket. Across {{years}} fiscal years they agree to {{gap}}%: {{ciaa}} filings the CIAA published against {{register}} comparable cases in the register, and no single year differs by more than {{worst}}. Where they diverge, one offence dominates. In the {{netYears}} years whose reports break filings down by offence, the register runs {{net}} cases ahead, and {{fake}} of those {{net}} are fake-credential cases alone.", { years: cc.yearsCompared, gap: agreementGapPct.toFixed(1), ciaa: cc.ciaaFiledTotal.toLocaleString(), register: cc.registerComparableTotal.toLocaleString(), worst: worstYearGap, netYears: cc.netDeltaYears, fake: cc.fakeCertDelta, net: cc.netDelta })}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {t("research.corruption.crossCheck.caseLevelLead", "For the {{years}} years where the gap is widest we checked it case by case, matching the accused named in the reports' own filing tables against those named in the register. The divergence runs the opposite way to what a missing-records story would predict: every one of the {{listed}} cases the CIAA says it filed is in the register. What the register holds instead is {{surplus}} fake-credential cases those years' own filing tables never list.", { years: cc.yearsExamined, listed: cc.ciaaListed, surplus: cc.registerSurplus })}
              </p>
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-foreground">{t("research.corruption.crossCheck.surplusTitle", "Why {{n}} register cases are missing from the CIAA's own tables", { n: cc.registerSurplus })}</h4>
                <p className="mb-4 mt-1 text-xs leading-5 text-muted-foreground">{t("research.corruption.crossCheck.surplusSub", "Two of these reasons are documented rather than inferred. Five cases are a difference of principle about which year a filing belongs to: the CIAA attributes it to the year the Commission decided to prosecute, the court to the year the docket was registered — and all five appear in the previous year's report, with filing dates matching the register's registration date to the day. Four more are absent from one year's report but described in the next report as prosecutions the CIAA filed at the Special Court and won: one CIAA document contradicting another.")}</p>
                <BreakdownBar items={surplusItems} tooltipLabel={t("research.corruption.crossCheck.surplusTooltip", "Cases")} labelWidth={230} />
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                {t("research.corruption.crossCheck.caption", "Filing counts from the CIAA's annual reports, cross-checked against the Special Court register. The register side removes {{excluded}} cases in streams the CIAA does not file — money laundering, petitions filed against the CIAA itself, offences outside its jurisdiction, and a few mixed dockets — an exclusion that is marginally over-broad, since the FY2081/82 report shows the CIAA filed two money-laundering cases itself. Three limits travel with this: only {{years}} of the 14 years and one of the 13 offence families have been checked at case level; {{unexplained}} of the {{surplus}} surplus cases remain unexplained; and the reading that the annual report under-counts its own fake-credential filings is established for four specific cases and well supported for the rest, not proven for all.", { excluded: cc.nonCiaaStreams, years: cc.yearsExamined, unexplained: surplusUnexplained, surplus: cc.registerSurplus })}{" "}
                <a href={CITATIONS.ciaaReports} className="text-accent hover:underline">{t("research.corruption.cite.ciaaReports", "CIAA annual reports")}</a>
              </p>
            </div>

            <details className="mt-8 rounded-xl border border-border bg-muted/20 p-5">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                {t("research.corruption.appendix.summary", "Full methodology, discrepancies & limits")}
              </summary>
              <div className="mt-4 space-y-3 text-xs leading-5 text-muted-foreground">
                <p>{t("research.corruption.appendix.corpus", "Corpus. Of ~12,600 Special Court records, most are procedural petitions. We isolate CIAA prosecutions as the Special Court's -CR- criminal register — 2,949 cases filed FY2069/70–2082/83 (the register is the definition; no plaintiff filter) — of which 2,795 are substantive corruption charges after removing money-laundering (a separate statute, 93 cases) and unclassified matters (61).")}</p>
                <p>{t("research.corruption.appendix.grain", "Grain. One verdict per case, because that is all the court publishes — there is no per-accused outcome in the record, so no figure on this page is a per-person rate. “Partial” therefore covers both a single accused convicted on some charges only and a multi-accused case split between conviction and acquittal; the two are indistinguishable in the source.")}</p>
                <p>{t("research.corruption.appendix.funnel", "The funnel. Of 28,554 newly registered complaints in the year, only 947 (3.3%) went to a full investigation; most of the rest were screened out at intake — shelved or referred — much of it legitimate (outside the CIAA's jurisdiction, no supporting evidence, or duplicates). Of the complaints it fully investigated, the CIAA filed charges in 137 — about 1 in 7. The 37,026 “दर्ता” headline for the same year is the Commission's total workload, which adds 8,472 complaints carried over unresolved from earlier years; starting the funnel there would count those twice. So “0.5% of all complaints reach court” and “~1 in 7 of the complaints it investigates is prosecuted” are both true and measure different stages.")}</p>
                <p>{t("research.corruption.appendix.outcomes", "Outcomes. Verdicts are coded per hearing as convicted / acquitted / partial; each case is taken at its terminal deciding hearing. The conviction rate is over the 2,728 register cases carrying an unambiguous ठहर / आंशिक / सफाई disposition. That is a different set from the 2,740 whose case status reads फैसला (which the filed-vs-decided trend counts), and neither contains the other: 2,628 cases are in both, 112 are marked decided but carry no hearing with a recorded disposition, and 100 carry a disposition without the corresponding status.")}</p>
                <p>{t("research.corruption.appendix.derivedVerdicts", "Where a verdict came from. Cases that reached the mirror without ever appearing on a published cause list carry no court-published disposition, so the only way to count them at all is to read the verdict out of the judgment text. {{n}} verdicts were recovered that way (37 conviction, 26 acquittal, 6 partial) and every one of them is EXCLUDED from every rate on this page — a rate that quietly mixed court-published and machine-read verdicts would misrepresent its own source. We report the number rather than filtering silently.", { n: REPORT.verdictsModelDerivedExcluded })}</p>
                <p>{t("research.corruption.appendix.dates", "Dates. Verdict dates are parsed from the case status text; filings from the registration date. Bikram Sambat dates throughout; by-year charts bin by fiscal year (Shrawan–Ashadh).")}</p>
                <p>{t("research.corruption.appendix.overTime", "Over time. Yearly rates are grouped by verdict fiscal year; the sharp rise in acquittals from FY2078/79 is a genuine surge in the record, not a coding artifact. Time-to-verdict is measured by filing cohort: cohorts through FY2079/80 are essentially fully decided, but recent cohorts are still open, so their apparent speed reflects only the cases already resolved (survivorship) and is drawn as provisional.")}</p>
                <p>{t("research.corruption.appendix.justice", "Per-justice. Attribution is bench-grain: every member of a panel is credited with the panel's outcome, so this describes the benches a justice sat on, not that justice's individual effect. It is descriptive, and small differences are noise.")}</p>
                <p>{t("research.corruption.appendix.discrepancy", "Discrepancy with CIAA figures. The CIAA's {{ciaa}}% “success” rate for FY2081/82 counts full and partial convictions together — its 35th report states it as 87 full plus 120 partial of 393 verdicts. Our headline {{full}}% is full convictions only. Applying the CIAA's own definition to this archive gives {{incl}}%, which is above its figure, not below it — so the two differ by period at least as much as by definition: the CIAA's is one volatile year (its published rates range from 33% to 88%), ours is cumulative across 14. Never compare them without aligning both.", { ciaa: REPORT.ciaa.successRatePct, full: convPct, incl: convPct + partPct })}</p>
                <p>{t("research.corruption.appendix.crossCheck", "The cross-check, in detail. Matching the reports' per-case filing tables to the register is name matching, not a key lookup: the early high-divergence years print no case number at all, and a case number alone does not identify a court in any event — the same NNN-CR-NNNN format is used by the Special Court, the Supreme Court and the district courts, so a number lifted out of its column resolves to the wrong case. Names were matched after folding Devanagari spelling variants, and the residue was resolved by hand on the date: every pair we accepted matches the printed filing date to the register's registration date to the day. Three pairs were accepted this way and are flagged as such in the published data, so a reader who rejects them can re-derive the totals without them.")}</p>
                <p>{t("research.corruption.appendix.entity", "Identity. Only ~7% of distinct defendants (607 of 8,321) are resolved to a canonical, cross-referenced identity, so office-level and repeat-offender cuts are deferred as low-confidence.")}</p>
                <p>
                  {t("research.corruption.appendix.likhitPre", "Reading the source PDFs. The CIAA reports are Nepali-language PDFs set in legacy Devanagari fonts that ordinary tools garble. We convert them to clean, checkable Markdown with ")}
                  <a href="https://github.com/Jawafdehi/likhit" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{t("research.corruption.appendix.likhitName", "likhit")}</a>
                  {t("research.corruption.appendix.likhitPost", " — Jawafdehi's open-source universal Nepali document-to-markdown converter — then verify every figure by eye against the original page.")}
                </p>
                <p>{t("research.corruption.appendix.limits", "Limits. These are the records in the archive as of the snapshot date ({{bs}} BS); figures update as new records are mirrored. Appellate outcomes are largely missing from what we hold, and we have not found any source for amounts actually recovered — so treat both as open questions on our side rather than settled absences. Corrections and pointers to sources we have missed are welcome.", { bs: REPORT.snapshotBs })}</p>
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
