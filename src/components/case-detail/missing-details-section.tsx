
import { ResponsiveTable } from "@/components/ResponsiveTable";

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
    <section id="missing-details" className="mb-6 scroll-mt-28 border-t border-border pt-5 max-w-4xl">
      <h2 className="font-subsection-title mb-4 flex items-center">
        {title}
      </h2>
      <div className="font-paragraph measure-prose overflow-hidden">
        <ResponsiveTable html={html} />
      </div>
    </section>
  );
}
