/**
 * Source-document processing stats for /data-quality: how many of the archive's
 * documents we publish as a redacted copy, hold back as staff-only, or have not
 * redacted yet, and how many we can actually read (a text layer, OCR, a Word
 * file). Served precomputed by `GET /api/statistics/source-documents/`.
 *
 * Every rule the section applies lives here (the component only renders), so
 * the shape checks, ordering and percentages are unit-tested in one place.
 */
import { adStringToBSString, formatBSString } from "@/utils/bs-calendar";

export const PDF_STATES = [
  "redacted",
  "withheld",
  "not_yet_redacted",
  "publisher_hosted",
  "no_file",
] as const;
export type PdfState = (typeof PDF_STATES)[number];

export const WITHHELD_REASONS = [
  "awaiting_redaction",
  "needs_hand_redaction",
  "unreadable",
  "oversized",
] as const;
export type WithheldReason = (typeof WITHHELD_REASONS)[number];

export const REDACTED_BY = [
  "automatic",
  "converted",
  "staff_hand_redacted",
  "reviewed_no_redaction_needed",
] as const;
export type RedactedBy = (typeof REDACTED_BY)[number];

export const TRANSCRIPT_STATES = ["redacted", "withheld", "none"] as const;
export type TranscriptState = (typeof TRANSCRIPT_STATES)[number];

export const TEXT_KINDS = [
  "pdf_text_layer",
  "pdf_ocr",
  "word",
  "image",
  "web_page",
  "pdf_unrecorded",
  "other",
] as const;
export type TextKind = (typeof TEXT_KINDS)[number];

export const DOC_GROUPS = [
  "court_order",
  "charge_sheet",
  "ciaa_press_release",
  "police_press_release",
] as const;
export type DocGroup = (typeof DOC_GROUPS)[number];

export const SCOPES = ["published_cases", "archive"] as const;
export type Scope = (typeof SCOPES)[number];

export interface GroupRow {
  group: DocGroup;
  total: number;
  with_text: number;
  redacted_pdf: number;
  withheld: number;
}

export interface SourceDocBlock {
  total: number;
  cases: number | null;
  pdf: Record<PdfState, number>;
  redacted_by: Record<RedactedBy, number>;
  withheld_reasons: Record<WithheldReason, number>;
  transcript: Record<TranscriptState, number>;
  text: { with_text: number; without_text: number; by_kind: Record<TextKind, number> };
  by_group: GroupRow[];
}

export interface SourceDocStats {
  as_of: string;
  scopes: Record<Scope, SourceDocBlock>;
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

function hasCounts(obj: unknown, keys: readonly string[]): boolean {
  if (!obj || typeof obj !== "object") return false;
  const rec = obj as Record<string, unknown>;
  return keys.every((k) => isCount(rec[k]));
}

function isBlock(value: unknown): value is SourceDocBlock {
  if (!value || typeof value !== "object") return false;
  const b = value as Record<string, unknown>;
  const text = b.text as Record<string, unknown> | undefined;
  return (
    isCount(b.total) &&
    (b.cases === null || isCount(b.cases)) &&
    hasCounts(b.pdf, PDF_STATES) &&
    hasCounts(b.transcript, TRANSCRIPT_STATES) &&
    !!text &&
    isCount(text.with_text) &&
    isCount(text.without_text) &&
    Array.isArray(b.by_group) &&
    b.by_group.every(
      (row: unknown) =>
        !!row &&
        typeof row === "object" &&
        typeof (row as Record<string, unknown>).group === "string" &&
        hasCounts(row, ["total", "with_text", "redacted_pdf", "withheld"]),
    )
  );
}

/**
 * The payload when it is complete enough to draw, else null. The API and this
 * app deploy independently, so an older API (404), an empty snapshot (503) or
 * a shape we do not know must hide the section rather than draw zeros that
 * read as facts.
 */
export function parseSourceDocStats(value: unknown): SourceDocStats | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const scopes = v.scopes as Record<string, unknown> | undefined;
  if (typeof v.as_of !== "string" || !scopes) return null;
  if (!SCOPES.every((s) => isBlock(scopes[s]))) return null;
  return value as SourceDocStats;
}

/** Share of `whole`, rounded DOWN to one decimal so a gap never rounds away. */
export function sharePct(part: number, whole: number): number {
  if (!whole || whole <= 0) return 0;
  return Math.floor((part / whole) * 1000) / 10;
}

export interface Segment<K extends string> {
  key: K;
  count: number;
  pct: number;
}

/**
 * Counts in a fixed display order, with each share of the total. Missing keys
 * count as 0 so an optional sub-breakdown the API has not shipped yet does not
 * throw; zero rows are kept (a 0 is a fact worth showing) unless `dropZero`.
 */
export function segments<K extends string>(
  counts: Partial<Record<K, number>> | undefined,
  order: readonly K[],
  total: number,
  dropZero = false,
): Segment<K>[] {
  return order
    .map((key) => {
      const count = isCount(counts?.[key]) ? (counts?.[key] as number) : 0;
      return { key, count, pct: sharePct(count, total) };
    })
    .filter((s) => !dropZero || s.count > 0);
}

/** The four named groups in their fixed order; absent ones read as zeros. */
export function groupRows(block: SourceDocBlock): GroupRow[] {
  return DOC_GROUPS.map(
    (group) =>
      block.by_group.find((row) => row?.group === group) ?? {
        group,
        total: 0,
        with_text: 0,
        redacted_pdf: 0,
        withheld: 0,
      },
  );
}

/**
 * The snapshot date as the reader's calendar writes it: Bikram Sambat in
 * Nepali ("२०८३ मंसिर ११"), a plain day-month-year in English. Read in
 * Nepal time, since that is the day the figures describe for most readers.
 */
export function formatAsOf(iso: string, language: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  if (language.startsWith("ne")) {
    return formatBSString(adStringToBSString(ymd)) ?? ymd;
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
