// PROTOTYPE — presentational helpers for the case-update-proposal review queue.
// Mirrors the badge/color idiom of lib/casework-ui.ts.
import type {
  CaseUpdateProposal,
  Intent,
  IntentType,
  ProposalStatus,
  SignalSource,
} from "@/types/proposals";
import {
  Gavel,
  ScrollText,
  Megaphone,
  Newspaper,
  UserRound,
  type LucideIcon,
} from "lucide-react";

// ---- confidence -----------------------------------------------------------

export interface Band {
  label: string;
  pill: string; // tailwind pill classes
  hex: string; // for the meter fill
}

export function confidenceBand(c: number): Band {
  if (c >= 0.9) return { label: "High", pill: "bg-green-100 text-green-800 border-green-200", hex: "#16a34a" };
  if (c >= 0.6) return { label: "Medium", pill: "bg-amber-100 text-amber-800 border-amber-200", hex: "#d97706" };
  return { label: "Low", pill: "bg-red-100 text-red-700 border-red-200", hex: "#dc2626" };
}

export function pct(c: number): string {
  return `${Math.round(c * 100)}%`;
}

// ---- status ---------------------------------------------------------------

export function statusPill(s: ProposalStatus): string {
  switch (s) {
    case "approved":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    case "superseded":
      return "bg-slate-100 text-slate-500 border-slate-200";
  }
}

// ---- source ---------------------------------------------------------------

export interface SourceMeta {
  label: string;
  icon: LucideIcon;
  pill: string;
}

export function sourceMeta(k: SignalSource): SourceMeta {
  switch (k) {
    case "ngm_docket":
      return { label: "Court docket", icon: Gavel, pill: "bg-indigo-100 text-indigo-800 border-indigo-200" };
    case "court_order":
      return { label: "Court order", icon: ScrollText, pill: "bg-teal-100 text-teal-800 border-teal-200" };
    case "ciaa_press":
      return { label: "CIAA press", icon: Megaphone, pill: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200" };
    case "news":
      return { label: "News", icon: Newspaper, pill: "bg-orange-100 text-orange-800 border-orange-200" };
    case "caseworker":
      return { label: "Caseworker", icon: UserRound, pill: "bg-slate-100 text-slate-700 border-slate-200" };
  }
}

// ---- intent ---------------------------------------------------------------

const INTENT_LABEL: Record<IntentType, string> = {
  append_timeline_entry: "Add timeline entry",
  set_status: "Change status",
  link_material: "Link material",
  raw_patch: "Raw patch",
};

export function intentLabel(t: IntentType): string {
  return INTENT_LABEL[t];
}

// One-line summary for a list row.
export function intentSummary(i: Intent): string {
  switch (i.type) {
    case "append_timeline_entry":
      return i.entry.title;
    case "set_status":
      return `${i.from ?? "—"} → ${i.to}`;
    case "link_material":
      return `${i.relation}: ${shortIri(i.material)}`;
    case "raw_patch":
      return `${i.patch.length} op${i.patch.length === 1 ? "" : "s"}: ${i.patch.map((p) => p.path).join(", ")}`;
  }
}

// What approving this proposal does — a plain-language reassurance for the reviewer.
export function applyEffect(i: Intent): string {
  switch (i.type) {
    case "append_timeline_entry":
      return "Appends this entry to the case's public timeline.";
    case "set_status":
      return `Sets the case ${i.field} field to “${i.to}”.`;
    case "link_material":
      return "Attaches an existing document to the case (no new document is created).";
    case "raw_patch":
      return "Applies these RFC-6902 operations to the case record.";
  }
}

export function dateBoth(ad: string, bs?: string, uncertain?: boolean): string {
  const base = bs ? `${ad}  ·  BS ${bs}` : ad;
  return uncertain ? `${base}  (±1d)` : base;
}

// Automation vs human, humanised.
export function detectedByLabel(d: string): string {
  if (d.startsWith("caseworker:")) return `Caseworker (${d.split(":")[1]})`;
  if (d.startsWith("consumer:")) return "Automation";
  return d;
}

export function shortIri(iri: string): string {
  try {
    const u = new URL(iri);
    return u.pathname.replace(/^\/(api\/)?/, "").replace(/\/$/, "") || iri;
  } catch {
    return iri;
  }
}

export function sourceHost(iri: string): string {
  try {
    return new URL(iri).host;
  } catch {
    return iri;
  }
}

// Sort: pending first, then most recent.
export function queueSort(a: CaseUpdateProposal, b: CaseUpdateProposal): number {
  const rank = (s: ProposalStatus) => (s === "pending" ? 0 : 1);
  if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
  return b.created_at.localeCompare(a.created_at);
}
