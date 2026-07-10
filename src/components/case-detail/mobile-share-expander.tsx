import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Link2, MoreHorizontal, Printer, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  FacebookIcon,
  LinkedInIcon,
  WhatsAppIcon,
  XTwitterIcon,
} from "@/components/SocialIcons";

type MobileShareExpanderProps = {
  description?: string;
  title: string;
  url: string;
};

export function MobileShareExpander({
  description = "",
  title,
  url,
}: Readonly<MobileShareExpanderProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const shareText = `${title}${description ? ` - ${description}` : ""}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);

  const platforms = [
    {
      icon: FacebookIcon,
      label: t("share.shareOnFacebook"),
      name: "Facebook",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      icon: XTwitterIcon,
      label: t("share.shareOnTwitter"),
      name: "X",
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      icon: WhatsAppIcon,
      label: t("share.shareOnWhatsApp"),
      name: "WhatsApp",
      url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      icon: LinkedInIcon,
      label: t("share.shareOnLinkedIn"),
      name: "LinkedIn",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
  ];

  const shareTo = (target: string) => {
    window.open(target, "_blank", "noopener,noreferrer,width=600,height=400");
    setOpen(false);
    setActionsOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("share.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("share.copyFailed"));
    }
  };

  const printCase = () => {
    setActionsOpen(false);
    setTimeout(() => window.print(), 100);
  };

  return (
    <>
      <div className="flex items-center gap-1.5" role="group" aria-label={t("share.share")}>
      {open ? (
        <div className="flex items-center gap-1.5 animate-in fade-in-0 slide-in-from-right-2 duration-200">
          {platforms.map(({ icon: Icon, label, url: target }) => (
            <Button
              aria-label={label}
              className="h-11 w-11 rounded-full border border-primary/15 bg-background p-0 text-primary shadow-sm hover:bg-primary/10"
              key={label}
              onClick={() => shareTo(target)}
              size="icon"
              variant="ghost"
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
            </Button>
          ))}
          <Button
            aria-label={t("share.moreOptions")}
            className="h-11 w-11 rounded-full border border-primary/15 bg-background p-0 text-primary shadow-sm hover:bg-primary/10"
            onClick={() => {
              setOpen(false);
              setActionsOpen(true);
            }}
            size="icon"
            title={t("share.moreOptions")}
            variant="ghost"
          >
            <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>
      ) : null}

      <Button
        aria-expanded={open}
        aria-label={t("share.share")}
        className="h-12 w-12 rounded-full bg-primary p-0 text-primary-foreground shadow-lg hover:bg-primary/85 hover:shadow-xl"
        onClick={() => setOpen((value) => !value)}
        size="icon"
        variant="default"
      >
        <Share2 aria-hidden="true" className="h-5 w-5" />
      </Button>
      </div>

      <Sheet
        open={actionsOpen}
        onOpenChange={(value) => {
          setActionsOpen(value);
          if (!value) setShowQr(false);
        }}
      >
        <SheetContent
          className="rounded-t-2xl px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5"
          side="bottom"
        >
          <SheetHeader className="pr-8 text-left">
            <SheetTitle>{t("share.moreOptions")}</SheetTitle>
          </SheetHeader>
          <div className="mt-5 grid grid-cols-4 gap-x-3 gap-y-5">
            {platforms.map(({ icon: Icon, label, name, url: target }) => (
              <Button
                aria-label={label}
                className="h-auto min-h-16 flex-col gap-1 rounded-xl px-1 py-1 text-xs font-medium text-primary hover:bg-primary/5"
                key={label}
                onClick={() => shareTo(target)}
                variant="ghost"
              >
                <Icon aria-hidden="true" className="h-6 w-6" />
                <span>{name}</span>
              </Button>
            ))}
            <Button
              aria-label={t("share.copyLink")}
              className="h-auto min-h-16 flex-col gap-1 rounded-xl px-1 py-1 text-xs font-medium text-primary hover:bg-primary/5"
              onClick={copyLink}
              variant="ghost"
            >
              {copied ? <Check className="h-6 w-6" /> : <Link2 className="h-6 w-6" />}
              <span>{copied ? t("share.copied") : t("share.copyLink")}</span>
            </Button>
            <Button
              aria-label={t("share.qrCode")}
              aria-pressed={showQr}
              className="h-auto min-h-16 flex-col gap-1 rounded-xl px-1 py-1 text-xs font-medium text-primary hover:bg-primary/5"
              onClick={() => setShowQr((value) => !value)}
              variant="ghost"
            >
              <QrCode className="h-6 w-6" />
              <span>{t("share.qrCode")}</span>
            </Button>
            <Button
              aria-label={t("share.downloadPDF")}
              className="h-auto min-h-16 flex-col gap-1 rounded-xl px-1 py-1 text-xs font-medium text-primary hover:bg-primary/5"
              onClick={printCase}
              variant="ghost"
            >
              <Printer className="h-6 w-6" />
              <span>{t("share.downloadPDF")}</span>
            </Button>
          </div>
          {showQr ? (
            <div className="flex justify-center border-t pt-4">
              <div className="rounded-lg bg-white p-3">
                <QRCodeSVG value={url} size={184} level="H" includeMargin />
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
