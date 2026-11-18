import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { CourtChainSource, CourtChainStep } from "@/types/jds";
import { convertToBS, formatDate } from "@/utils/date";
import { formatBSString } from "@/utils/bs-calendar";
import { formatCourtName } from "@/utils/court-case-format";
import { VERDICT_LABELS } from "@/utils/court-hearing-label";
import {
  courtCasePath,
  linkKind,
  parseCourtCaseIri,
  percent,
  PLAIN_LINK_THRESHOLD,
} from "@/utils/court-chain";

function stepDate(bs: string | null, ad: string | null): string | null {
  return (
    formatBSString(bs) ||
    (ad ? convertToBS(ad)?.formatted : null) ||
    (ad ? formatDate(ad, "PP") : null) ||
    null
  );
}

type Translate = ReturnType<typeof useTranslation>["t"];

function stageLabel(t: Translate, stage: string): string {
  if (stage === "initial") return t("courtCaseProfile.chain.stage.initial", "First court");
  if (stage === "review") return t("courtCaseProfile.chain.stage.review", "Review");
  return t("courtCaseProfile.chain.stage.appeal", "Appeal");
}

function CaseRef({
  iri,
  court,
  caseNumber,
  lang,
}: Readonly<{ iri: string; court: string; caseNumber: string; lang: string }>) {
  const path = courtCasePath(iri);
  const label = `${formatCourtName(court, lang)} ${caseNumber}`;
  return path ? (
    <Link
      to={path}
      className="font-medium text-primary underline decoration-primary/35 underline-offset-4 transition-colors hover:text-primary/75 hover:decoration-primary"
    >
      {label}
    </Link>
  ) : (
    <span className="font-medium">{label}</span>
  );
}

function SourceRef({
  source,
  steps,
  lang,
}: Readonly<{ source: CourtChainSource; steps: CourtChainStep[]; lang: string }>) {
  const known = steps.find((s) => s.courtcase_iri === source.courtcase_iri);
  const parts = parseCourtCaseIri(source.courtcase_iri);
  const court = known?.court ?? parts?.court ?? "";
  const caseNumber = known?.case_number ?? parts?.caseNumber.toUpperCase() ?? source.courtcase_iri;
  if (known?.this_case) {
    // The case the page is about: named, never linked to itself.
    return (
      <span className="font-semibold text-foreground">
        {formatCourtName(court, lang)} {caseNumber}
      </span>
    );
  }
  return <CaseRef iri={source.courtcase_iri} court={court} caseNumber={caseNumber} lang={lang} />;
}

/** The sentence under a later step saying what it was appealed from, and how sure we are. */
function LinkLine({
  step,
  steps,
  lang,
}: Readonly<{ step: CourtChainStep; steps: CourtChainStep[]; lang: string }>) {
  const { t } = useTranslation();
  const sources = step.appealed_from ?? [];
  if (sources.length === 0) return null;
  const kind = linkKind(step);
  const muted = "text-sm text-muted-foreground sm:text-base";

  if (kind === "single") {
    const [source] = sources;
    const plain = source.probability >= PLAIN_LINK_THRESHOLD;
    return (
      <p className="text-base leading-relaxed text-foreground" data-link-kind="single">
        {plain
          ? t("courtCaseProfile.chain.appealOf", "Appeal of")
          : t("courtCaseProfile.chain.probablyAppealOf", "Probably an appeal of")}{" "}
        <SourceRef source={source} steps={steps} lang={lang} />{" "}
        <span className={muted}>
          ·{" "}
          {t("courtCaseProfile.chain.likely", {
            pct: percent(source.probability),
            defaultValue: `${percent(source.probability)} likely`,
          })}
        </span>
      </p>
    );
  }

  return (
    <div className="text-base leading-relaxed text-foreground" data-link-kind={kind}>
      <p>
        {kind === "oneOf"
          ? t(
              "courtCaseProfile.chain.oneOf",
              "Possibly an appeal of one of these. We could not tell which:",
            )
          : t("courtCaseProfile.chain.eachOf", "Appeal of each of:")}
      </p>
      <ul className="mt-1 space-y-1">
        {sources.map((source) => (
          <li key={source.courtcase_iri}>
            <SourceRef source={source} steps={steps} lang={lang} />{" "}
            <span className={muted}>
              ·{" "}
              {t("courtCaseProfile.chain.likely", {
                pct: percent(source.probability),
                defaultValue: `${percent(source.probability)} likely`,
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface CourtCaseChainProps {
  /** Absent on an API older than the appeal-links table; treated as none. */
  chain?: CourtChainStep[] | null;
}

/**
 * "Appeal history": the court case's path through the courts, first court
 * first, with a probability on every link (JAW-1). Never names a party; the
 * links are Jawafdehi's, and the section says so. Renders nothing when the case
 * is in no chain.
 */
export function CourtCaseChain({ chain }: Readonly<CourtCaseChainProps>) {
  const { t, i18n } = useTranslation();
  const lang = typeof i18n.language === "string" ? i18n.language : "en";
  const steps = Array.isArray(chain) ? chain : [];
  if (steps.length === 0) return null;

  return (
    <section id="appeals" aria-labelledby="appeals-heading" className="scroll-mt-28">
      <h2
        id="appeals-heading"
        className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
      >
        {t("courtCaseProfile.chain.heading", "Appeal history")}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t(
          "courtCaseProfile.chain.note",
          "Jawafdehi linked these cases from court records; the courts do not publish these links. Each link shows our estimate of how likely it is to be right.",
        )}
      </p>

      <ol className="mt-6 space-y-0" data-testid="court-case-chain">
        {steps.map((step, idx) => {
          const registered = stepDate(step.start_bs, step.start);
          const decided = stepDate(step.end_bs, step.end);
          const verdict = step.verdict_type ? VERDICT_LABELS[step.verdict_type] : undefined;
          const last = idx === steps.length - 1;
          return (
            <li
              key={step.courtcase_iri}
              aria-current={step.this_case ? "page" : undefined}
              className="relative pb-6 pl-7"
            >
              {!last && (
                <span
                  className="absolute left-[7px] top-4 h-full w-px bg-border"
                  aria-hidden="true"
                />
              )}
              <span
                className={`absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 ${
                  step.this_case ? "border-primary bg-primary" : "border-primary/60 bg-background"
                }`}
                aria-hidden="true"
              />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
                  {stageLabel(t, step.stage)}
                </span>
                {step.this_case ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {t("courtCaseProfile.chain.thisCase", "This case")}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-base sm:text-lg">
                {step.this_case ? (
                  <span className="font-semibold text-foreground">
                    {formatCourtName(step.court, lang)} {step.case_number}
                  </span>
                ) : (
                  <CaseRef
                    iri={step.courtcase_iri}
                    court={step.court}
                    caseNumber={step.case_number}
                    lang={lang}
                  />
                )}
                {step.case_type ? (
                  <span className="text-muted-foreground"> · {step.case_type}</span>
                ) : null}
              </div>
              <div className="mt-1 text-sm text-muted-foreground sm:text-base">
                {registered
                  ? t("courtCaseProfile.chain.registered", {
                      date: registered,
                      defaultValue: `Registered ${registered}`,
                    })
                  : null}
                {decided ? (
                  <>
                    {registered ? " · " : null}
                    {t("courtCaseProfile.chain.decided", {
                      date: decided,
                      defaultValue: `Decided ${decided}`,
                    })}
                  </>
                ) : null}
                {verdict ? (
                  <>
                    {" · "}
                    <span className="font-medium text-foreground">
                      {lang.startsWith("ne") ? verdict.ne : verdict.en}
                    </span>
                  </>
                ) : null}
              </div>
              {step.stage !== "initial" ? (
                <div className="mt-2">
                  <LinkLine step={step} steps={steps} lang={lang} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
