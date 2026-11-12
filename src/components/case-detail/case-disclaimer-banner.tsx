import { Info } from "@/components/icons";

interface CaseDisclaimerBannerProps {
  children: string;
}

function renderDisclaimerText(text: string) {
  const highlightPattern = /(not a judiciary body|do not have legal authority)/gi;
  const isHighlightedPhrase = /^(not a judiciary body|do not have legal authority)$/i;

  return text.split(highlightPattern).map((part, index) => {
    if (isHighlightedPhrase.test(part)) {
      return (
        <span key={`${part}-${index}`} className="text-primary">
          {part}
        </span>
      );
    }

    return part;
  });
}

/**
 * The legal line every case carries: a quiet grey note with an info mark, the
 * two phrases that matter in navy. It used to sit on a crimson wash, which
 * read as an alarm on every case page.
 */
export function CaseDisclaimerBanner({ children }: Readonly<CaseDisclaimerBannerProps>) {
  return (
    <aside
      aria-label="Case information disclaimer"
      className="no-print mb-8 flex items-start gap-3 rounded-2xl bg-muted/60 px-4 py-3.5 sm:px-5"
    >
      <Info className="mt-1 h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="text-[15px] leading-7 text-muted-foreground">{renderDisclaimerText(children)}</p>
    </aside>
  );
}
