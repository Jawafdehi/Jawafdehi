import { ExternalLink, Mail, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CaseContactStripProps {
  email: string;
  whatsappNumber: string;
  editUrl: string;
  emailLabel: string;
  whatsappLabel: string;
  editLabel: string;
  title: string;
}

export function CaseContactStrip({
  email,
  whatsappNumber,
  editUrl,
  emailLabel,
  whatsappLabel,
  editLabel,
  title,
}: Readonly<CaseContactStripProps>) {
  return (
    <aside className="no-print rounded-lg px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold tracking-tight text-primary sm:text-xl">
            {title}
          </h3>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
         <Button
  asChild
  variant="navIcon"
  size="icon"
  className="h-11 w-11 border-red-500/20 bg-red-500/10 text-red-600 hover:border-red-500/35 hover:bg-red-500/15"
>
  <a href={`mailto:${email}`} aria-label={emailLabel} title={emailLabel}>
    <Mail className="h-4 w-4" aria-hidden="true" />
  </a>
</Button>

<Button
  asChild
  variant="navIcon"
  size="icon"
  className="h-11 w-11 border-green-500/20 bg-green-500/10 text-green-600 hover:border-green-500/35 hover:bg-green-500/15"
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

          <Button asChild variant="primary" size="navCta">
            <a href={editUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span>{editLabel}</span>
            </a>
          </Button>
        </div>
      </div>
    </aside>
  );
}
