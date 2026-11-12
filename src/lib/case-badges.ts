import { cn } from "@/lib/utils";
import type { CaseStatus } from "@/types/jds";

export type CaseBadgeKind = "status" | "case-type" | "tag";

export type CaseStatusValue =
  | "DRAFT"
  | "IN_REVIEW"
  | "PUBLISHED"
  | "CLOSED"
  | CaseStatus
  // Legacy spellings still served by the search index and older payloads.
  | "resolved"
  | "under-investigation"
  | "closed"
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
  resolved: "border-transparent bg-success-strong text-white hover:bg-success-strong/90 dark:bg-success dark:text-primary-surface",
  closed: "border-transparent bg-success-strong text-white hover:bg-success-strong/90 dark:bg-success dark:text-primary-surface",
  "under-investigation": "border-border/70 bg-muted text-muted-foreground hover:bg-muted/80",
  UNDER_INVESTIGATION: "border-border/70 bg-muted text-muted-foreground hover:bg-muted/80",
  others: "border-border/70 bg-muted text-muted-foreground hover:bg-muted/80",
  // Neither a win nor a loss: a case nobody decided must not wear the green
  // "resolved" pill.
  withdrawn: "border-border/70 bg-muted text-muted-foreground hover:bg-muted/80",
  dormant: "border-border/70 bg-muted text-muted-foreground hover:bg-muted/80",
};

const caseTypePillClassNames: Record<string, string> = {
  CORRUPTION: "border-transparent bg-accent/10 text-accent hover:bg-accent/15",
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

  // Tags are the quietest pill: grey fill, no border, no shadow, regular
  // weight — the same grey as the search page's chips and tabs.
  return cn(
    basePillClassName,
    // 13px, not the pills' 12: tags are mostly Devanagari, whose conjuncts and
    // vowel signs turn to smudge at 12px.
    "border-transparent bg-muted text-[13px] font-normal leading-5 text-primary/75 shadow-none hover:bg-muted/70",
    className,
  );
}

