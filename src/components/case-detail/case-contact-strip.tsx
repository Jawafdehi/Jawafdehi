import { Mail, MessageCircle } from "@/components/icons";


interface CaseContactStripProps {
  email: string;
  whatsappNumber: string;
  emailLabel: string;
  whatsappLabel: string;
  title: string;
}

export function CaseContactStrip({
  email,
  whatsappNumber,
  emailLabel,
  whatsappLabel,
  title,
}: Readonly<CaseContactStripProps>) {
  const pill =
    "inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[15px] transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100";
  // A hairline card closing the case: who to tell if you know more, and the
  // two ways to reach us as labelled pills (the icons alone said too little).
  return (
    <aside className="no-print mt-4 flex flex-col gap-5 rounded-[24px] border border-border/70 bg-surface p-6 md:flex-row md:items-center md:justify-between md:p-8">
      <h3 className="font-home-display text-2xl text-primary md:text-[1.75rem]">{title}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <a href={`mailto:${email}`} aria-label={emailLabel} className={`${pill} bg-muted text-primary hover:bg-primary/[0.08]`}>
          <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
          {emailLabel}
        </a>
        <a
          href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={whatsappLabel}
          className={`${pill} bg-primary-surface text-primary-foreground hover:bg-primary-surface/90`}
        >
          <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
          {whatsappLabel}
        </a>
      </div>
    </aside>
  );
}
