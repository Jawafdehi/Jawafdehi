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

export function statusColor(s: FeedbackStatus): string {
  switch (s) {
    case "submitted":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "in_review":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "resolved":
      return "bg-green-100 text-green-800 border-green-200";
    case "closed":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

// A corruption report is the one type that isn't feedback about the platform —
// it's an allegation from a member of the public, and it should not scroll past
// looking like a bug report. Rose rather than red, which the review surfaces
// already use to mean REJECT/failed.
export function typeColor(ft: AdminFeedbackType): string {
  return ft === "case_report"
    ? "bg-rose-100 text-rose-800 border-rose-200"
    : "bg-slate-100 text-slate-700 border-slate-200";
}
