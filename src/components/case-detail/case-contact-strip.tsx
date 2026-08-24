import { Mail, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

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
  return (
    <aside className="no-print rounded-lg py-1.5 sm:px-5 sm:py-3">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between sm:gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold tracking-tight text-primary sm:text-xl">
            {title}
          </h3>
        </div>

        <div className="flex min-w-0 items-center gap-2">
         <Button
  asChild
  variant="navIcon"
  size="icon"
  className="h-11 w-11 border-danger/20 bg-danger/10 text-danger hover:border-danger/35 hover:bg-danger/15"
>
  <a href={`mailto:${email}`} aria-label={emailLabel} title={emailLabel}>
    <Mail className="h-4 w-4" aria-hidden="true" />
  </a>
</Button>

<Button
  asChild
  variant="navIcon"
  size="icon"
  className="h-11 w-11 border-success-strong/20 bg-success-strong/10 text-success-strong hover:border-success-strong/35 hover:bg-success-strong/15"
>
  <a
    href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={whatsappLabel}
    title={whatsappLabel}
  >
    <MessageCircle className="h-4 w-4" aria-hidden="true" />
  </a>
</Button>
        </div>
      </div>
    </aside>
  );
}
