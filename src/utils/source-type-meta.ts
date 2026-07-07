import type { DocumentSourceType } from "@/types/jds";

export type SourceTypeTone =
  | "allegation"
  | "financial"
  | "government"
  | "investigative"
  | "legal"
  | "media"
  | "policy"
  | "public"
  | "social"
  | "neutral";

type SourceTypeMetadata = {
  labelKey?: string;
  tone: SourceTypeTone;
};

export const SOURCE_TYPE_METADATA: Record<string, SourceTypeMetadata> = {
  AG_ABHIYOG_PATRA: { labelKey: "sourceType.AG_ABHIYOG_PATRA", tone: "allegation" },
  FINANCIAL_FORENSIC: { labelKey: "sourceType.FINANCIAL_FORENSIC", tone: "financial" },
  INTERNAL_CORPORATE: { labelKey: "sourceType.INTERNAL_CORPORATE", tone: "neutral" },
  INVESTIGATIVE_REPORT: { labelKey: "sourceType.INVESTIGATIVE_REPORT", tone: "investigative" },
  LEGAL_COURT_ORDER: { labelKey: "sourceType.LEGAL_COURT_ORDER", tone: "legal" },
  LEGAL_PROCEDURAL: { labelKey: "sourceType.LEGAL_PROCEDURAL", tone: "legal" },
  LEGISLATIVE_DOC: { labelKey: "sourceType.LEGISLATIVE_DOC", tone: "policy" },
  MEDIA_NEWS: { labelKey: "sourceType.MEDIA_NEWS", tone: "media" },
  OFFICIAL_GOVERNMENT: { labelKey: "sourceType.OFFICIAL_GOVERNMENT", tone: "government" },
  OTHER_VISUAL: { labelKey: "sourceType.OTHER_VISUAL", tone: "neutral" },
  PUBLIC_COMPLAINT: { labelKey: "sourceType.PUBLIC_COMPLAINT", tone: "public" },
  SOCIAL_MEDIA: { labelKey: "sourceType.SOCIAL_MEDIA", tone: "social" },
} satisfies Record<DocumentSourceType | "AG_ABHIYOG_PATRA", SourceTypeMetadata>;

export function humanizeSourceType(sourceType: string): string {
  return sourceType
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => {
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function getSourceTypeMetadata(sourceType?: string | null): SourceTypeMetadata {
  if (!sourceType) return { tone: "neutral" };

  const knownMetadata = SOURCE_TYPE_METADATA[sourceType];
  if (knownMetadata) return knownMetadata;

  const normalized = sourceType.toUpperCase();

  if (normalized.includes("ABHIYOG") || normalized.includes("CHARGE") || normalized.includes("INDICT")) {
    return { tone: "allegation" };
  }
  if (normalized.includes("NEWS") || normalized.includes("MEDIA") || normalized.includes("PRESS")) {
    return { tone: "media" };
  }
  if (normalized.includes("COURT") || normalized.includes("LEGAL") || normalized.includes("VERDICT")) {
    return { tone: "legal" };
  }
  if (normalized.includes("GOV") || normalized.includes("CIAA") || normalized.includes("OFFICIAL")) {
    return { tone: "government" };
  }
  if (normalized.includes("COMPLAINT") || normalized.includes("PUBLIC")) {
    return { tone: "public" };
  }
  if (normalized.includes("FINANCIAL") || normalized.includes("FORENSIC")) {
    return { tone: "financial" };
  }
  if (normalized.includes("INVESTIGATIVE") || normalized.includes("REPORT")) {
    return { tone: "investigative" };
  }
  if (normalized.includes("POLICY") || normalized.includes("LEGISLATIVE")) {
    return { tone: "policy" };
  }
  if (normalized.includes("SOCIAL")) {
    return { tone: "social" };
  }

  return { tone: "neutral" };
}
