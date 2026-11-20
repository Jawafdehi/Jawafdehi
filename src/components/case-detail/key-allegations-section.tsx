import { CaseSectionHeading } from "@/components/case-detail/case-section-heading";
interface KeyAllegationsSectionProps {
  allegations: string[];
  emptyLabel: string;
  title: string;
  aiGenerated?: boolean;
}

export function KeyAllegationsSection({
  allegations,
  emptyLabel,
  title,
  aiGenerated = false,
}: Readonly<KeyAllegationsSectionProps>) {
  return (
    <section id="allegations" className="mb-16 scroll-mt-28">
      <CaseSectionHeading aiGenerated={aiGenerated}>{title}</CaseSectionHeading>

      {/* A plain numbered list: the number in Inter's tabular figures, set on
          the text's first line, and space (no rules) between allegations. */}
      <ol className="space-y-6">
        {allegations.map((allegation, index) => (
          <li key={index} className="flex items-baseline gap-4 sm:gap-5">
            <span className="w-6 shrink-0 text-base font-medium tabular-nums text-accent">{index + 1}.</span>
            <p className="measure-prose text-lg leading-8 text-primary/85">{allegation}</p>
          </li>
        ))}
        {allegations.length === 0 && <li className="text-lg leading-8 text-muted-foreground">{emptyLabel}</li>}
      </ol>
    </section>
  );
}
