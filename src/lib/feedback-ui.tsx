// Presentational helpers for the admin feedback queue.
//
// Convention (same as lib/proposal-ui): helpers that return PROSE take `t` and
// return an already-translated string, so a caller never concatenates a
// translated fragment with an untranslated one. Colour-only helpers don't take
// `t` — there is no language in a class name.
import type { TFunction } from "i18next";
import type { AdminFeedbackType, FeedbackStatus } from "@/types/feedback";

export function statusLabel(s: FeedbackStatus, t: TFunction): string {
  switch (s) {
    case "submitted":
      return t("admin.feedback.status.submitted", "New");
    case "in_review":
      return t("admin.feedback.status.in_review", "In review");
    case "resolved":
      return t("admin.feedback.status.resolved", "Resolved");
    case "closed":
      return t("admin.feedback.status.closed", "Closed");
    default:
      return s;
  }
}

export function typeLabel(ft: AdminFeedbackType, t: TFunction): string {
  switch (ft) {
    case "bug":
      return t("admin.feedback.type.bug", "Bug");
    case "feature":
      return t("admin.feedback.type.feature", "Feature request");
    case "usability":
      return t("admin.feedback.type.usability", "Usability");
    case "content":
      return t("admin.feedback.type.content", "Content");
    case "general":
      return t("admin.feedback.type.general", "General");
    case "case_report":
      return t("admin.feedback.type.case_report", "Corruption report");
    default:
      return ft;
  }
}

// Tinted pills: a 10-15% wash of the semantic token with its dark variant
// carrying the text, which is the same shape as the -100/-200/-800 palette trio
// these replaced. --alert and --success are bright enough that their own value
// cannot carry text on their own tint, so those two use the -strong variants;
// --info and --accent are already dark and do not need one.
export function statusColor(s: FeedbackStatus): string {
  switch (s) {
    case "submitted":
      return "bg-info/10 text-info border-info/20";
    case "in_review":
      return "bg-alert/15 text-alert-strong border-alert/25";
    case "resolved":
      return "bg-success/10 text-success-strong border-success/20";
    case "closed":
      return "bg-muted text-muted-foreground border-border/70";
    default:
      return "bg-muted text-muted-foreground border-border/70";
  }
}

// A corruption report is the one type that isn't feedback about the platform —
// it's an allegation from a member of the public, and it should not scroll past
// looking like a bug report. It was rose rather than red, deliberately, because
// the review surfaces already use red to mean REJECT/failed.
//
// So this maps to --accent, the brand crimson, and NOT to --danger: mapping it
// to danger would collapse exactly the distinction the previous colour existed
// to draw. It also matches what case-badges.ts already gives the CORRUPTION
// case type — bg-accent/10 text-accent — so a corruption report and a
// corruption case now read as the same thing, which they are.
export function typeColor(ft: AdminFeedbackType): string {
  return ft === "case_report"
    ? "bg-accent/10 text-accent border-accent/20"
    : "bg-muted text-muted-foreground border-border/70";
}
