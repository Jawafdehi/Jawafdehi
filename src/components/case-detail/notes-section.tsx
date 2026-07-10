
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
      
      <div className="font-paragraph measure-prose overflow-hidden">
        <ResponsiveTable html={html} />
      </div>
    </section>
  );
}
