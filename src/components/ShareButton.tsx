import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Share2, 
  Facebook, 
  Twitter, 
  MessageCircle, 
  Linkedin, 
  Link2, 
  Send,
  QrCode,
  Printer,
  Download,
  Check,
  Phone,
} from "@/components/icons";
import { toast } from "sonner";
import { LazyQRCode } from "@/components/LazyQRCode";
import { buildShareLinks } from "@/utils/share";

type ShareTarget = {
  id: "facebook" | "twitter" | "whatsapp" | "linkedin" | "telegram" | "viber" | "reddit" | "qr";
  icon: typeof Facebook;
  /** Brand names stay as written; the QR tile's name is translated. */
  label?: string;
  labelKey?: string;
  ariaKey?: string;
  /** The brand's own colour on the glyph only; the tile stays neutral grey. */
  tone: string;
};

const SHARE_TARGETS: readonly ShareTarget[] = [
  { id: "facebook", icon: Facebook, label: "Facebook", ariaKey: "share.shareOnFacebook", tone: "text-[#1877F2]" },
  { id: "whatsapp", icon: MessageCircle, label: "WhatsApp", ariaKey: "share.shareOnWhatsApp", tone: "text-[#25D366]" },
  { id: "twitter", icon: Twitter, label: "Twitter", ariaKey: "share.shareOnTwitter", tone: "text-primary" },
  { id: "linkedin", icon: Linkedin, label: "LinkedIn", ariaKey: "share.shareOnLinkedIn", tone: "text-[#0A66C2]" },
  { id: "telegram", icon: Send, label: "Telegram", ariaKey: "share.shareOnTelegram", tone: "text-[#229ED9]" },
  { id: "viber", icon: Phone, label: "Viber", ariaKey: "share.shareOnViber", tone: "text-[#7360F2]" },
  { id: "reddit", icon: Send, label: "Reddit", ariaKey: "share.shareOnReddit", tone: "text-[#FF4500]" },
  { id: "qr", icon: QrCode, labelKey: "share.qrCode", tone: "text-primary" },
];

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  className?: string;
}

export const ShareButton = ({
  url,
  title,
  description = "",
  variant = "outline",
  size = "default",
  showLabel = true,
  className,
}: ShareButtonProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  // See LazyQRCode: the SVG is absent until the lazy chunk resolves, and the
  // download handler finds it by id, so an early click would do nothing.
  const [qrReady, setQrReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);

  const shareLinks = buildShareLinks({ url, title, description });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("share.linkCopied"));
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error(t("share.copyFailed"));
    }
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    setSharing(platform);
    const shareUrl = shareLinks[platform];
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=400");
    setTimeout(() => {
      setSharing(null);
      setOpen(false);
    }, 500);
  };

  const handlePrint = () => {
    // Close popover first, then trigger print
    setOpen(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadPDF = () => {
    // Close popover first, then show hint and trigger print
    setOpen(false);
    setTimeout(() => {
      toast.info(t("share.pdfHint"));
      window.print();
    }, 100);
  };

  const handleShowQR = () => {
    setQrDialogOpen(true);
    setOpen(false);
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `jawafdehi-case-qr-${Date.now()}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };


  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={className}
            aria-label={t("share.share")}
          >
            <Share2 className="h-4 w-4" />
            {showLabel && size !== "icon" && (
              <span className="mt-1 hidden sm:inline">{t("share.share")}</span>
            )}
          </Button>
        </PopoverTrigger>
        {/* The link first, in a field with its own Copy button (Gemini, Whop,
            Sprig); then every destination as a round tile with its name under
            it (Substack, Nextdoor); print and PDF as two grey pills under them. No
            "More options" fold: eight tiles fit, so nothing has to hide. */}
        <PopoverContent
          className="w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[24px] border-border/70 p-0 shadow-[0_1px_2px_rgba(14,31,59,0.06),0_16px_40px_-16px_rgba(14,31,59,0.28)]"
          align="end"
          sideOffset={8}
        >
          <div className="px-5 pb-4 pt-4">
            <p className="text-base text-primary">{t("share.shareVia")}</p>

            <div className="mt-3 flex items-center gap-2 rounded-full bg-muted py-1 pl-4 pr-1">
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground" title={url}>
                {url.replace(/^https?:\/\//, "")}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                aria-label={t("share.copyLink")}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 text-sm text-primary-foreground transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97]"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {copied ? t("share.copied") : t("share.copyLink")}
              </button>
            </div>

            <ul className="mt-5 grid grid-cols-4 gap-x-2 gap-y-4">
              {SHARE_TARGETS.map((target) => (
                <li key={target.id}>
                  <button
                    type="button"
                    onClick={() => (target.id === "qr" ? handleShowQR() : handleShare(target.id))}
                    disabled={sharing === target.id}
                    aria-label={target.ariaKey ? t(target.ariaKey) : t(target.labelKey ?? "")}
                    className="group flex w-full flex-col items-center gap-1.5 rounded-xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted transition-[background-color,transform] duration-150 ease-out group-hover:bg-secondary group-active:scale-[0.94]">
                      {target.id === "reddit" ? (
                        <svg className={`h-5 w-5 ${target.tone}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                      
                        </svg>
                      ) : (
                        <target.icon className={`h-5 w-5 ${target.tone}`} aria-hidden="true" />
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground transition-colors group-hover:text-primary">
                      {target.labelKey ? t(target.labelKey) : target.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2 px-5 pb-5">
            <button
              type="button"
              onClick={handlePrint}
              aria-label={t("share.print")}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-muted text-sm text-primary transition-[background-color,transform] duration-150 ease-out hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
            >
              <Printer className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {t("share.print")}
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              aria-label={t("share.downloadPDF")}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-muted text-sm text-primary transition-[background-color,transform] duration-150 ease-out hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
            >
              <Download className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {t("share.downloadPDF")}
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("share.qrCodeTitle")}</DialogTitle>
            <DialogDescription>
              {t("share.qrCodeDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <LazyQRCode
                onReady={() => setQrReady(true)}
                id="qr-code-svg"
                value={url}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {t("share.scanQRCode")}
            </p>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={downloadQRCode}
                disabled={!qrReady}
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="mt-0.5">{t("share.downloadQR")}</span>
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setQrDialogOpen(false)}
              >
                {t("share.close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
