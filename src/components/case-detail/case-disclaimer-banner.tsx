

interface CaseDisclaimerBannerProps {
  children: string;
}

function renderDisclaimerText(text: string) {
  const highlightPattern = /(not a judiciary body|do not have legal authority)/gi;
  const isHighlightedPhrase = /^(not a judiciary body|do not have legal authority)$/i;

  return text.split(highlightPattern).map((part, index) => {
    if (isHighlightedPhrase.test(part)) {
      return (
        <span key={`${part}-${index}`} className="font-semibold text-accent/90">
          {part}
        </span>
      );
    }

    return part;
  });
}

export function CaseDisclaimerBanner({ children }: Readonly<CaseDisclaimerBannerProps>) {
  return (
    <aside
      aria-label="Case information disclaimer"
      className="no-print mb-5 rounded-lg bg-accent/5 px-4 py-3.5 sm:mb-6 sm:px-5"
    >
      <div className="flex items-start gap-3">
        
        <p className="text-base font-medium leading-relaxed tracking-wide text-primary/90">
          {renderDisclaimerText(children)}
        </p>
      </div>
    </aside>
  );
}
