
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { CaseSectionHeading } from "@/components/case-detail/case-section-heading";

interface MissingDetailsSectionProps {
  html: string | null | undefined;
  title: string;
}

export function MissingDetailsSection({
  html,
  title,
}: Readonly<MissingDetailsSectionProps>) {
  if (!html) return null;

  return (
    <section id="missing-details" className="mb-16 scroll-mt-28">
      <CaseSectionHeading>{title}</CaseSectionHeading>
      <div className="measure-prose overflow-hidden text-lg leading-8 text-primary/85">
        <ResponsiveTable html={html} />
      </div>
    </section>
  );
}
