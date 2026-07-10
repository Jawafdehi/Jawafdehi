const PIPELINE_STEPS = [
  {
    number: "01",
    title: "Discovery",
    description:
      "Our data scraping team archives government documents, CIAA filings, court records, and CIB reports into digital text. The outreach team simultaneously works with investigative journalists, corruption watchdogs, and media organisations to surface cases not yet in the public record.",
  },
  {
    number: "02",
    title: "Research",
    description:
      "Our research team investigates what constitutes corruption in each case, the role it plays in Nepali governance, and the effectiveness of existing anti-corruption frameworks. Every case is contextualised before it is written up.",
  },
  {
    number: "03",
    title: "Compilation",
    description:
      "The compilation team structures each case: key allegations, timeline of events, entities involved, and all source documents. Cases are written in plain language so citizens — not just lawyers — can understand them.",
  },
  {
    number: "04",
    title: "AI-Assisted Drafting",
    description:
      "AI helps our team process large volumes of legal documents faster — summarising filings, extracting key facts, and flagging inconsistencies. Every AI-generated output is reviewed and approved by a human volunteer before publication.",
  },
  {
    number: "05",
    title: "Verification & Publication",
    description:
      "All cases are cross-referenced against at least two independent sources. Once approved, the case is published to the archive — permanently. Records are never altered without a visible audit trail and never deleted.",
  },
  {
    number: "06",
    title: "Ongoing Tracking",
    description:
      "Published cases are actively monitored for developments: new court orders, verdicts, appeals, and entity responses. Updates are added to the existing case record so the full history is always visible.",
  },
];

export function ProcessTimeline() {
  return (
    <section className="bg-muted/10 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-9 md:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:gap-16">
          {PIPELINE_STEPS.map(({ number, title, description }) => (
            <article key={number} className="relative">
              <div className="mb-4 flex min-h-14 items-end gap-4">
                <div className=" flex-shrink-0 text-5xl font-black leading-none text-accent/80  md:text-4xl">
                  {number}
                </div>
                <h3 className=" text-xl font-bold leading-tight tracking-normal text-foreground md:text-2xl">
                  {title}
                </h3>
              </div>
              <p className="font-paragraph font-paragraph-muted max-w-[34rem]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
