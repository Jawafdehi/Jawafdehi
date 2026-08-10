import { useTranslation } from "react-i18next";

import type { CaseProgress, StageNode } from "@/lib/case-progress";
import { cn } from "@/lib/utils";
import { formatDateForLanguage } from "@/utils/date";

/**
 * A case's journey through the courts, drawn as a vertical rail.
 *
 * Deliberately shares the visual vocabulary of `research/AccountabilityStages`
 * — same rail geometry, same hollow node and dashed segment for "our record
 * stops here" — because that section tells this same story in aggregate
 * (intake → charging → adjudication → appeal) and the two should read as one
 * system. It is a separate component rather than a shared one because the
 * state models differ: the research rail marks stages we hold NO data for,
 * while a case rail also has to say which step it has REACHED. Collapsing them
 * would blur a distinction both need to keep sharp.
 *
 * Vertical rather than horizontal so Nepali stage labels and dual-calendar
 * dates have room without truncating.
 */
export function CaseProgressRail({ progress, className }: { progress: CaseProgress; className?: string }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { nodes } = progress;

  return (
    <div className={className}>
      <h2 className="font-section-title mb-1 text-primary">{t("caseDetail.progress.heading")}</h2>
      {/* The rail states what OUR RECORD holds, not what the courts did. The
          caveat is part of the claim, so it sits with it rather than in a
          footnote a reader can miss. */}
      <p className="font-caption mb-4 text-muted-foreground">{t("caseDetail.progress.caveat")}</p>

      <ol
        className="relative space-y-0"
        aria-label={nodes.map((n) => t(`caseDetail.progress.stage.${n.key}`)).join(" → ")}
      >
        {nodes.map((node, i) => {
          const last = i === nodes.length - 1;
          // A segment goes dashed when the step it leads INTO is unreached or
          // unknown, so the rail changes character exactly where our record
          // stops rather than one step late.
          const nextSoft = !last && (nodes[i + 1].unknown || !nodes[i + 1].done);
          return (
            <li key={node.key} className="relative flex gap-4 pb-6 last:pb-0">
              {!last && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0 border-l-2",
                    nextSoft ? "border-dashed border-muted" : "border-solid border-accent/30",
                  )}
                />
              )}
              <StageMarker node={node} index={i} />
              <div className="min-w-0 pt-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h3
                    className={cn(
                      "font-card-title",
                      node.done ? "text-foreground" : "text-muted-foreground",
                      node.current && "text-accent",
                    )}
                  >
                    {t(`caseDetail.progress.stage.${node.key}`)}
                  </h3>
                  <span className="font-meta text-muted-foreground">
                    {t(`caseDetail.progress.forum.${node.forum}`)}
                  </span>
                  {node.current && (
                    <span className="font-badge rounded-full bg-accent/10 px-2 py-0.5 text-accent">
                      {t("caseDetail.progress.currentLabel")}
                    </span>
                  )}
                </div>

                {node.verdict && (
                  <p className="font-paragraph font-paragraph-compact mt-1 text-foreground">
                    {t(`caseDetail.progress.verdict.${node.verdict}`)}
                  </p>
                )}

                {node.unknown && (
                  <p className="font-caption mt-1 text-muted-foreground">
                    {t(
                      node.key === "appeal_filed"
                        ? "caseDetail.progress.noAppealRecorded"
                        : "caseDetail.progress.noOutcomeRecorded",
                    )}
                  </p>
                )}

                {/* Two distinct claims, never conflated: a countable deadline
                    inside the 35-day statutory period, and a plainly
                    conditional statement once only the दफा ११ extension could
                    still be running. */}
                {node.key === "trial_verdict" && progress.appealDaysRemaining !== undefined && (
                  <p className="font-caption mt-1 text-muted-foreground">
                    {t("caseDetail.progress.appealWindowOpen", { days: progress.appealDaysRemaining })}
                  </p>
                )}
                {node.key === "trial_verdict" && progress.appealExtensionPossible && (
                  <p className="font-caption mt-1 text-muted-foreground">
                    {t("caseDetail.progress.appealExtensionPossible")}
                  </p>
                )}

                <StageDate node={node} language={language} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StageMarker({ node, index }: { node: StageNode; index: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "font-badge relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
        node.done && !node.unknown
          ? "border-accent bg-accent text-accent-foreground"
          : "border-dashed border-muted-foreground/50 bg-background text-muted-foreground",
      )}
    >
      {index + 1}
    </span>
  );
}

function StageDate({ node, language }: { node: StageNode; language: string }) {
  if (!node.dateAd && !node.dateBs) return null;
  // BS leads in Nepali, AD in English; the other stays visible as context.
  const pair = formatDateForLanguage(node.dateAd, "PP", node.dateBs, language);
  return (
    <p className="font-meta mt-1 text-muted-foreground">
      {pair.primary}
      {pair.secondary ? ` (${pair.secondary})` : ""}
    </p>
  );
}
