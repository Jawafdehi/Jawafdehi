import { useMemo, useState } from "react";
import { Braces, Check, Copy, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ViewJsonButtonProps {
  data: unknown;
  title?: string;
  rawUrl?: string;
  disabled?: boolean;
}

// A small "View JSON" affordance for record pages (entities, materials): opens a popup
// showing the record's raw JSON-LD, pretty-printed — mirroring the document-source preview
// dialog. Copy-to-clipboard + an "open raw" link to the API endpoint are included. It reuses
// the already-fetched record, so opening the popup makes no extra request.
export function ViewJsonButton({ data, title = "Raw JSON", rawUrl, disabled }: Readonly<ViewJsonButtonProps>) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => (data == null ? "" : JSON.stringify(data, null, 2)), [data]);

  const copy = () => {
    void navigator.clipboard?.writeText(json).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => undefined,
    );
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        disabled={disabled || data == null}
        onClick={() => setOpen(true)}
      >
        <Braces className="mr-1 h-4 w-4" aria-hidden="true" />
        View JSON
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(96vw,880px)] max-w-none gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-4 py-3 text-left">
            <DialogTitle className="flex items-center gap-2 pr-8 text-base">
              <Braces className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{title}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">Raw JSON-LD record</DialogDescription>
          </DialogHeader>

          <div className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={copy}>
                {copied ? (
                  <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              {rawUrl ? (
                <Button asChild size="sm" variant="outline">
                  <a href={rawUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Open raw
                  </a>
                </Button>
              ) : null}
            </div>
            <pre className="max-h-[68vh] overflow-auto rounded-lg bg-[#0b0b0c] p-4 text-xs leading-relaxed text-slate-100">
              {json}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
