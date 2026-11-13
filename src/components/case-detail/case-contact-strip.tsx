import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { Mail, MessageCircle } from "@/components/icons";


interface CaseContactStripProps {
  email: string;
  whatsappNumber: string;
  emailLabel: string;
  whatsappLabel: string;
  title: string;
  /** One line under the title: what to send us. */
  line?: string;
}

export function CaseContactStrip({
  email,
  whatsappNumber,
  emailLabel,
  whatsappLabel,
  title,
  line,
}: Readonly<CaseContactStripProps>) {
  const pill =
    "inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[15px] transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100";
  // Closing the case: who to tell if you know more, on the light mist field
  // the product pages' feature cards use, with the two ways to reach us as
  // labelled pills.
  return (
    <aside className="no-print relative isolate mt-4 overflow-hidden rounded-[28px] border border-border/70 bg-surface">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <ShaderBackdrop design="mist" />
      </div>
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-10">
        <div className="max-w-xl">
          <h3 className="font-home-display text-2xl text-primary md:text-[1.75rem]">{title}</h3>
          {line ? <p className="mt-2 text-base leading-7 text-primary/75">{line}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`mailto:${email}`} aria-label={emailLabel} className={`${pill} border border-border/70 bg-surface text-primary hover:bg-muted`}>
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
      </div>
    </aside>
  );
}
