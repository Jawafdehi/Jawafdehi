import type { StaffOriginals } from "@/services/datalake-api";

/** The staff-only flags on a material payload, or null (public payloads never carry them). */
export function staffOriginalsOf(data: unknown): StaffOriginals | null {
  const value = (data as Record<string, unknown> | undefined)?.[
    "jawafdehi:staffOriginals"
  ];
  if (!value || typeof value !== "object") return null;
  const flags = value as Partial<StaffOriginals>;
  const result = { document: flags.document === true, transcript: flags.transcript === true };
  return result.document || result.transcript ? result : null;
}
