import { CaseEntityChips } from "@/components/CaseEntityChips";
import { cn } from "@/lib/utils";
import type { JawafEntity } from "@/types/jds";
import type { Entity } from "@/types/entity";

const RELATION_PRIORITY: Record<string, number> = {
  accused: 1,
  alleged: 2,
  victim: 3,
  witness: 4,
  related: 5,
  opposition: 6,
  unknown: 10,
};

interface InvolvedPartiesSectionProps {
  className?: string;
  groupedEntities: Record<string, JawafEntity[]>;
  language: string;
  resolvedEntities: Record<string, Entity>;
  title: string;
  translateRelation: (relationType: string) => string;
}

export function InvolvedPartiesSection({
  className,
  groupedEntities,
  language,
  resolvedEntities,
  title,
  translateRelation,
}: Readonly<InvolvedPartiesSectionProps>) {
  return (
    <section id="parties-involved" className={cn("mb-12 scroll-mt-28 max-w-4xl", className)}>
      <h2 className="mb-5 text-xl md:text-2xl font-semibold tracking-tight text-primary">
        {title}
      </h2>

      <div className="space-y-7 text-primary/75">
        {Object.entries(groupedEntities)
          .sort(([typeA], [typeB]) => (RELATION_PRIORITY[typeA] ?? 99) - (RELATION_PRIORITY[typeB] ?? 99))
          .map(([type, entities]) => (
            <div key={type} className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="whitespace-nowrap text-base font-semibold  text-accent/90">
                  {translateRelation(type)}
                </h3>

              </div>
              <CaseEntityChips
                entities={entities}
                resolvedEntities={resolvedEntities}
                language={language}
                initialLimit={8}
              />
            </div>
          ))}
      </div>
    </section>
  );
}
