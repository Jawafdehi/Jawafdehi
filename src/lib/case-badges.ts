import { cn } from "@/lib/utils";

export type CaseBadgeKind = "status" | "case-type" | "tag";

export type CaseStatusValue =
  | "DRAFT"
  | "IN_REVIEW"
  | "PUBLISHED"
  | "CLOSED"
  | "ongoing"
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
  PUBLISHED: "border-transparent bg-alert text-alert-foreground hover:bg-alert/90",
  CLOSED: "border-transparent bg-success text-success-foreground hover:bg-success/90",
  ongoing: "border-transparent bg-alert text-alert-foreground hover:bg-alert/90",
  resolved: "border-transparent bg-success text-success-foreground hover:bg-success/90",
  closed: "border-transparent bg-success text-success-foreground hover:bg-success/90",
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
