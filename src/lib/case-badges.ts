import { cn } from "@/lib/utils";

export type CaseBadgeKind = "status" | "case-type" | "tag";

export type CaseStatusValue =
  | "DRAFT"
  | "IN_REVIEW"
  | "PUBLISHED"
  | "CLOSED"
  | "ongoing"
  | "concluded"
  | "under_appeal"
  | "resolved"
  | "under-investigation"
  | "closed"
  | "others"
  | string
  | null
  | undefined;

export type CaseTypeValue = string | null | undefined;

const basePillClassName =
  "rounded-full border px-3 py-1 text-xs font-medium leading-4 shadow-sm";

const statusPillClassNames: Record<string, string> = {
  DRAFT: "border-border/70 bg-muted text-muted-foreground hover:bg-muted/80",
  IN_REVIEW: "border-border/70 bg-muted text-muted-foreground hover:bg-muted/80",
  PUBLISHED: "border-transparent bg-alert-strong text-white hover:bg-alert-strong/90 dark:bg-alert dark:text-primary-surface",
  CLOSED: "border-transparent bg-success-strong text-white hover:bg-success-strong/90 dark:bg-success dark:text-primary-surface",
  ongoing: "border-transparent bg-alert-strong text-white hover:bg-alert-strong/90 dark:bg-alert dark:text-primary-surface",
  concluded: "border-transparent bg-success-strong text-white hover:bg-success-strong/90 dark:bg-success dark:text-primary-surface",
  under_appeal: "border-transparent bg-alert-strong text-white hover:bg-alert-strong/90 dark:bg-alert dark:text-primary-surface",
  "under-appeal": "border-transparent bg-alert-strong text-white hover:bg-alert-strong/90 dark:bg-alert dark:text-primary-surface",
  resolved: "border-transparent bg-success-strong text-white hover:bg-success-strong/90 dark:bg-success dark:text-primary-surface",
  closed: "border-transparent bg-success-strong text-white hover:bg-success-strong/90 dark:bg-success dark:text-primary-surface",
  "under-investigation": "border-border/70 bg-muted text-muted-foreground hover:bg-muted/80",
  UNDER_INVESTIGATION: "border-border/70 bg-muted text-muted-foreground hover:bg-muted/80",
  others: "border-border/70 bg-muted text-muted-foreground hover:bg-muted/80",
};

const caseTypePillClassNames: Record<string, string> = {
  CORRUPTION: "border-transparent bg-accent/10 text-accent hover:bg-accent/15",
};

const CASE_STATUS_LABEL_KEYS: Record<string, string> = {
  DRAFT: "caseDetail.status.underInvestigation",
  IN_REVIEW: "caseDetail.status.underInvestigation",
  PUBLISHED: "caseDetail.status.ongoing",
  CLOSED: "caseDetail.status.resolved",
  ongoing: "caseDetail.status.ongoing",
  concluded: "caseDetail.status.concluded",
  under_appeal: "caseDetail.status.underAppeal",
  "under-appeal": "caseDetail.status.underAppeal",
  resolved: "caseDetail.status.resolved",
  closed: "caseDetail.status.resolved",
  "under-investigation": "caseDetail.status.underInvestigation",
  UNDER_INVESTIGATION: "caseDetail.status.underInvestigation",
  others: "caseDetail.status.underInvestigation",
};

function normalizedLookupKeys(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return [];

  return [
    trimmed,
    trimmed.toUpperCase(),
    trimmed.replace(/_/g, "-").toLowerCase(),
    trimmed.replace(/-/g, "_").toUpperCase(),
  ];
}

function resolveClassName(
  classNames: Record<string, string>,
  value: string | null | undefined,
  fallback: string,
) {
  const key = normalizedLookupKeys(value).find((lookupKey) => classNames[lookupKey]);
  return key ? classNames[key] : fallback;
}

export function getCaseBadgeClassName(kind: CaseBadgeKind, value?: string | null, className?: string) {
  if (kind === "status") {
    return cn(
      basePillClassName,
      "font-semibold",
      resolveClassName(statusPillClassNames, value, statusPillClassNames.others),
      className,
    );
  }

  if (kind === "case-type") {
    return cn(
      basePillClassName,
      "font-semibold",
      resolveClassName(
        caseTypePillClassNames,
        value,
        "border-primary/15 bg-primary/10 text-primary hover:bg-primary/15",
      ),
      className,
    );
  }

  return cn(
    basePillClassName,
    "border-primary/10 bg-primary/5 text-primary/80 hover:bg-primary/10",
    className,
  );
}

export function getCaseStatusLabelKey(status: CaseStatusValue) {
  const key = normalizedLookupKeys(status).find(
    (lookupKey) => CASE_STATUS_LABEL_KEYS[lookupKey],
  );
  return key ? CASE_STATUS_LABEL_KEYS[key] : "caseDetail.status.underInvestigation";
}

/** Stage dates a case chip is derived from. */
export interface CaseStageDates {
  trial_end_date?: string | null;
  appeal_start_date?: string | null;
  appeal_end_date?: string | null;
}

function isBlank(value: string | null | undefined) {
  return !value || value.trim() === "";
}

/**
 * Derive the status shown on a public case chip from the case's workflow state
 * and its stage dates, rather than assuming every published case is "ongoing".
 * An appealed verdict puts the case back before the Supreme Court, so a pending
 * appeal outranks the trial verdict; a decided appeal, or a trial verdict never
 * appealed, reads "concluded". Draft/in-review cases keep their workflow state
 * so the reviewer-facing chip is unchanged; an explicit CLOSED state also wins.
 */
export function deriveCaseStatus(
  state: string | null | undefined,
  dates: CaseStageDates,
): CaseStatusValue {
  // Normalize case and separators so a lowercase/mixed-case API value
  // ("draft", "in-review", "closed") is compared the same as its canonical form.
  const normalizedState = state?.trim().toUpperCase().replace(/-/g, "_");

  if (normalizedState === "DRAFT" || normalizedState === "IN_REVIEW") return normalizedState;
  if (normalizedState === "CLOSED") return "CLOSED";

  if (!isBlank(dates.appeal_start_date) && isBlank(dates.appeal_end_date)) return "under_appeal";

  if (!isBlank(dates.trial_end_date)) return "concluded";

  return normalizedState || "PUBLISHED";
}
