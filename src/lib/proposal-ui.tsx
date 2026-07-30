// Presentational helpers for the case-update-proposal review queue.
// Mirrors the badge/color idiom of lib/casework-ui.ts.
//
// Every helper that produces user-facing prose takes the caller's `t` and returns
// a translated string, following the lib/data-quality.ts idiom (key + inline
// English default). Keys live under `admin.proposals.*` in en.json / ne.json.
import type {
  CaseUpdateProposal,
  Intent,
  IntentType,
  ProposalStatus,
  SignalSource,
} from "@/types/proposals";
import type { TFunction } from "i18next";
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

export function confidenceBand(c: number, t: TFunction): Band {
  if (c >= 0.9)
    return {
      label: t("admin.proposals.band.high", "High"),
      pill: "bg-green-100 text-green-800 border-green-200",
      hex: "#16a34a",
    };
  if (c >= 0.6)
    return {
      label: t("admin.proposals.band.medium", "Medium"),
      pill: "bg-amber-100 text-amber-800 border-amber-200",
      hex: "#d97706",
    };
  return {
    label: t("admin.proposals.band.low", "Low"),
    pill: "bg-red-100 text-red-700 border-red-200",
    hex: "#dc2626",
  };
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

const SOURCE_ICON: Record<SignalSource, LucideIcon> = {
  ngm_docket: Gavel,
  court_order: ScrollText,
  ciaa_press: Megaphone,
  news: Newspaper,
  caseworker: UserRound,
};

const SOURCE_PILL: Record<SignalSource, string> = {
  ngm_docket: "bg-indigo-100 text-indigo-800 border-indigo-200",
  court_order: "bg-teal-100 text-teal-800 border-teal-200",
  ciaa_press: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  news: "bg-orange-100 text-orange-800 border-orange-200",
  caseworker: "bg-slate-100 text-slate-700 border-slate-200",
};

const SOURCE_FALLBACK: Record<SignalSource, string> = {
  ngm_docket: "Court docket",
  court_order: "Court order",
  ciaa_press: "CIAA press",
  news: "News",
  caseworker: "Caseworker",
};

export function sourceMeta(k: SignalSource, t: TFunction): SourceMeta {
  return {
    label: t(`admin.proposals.sources.${k}`, SOURCE_FALLBACK[k]),
    icon: SOURCE_ICON[k],
    pill: SOURCE_PILL[k],
  };
}

// ---- status ---------------------------------------------------------------

const STATUS_FALLBACK: Record<ProposalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  superseded: "Superseded",
};

export function statusLabel(s: ProposalStatus, t: TFunction): string {
  return t(`admin.proposals.statuses.${s}`, STATUS_FALLBACK[s]);
}

// ---- intent ---------------------------------------------------------------

const INTENT_FALLBACK: Record<IntentType, string> = {
  append_timeline_entry: "Add timeline entry",
  set_status: "Change status",
  link_material: "Link material",
  raw_patch: "Raw patch",
};

export function intentLabel(type: IntentType, t: TFunction): string {
  return t(`admin.proposals.intents.${type}`, INTENT_FALLBACK[type]);
}

// One-line summary for a list row.
export function intentSummary(i: Intent, t: TFunction): string {
  switch (i.type) {
    case "append_timeline_entry":
      return i.entry.title;
    case "set_status":
      return `${i.from ?? "—"} → ${i.to}`;
    case "link_material":
      return `${i.relation}: ${shortIri(i.material)}`;
    case "raw_patch": {
      const ops = t("admin.proposals.opCount", {
        defaultValue: "{{count}} ops",
        count: i.patch.length,
      });
      return `${ops}: ${i.patch.map((p) => p.path).join(", ")}`;
    }
  }
}

// What approving this proposal does — a plain-language reassurance for the reviewer.
export function applyEffect(i: Intent, t: TFunction): string {
  switch (i.type) {
    case "append_timeline_entry":
      return t(
        "admin.proposals.effects.append_timeline_entry",
        "Appends this entry to the case's public timeline.",
      );
    case "set_status":
      return t("admin.proposals.effects.set_status", {
        defaultValue: "Sets the case {{field}} field to “{{to}}”.",
        field: i.field,
        to: i.to,
      });
    case "link_material":
      return t(
        "admin.proposals.effects.link_material",
        "Attaches an existing document to the case (no new document is created).",
      );
    case "raw_patch":
      return t(
        "admin.proposals.effects.raw_patch",
        "Applies these RFC-6902 operations to the case record.",
      );
  }
}

export function dateBoth(ad: string, bs?: string, uncertain?: boolean): string {
  const base = bs ? `${ad}  ·  BS ${bs}` : ad;
  return uncertain ? `${base}  (±1d)` : base;
}

// Automation vs human, humanised.
export function detectedByLabel(d: string, t: TFunction): string {
  if (d.startsWith("caseworker:"))
    return t("admin.proposals.caseworkerNamed", {
      defaultValue: "Caseworker ({{who}})",
      who: d.split(":")[1],
    });
  if (d.startsWith("consumer:")) return t("admin.proposals.automation", "Automation");
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
