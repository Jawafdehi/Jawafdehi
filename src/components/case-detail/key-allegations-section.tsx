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

      {/* A hairline list, numbers in the mono face the site uses for figures. */}
      <ol className="divide-y divide-border/70 border-y border-border/70">
        {allegations.map((allegation, index) => (
          <li key={index} className="flex items-start gap-4 py-5 sm:gap-6">
            <span className="mt-1 w-7 shrink-0 font-mono text-sm tabular-nums text-accent">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="measure-prose text-lg leading-8 text-primary/85">{allegation}</p>
          </li>
        ))}
        {allegations.length === 0 && <li className="py-5 text-lg leading-8 text-muted-foreground">{emptyLabel}</li>}
      </ol>
    </section>
  );
}
