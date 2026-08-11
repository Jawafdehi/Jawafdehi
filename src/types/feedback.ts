// Staff-facing feedback types. The submission-side types (FeedbackSubmission,
// FeedbackResponse) live in services/jds-api.ts with the public form; these
// describe what the ADMIN queue reads back from /api/feedback-submissions/.
//
// Deliberately absent: the reporter's name, contact methods, IP address, user
// agent, and the attachment URL. The API does not serialize any of them — staff
// see `hasContactInfo` / `hasAttachment` and nothing more. Retrieving the actual
// details is a superuser action in Django admin. Don't add them here expecting
// the server to fill them in; it won't.

// Matches cases.models.FeedbackType.
export type AdminFeedbackType =
  | "bug"
  | "feature"
  | "usability"
  | "content"
  | "general"
  | "case_report";

// Matches cases.models.FeedbackStatus.
export type FeedbackStatus = "submitted" | "in_review" | "resolved" | "closed";

export const FEEDBACK_STATUSES: readonly FeedbackStatus[] = [
  "submitted",
  "in_review",
  "resolved",
  "closed",
] as const;

export const FEEDBACK_TYPES: readonly AdminFeedbackType[] = [
  "bug",
  "feature",
  "usability",
  "content",
  "general",
  "case_report",
] as const;

export interface FeedbackSubmissionRow {
  id: number;
  feedbackType: AdminFeedbackType;
  subject: string;
  description: string;
  relatedPage: string;
  status: FeedbackStatus;
  adminNotes: string;
  /** An attachment exists, but this endpoint does not expose the file. */
  hasAttachment: boolean;
  /** Contact details exist, but this endpoint does not expose them. */
  hasContactInfo: boolean;
  submittedAt: string;
  updatedAt: string;
}

/**
 * The only fields triage may move. Send just the ones that changed — a blanket
 * PATCH would carry this tab's stale copy of the others and silently revert a
 * concurrent edit by another triager.
 */
export interface FeedbackTriagePatch {
  status?: FeedbackStatus;
  adminNotes?: string;
  /** Re-file a mis-classified submission (e.g. a corruption report sent as "general"). */
  feedbackType?: AdminFeedbackType;
}
