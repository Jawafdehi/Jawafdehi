
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
    <section id="missing-details" className="mb-12 scroll-mt-28">
      <CaseSectionHeading>{title}</CaseSectionHeading>
      <div className="measure-prose overflow-hidden text-lg leading-8 text-primary/85 [&_li]:ml-0 [&_li]:pl-1.5 [&_li]:marker:text-muted-foreground [&_ol]:my-0 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:my-0 [&_ul]:list-disc [&_ul]:pl-6">
        <ResponsiveTable html={html} />
      </div>
    </section>
  );
}
