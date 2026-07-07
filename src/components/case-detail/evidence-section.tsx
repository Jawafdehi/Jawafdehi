import { DocumentSourceCard } from "@/components/DocumentSourceCard";
import type { EvidenceEntry } from "@/types/jds";

interface EvidenceSectionProps {
  evidence: EvidenceEntry[];
  title: string;
}

export function EvidenceSection({
  evidence,
  title,
}: Readonly<EvidenceSectionProps>) {
  if (evidence.length === 0) return null;

  return (
    <section id="evidence" className="mb-12 scroll-mt-28 max-w-4xl">
      <h2 className="mb-6 flex items-center text-xl md:text-2xl font-semibold tracking-tight text-primary">
        {title}
      </h2>

      <div className="text-primary/75">
        {evidence.map((evidenceItem, index) => (
          <DocumentSourceCard
            key={evidenceItem.material_iri || index}
            material={evidenceItem.material ?? null}
            materialIri={evidenceItem.material_iri}
            itemNumber={index + 1}
            evidenceDescription={evidenceItem.additional_details}
          />
        ))}
      </div>
    </section>
  );
}
