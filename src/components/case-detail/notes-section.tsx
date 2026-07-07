
import { ResponsiveTable } from "@/components/ResponsiveTable";

interface NotesSectionProps {
  html: string | null | undefined;
  title: string;
}

export function NotesSection({
  html,
  title,
}: Readonly<NotesSectionProps>) {
  if (!html) return null;

  return (
    <section id="notes" className="mb-12 scroll-mt-28 border-t border-border pt-5 max-w-4xl">
      
      <div className="overflow-hidden max-w-4xl text-base md:text-lg leading-[1.7] text-primary/75">
        <ResponsiveTable html={html} />
      </div>
    </section>
  );
}
