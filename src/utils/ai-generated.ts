import type { AiGeneratedSection } from "@/types/jds";

/** The sections the backend accepts in `ai_generated_sections`, in page order. */
export const AI_GENERATED_SECTIONS: readonly AiGeneratedSection[] = [
  "description",
  "key_allegations",
  "timeline",
];

/** Whether a case's payload marks `section` as AI-generated. Absent means no. */
export function isAiGenerated(
  sections: readonly string[] | null | undefined,
  section: AiGeneratedSection,
): boolean {
  return Array.isArray(sections) && sections.includes(section);
}
