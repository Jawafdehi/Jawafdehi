import { Notice, NoticeEmphasis } from "@/components/ui/notice";

interface CaseDisclaimerBannerProps {
  children: string;
}

function renderDisclaimerText(text: string) {
  const highlightPattern = /(not a judiciary body|do not have legal authority)/gi;
  const isHighlightedPhrase = /^(not a judiciary body|do not have legal authority)$/i;

  return text.split(highlightPattern).map((part, index) => {
    if (isHighlightedPhrase.test(part)) {
      return <NoticeEmphasis key={`${part}-${index}`}>{part}</NoticeEmphasis>;
    }

    return part;
  });
}

export function CaseDisclaimerBanner({ children }: Readonly<CaseDisclaimerBannerProps>) {
  return (
    <Notice aria-label="Case information disclaimer" className="no-print mb-5 sm:mb-6">
      {renderDisclaimerText(children)}
    </Notice>
  );
}
