
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
      <h2 className="mb-4 flex items-center text-xl md:text-2xl font-semibold tracking-tight text-primary">
        {title}
      </h2>
      <div className="overflow-hidden max-w-4xl text-base md:text-lg leading-[1.7] text-primary/75 [&_.prose_p]:my-2 [&_.prose_p]:leading-relaxed [&_.prose_ul]:my-2 [&_.prose_ol]:my-2 [&_.prose_li]:my-1 [&_.prose_br+br]:hidden">
        <ResponsiveTable html={html} />
      </div>
    </section>
  );
}
