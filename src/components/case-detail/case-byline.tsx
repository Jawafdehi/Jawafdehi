import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CaseBylineProps {
  markdown: string | null | undefined;
}

// Public, caseworker-authored attribution + edit-history byline (Case.public_notes):
// e.g. "Documented by the Jawafdehi research team. First published Shrawan 2082;
// last edited Bhadra 2082." Unlike the internal NotesSection (which the API blanks
// for the public), this is returned to everyone. It renders as understated case
// metadata — sitting with location/period/amount — not as a content section, and is
// markdown-only (no raw HTML) so a hand-written byline can't inject markup.
export function CaseByline({ markdown }: Readonly<CaseBylineProps>) {
  const text = markdown?.trim();

  if (!text) return null;

  return (
    <div
      className="case-byline text-sm text-muted-foreground [&_a]:text-primary [&_a]:hover:underline [&_p]:m-0 [&_p+p]:mt-1"
      data-testid="case-byline"
    >
      <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
    </div>
  );
}
