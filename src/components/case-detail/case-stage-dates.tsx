import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { CaseStage } from "@/types/jds";
import { cn } from "@/lib/utils";
import { stageIsPending, stageLabelKey } from "@/utils/case-stages";
import { formatCaseDateRangeForLanguage } from "@/utils/date";
import { formatCourtName } from "@/utils/court-case-format";
import { parseCourtCaseRef } from "@/utils/courtCaseRef";
import "./case-dossier.css";

// The stages of a case, replacing the single "मुद्दा मिति / Case date" range.
// That label read to the public as WHEN THE CORRUPTION HAPPENED, which it
// never was: these are court registration and verdict dates, and a case runs
// through several forums in sequence.
//
// On screen that sequence is the point, so the banner draws it as a horizontal
// timeline — one node per forum, left to right, in the order served. Print
// keeps the stacked label/value rows: a scrolling rail has no meaning on paper.
interface CaseStageDatesProps {
  stages: CaseStage[];
  language: string;
  /** `banner` is the hero timeline; `compact` the print sidebar. */
  variant?: "banner" | "compact";
  className?: string;
}

// The forum a stage was heard in: the court behind its court-case IRI, else
// the investigating/arbitrating `body` as recorded. Two `appeal` rows on the
// same case are otherwise two identical labels.
function stageForum(stage: CaseStage, language: string): string | null {
  const court = parseCourtCaseRef(stage.courtcase_iri)?.court;
  if (court) return formatCourtName(court, language);
  const body = stage.body?.trim();
  return body || null;
}

// Everything a node renders, resolved once so the timeline and the print rows
// cannot describe the same stage differently.
function useStageView(stages: CaseStage[], language: string) {
  const { t } = useTranslation();
  const pendingLabel = t("caseDetail.stagePending");

  return stages.map((stage, index) => ({
    stage,
    index,
    // `other` carries its own label; every other stage is named by the closed
    // vocabulary, so an unlabelled `other` still gets a word.
    label:
      (stage.stage === "other" ? stage.label?.trim() : "") ||
      t(stageLabelKey(stage.stage)),
    forum: stageForum(stage, language),
    pending: stageIsPending(stage),
    // A stage with neither date is pending too — "N/A" would say the case has
    // no dates when what it has is no decision yet.
    range:
      !stage.start && !stage.end
        ? { primary: pendingLabel, secondary: null }
        : formatCaseDateRangeForLanguage(
            stage.start,
            stage.end,
            pendingLabel,
            language,
          ),
  }));
}

// Which ends of the rail still have track beyond them.
//
// Overlay scrollbars — macOS, and every touch device — stay invisible until
// you are ALREADY scrolling, so an eight-stage case looked exactly like the
// five-stage one that happens to fit: the clipped nodes read as the end of the
// case. These flags fade whichever edge has more rail behind it, and a case
// that fits draws neither.
function useScrollEdges(stageCount: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      // 1px of slack: fractional track widths leave a sub-pixel remainder that
      // would otherwise pin the end fade on for a rail already at its end.
      setEdges({ start: el.scrollLeft > 1, end: el.scrollLeft < max - 1 });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });

    // The container resizes with its column and the track with its content (a
    // late font swap alone changes it), so both are watched. Guarded because
    // this component also renders under the SSR prerender.
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(el);
    if (el.firstElementChild) observer?.observe(el.firstElementChild);

    return () => {
      el.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [stageCount]);

  return { ref, edges };
}

function StageStepMarker({ hasNext }: Readonly<{ hasNext: boolean }>) {
  return (
    <div className="case-stage-step" aria-hidden="true">
      <span className="case-stage-dot" />
      {hasNext ? <span className="case-stage-connector" /> : null}
    </div>
  );
}

export function CaseStageDates({
  stages,
  language,
  variant = "banner",
  className,
}: Readonly<CaseStageDatesProps>) {
  const { t } = useTranslation();
  const views = useStageView(stages, language);
  const { ref, edges } = useScrollEdges(stages.length);

  if (stages.length === 0) return null;

  // Print: the original label-left / value-right fact rows, unchanged.
  if (variant === "compact") {
    return (
      <div
        className={cn("case-stage-rows space-y-1", className)}
        data-testid="case-stage-dates"
      >
        {views.map(({ stage, index, label, forum, pending, range }) => (
          <div
            // Stages are an ordered, non-unique list (a remand starts a second
            // first instance), so position is the only stable key.
            key={`${stage.stage}-${index}`}
            data-testid="case-stage-row"
            data-stage={stage.stage}
            data-pending={pending ? "true" : "false"}
          >
            <p className="text-sm font-semibold leading-5 text-primary/60">
              {label}
              {forum ? <span className="font-normal"> · {forum}</span> : null}:
            </p>
            <div className="text-sm font-medium leading-5 text-primary">
              <p>{range.primary}</p>
              {range.secondary ? (
                <p className="text-sm font-normal leading-6 text-primary/65">
                  ({range.secondary})
                </p>
              ) : null}
              {stage.notes?.trim() ? (
                <p
                  className="mt-0.5 text-sm font-normal leading-6 text-muted-foreground"
                  data-testid="case-stage-note"
                >
                  {stage.notes}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    // The wrapper exists only to hang the edge fades on: a pseudo-element on
    // the scroll container itself would scroll away with the content.
    <div
      className={cn("case-stage-timeline-wrap", className)}
      data-single={views.length === 1 ? "true" : "false"}
      data-overflow-start={edges.start ? "true" : "false"}
      data-overflow-end={edges.end ? "true" : "false"}
    >
      <div
        className="case-stage-timeline"
        data-testid="case-stage-dates"
        ref={ref}
        tabIndex={views.length > 1 ? 0 : undefined}
        role="group"
        aria-label={t("caseDetail.caseTimeline")}
      >
        <ol className="case-stage-track">
          {views.map(({ stage, index, label, forum, pending, range }) => (
            <li
              key={`${stage.stage}-${index}`}
              className="case-stage-node"
              data-testid="case-stage-row"
              data-stage={stage.stage}
              data-pending={pending ? "true" : "false"}
            >
              <StageStepMarker hasNext={index < views.length - 1} />

              {/* One dominant line per node, and it is the date: `Appeal` and
                  `First instance` are repeating vocabulary a reader skims past,
                  while the date is the fact that differs node to node. So the
                  stage name is demoted to an eyebrow over it, and the forum and
                  BS date sit under it as supporting rank. */}
              <p className="case-stage-eyebrow">{label}</p>

              <p className="case-stage-date">{range.primary}</p>

              {range.secondary ? (
                <p className="case-stage-date-alt">({range.secondary})</p>
              ) : null}

              {forum ? <p className="case-stage-forum">{forum}</p> : null}

              {stage.notes?.trim() ? (
                <p className="case-stage-note" data-testid="case-stage-note">
                  {stage.notes}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
