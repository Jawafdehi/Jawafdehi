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
import { Separator } from "@/components/ui/separator";
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
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export const ShareButton = ({
  url,
  title,
  description = "",
  variant = "outline",
  size = "default",
  showLabel = true,
}: ShareButtonProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const shareText = `${title}${description ? ` - ${description}` : ""}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
    viber: `viber://forward?text=${encodedText}%20${encodedUrl}`,
  };

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
    window.open(shareLinks[platform], "_blank", "noopener,noreferrer,width=600,height=400");
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

  const platformStyles = {
    facebook: "hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950 dark:hover:border-blue-700",
    twitter: "hover:bg-sky-50 hover:border-sky-300 dark:hover:bg-sky-950 dark:hover:border-sky-700",
    whatsapp: "hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950 dark:hover:border-green-700",
    linkedin: "hover:bg-blue-50 hover:border-blue-400 dark:hover:bg-blue-950 dark:hover:border-blue-700",
    telegram: "hover:bg-sky-50 hover:border-sky-300 dark:hover:bg-sky-950 dark:hover:border-sky-700",
    reddit: "hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950 dark:hover:border-orange-700",
    viber: "hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950 dark:hover:border-purple-700",
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant={variant} size={size} aria-label={t("share.share")}>
            <Share2 className="h-4 w-4" />
            {showLabel && size !== "icon" && (
              <span className="mt-1 hidden sm:inline">{t("share.share")}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-4 animate-in fade-in-0 zoom-in-95" 
          align="end"
          sideOffset={5}
        >
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              {t("share.shareVia")}
            </p>
            
            {/* Main Social Platforms */}
            <div className="grid grid-cols-2 gap-2">
              {/* Facebook */}
              <Button
                variant="outline"
                size="sm"
                className={`justify-start transition-all ${platformStyles.facebook}`}
                onClick={() => handleShare("facebook")}
                disabled={sharing === "facebook"}
                aria-label={t("share.shareOnFacebook")}
              >
                <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                <span className="mt-0.5">Facebook</span>
              </Button>

              {/* Twitter/X */}
              <Button
                variant="outline"
                size="sm"
                className={`justify-start transition-all ${platformStyles.twitter}`}
                onClick={() => handleShare("twitter")}
                disabled={sharing === "twitter"}
                aria-label={t("share.shareOnTwitter")}
              >
                <Twitter className="h-4 w-4 mr-2 text-sky-500" />
                <span className="mt-0.5">Twitter</span>
              </Button>

              {/* WhatsApp */}
              <Button
                variant="outline"
                size="sm"
                className={`justify-start transition-all ${platformStyles.whatsapp}`}
                onClick={() => handleShare("whatsapp")}
                disabled={sharing === "whatsapp"}
                aria-label={t("share.shareOnWhatsApp")}
              >
                <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                <span className="mt-0.5">WhatsApp</span>
              </Button>

              {/* LinkedIn */}
              <Button
                variant="outline"
                size="sm"
                className={`justify-start transition-all ${platformStyles.linkedin}`}
                onClick={() => handleShare("linkedin")}
                disabled={sharing === "linkedin"}
                aria-label={t("share.shareOnLinkedIn")}
              >
                <Linkedin className="h-4 w-4 mr-2 text-blue-700" />
                <span className="mt-0.5">LinkedIn</span>
              </Button>

              {/* Telegram */}
              <Button
                variant="outline"
                size="sm"
                className={`justify-start transition-all ${platformStyles.telegram}`}
                onClick={() => handleShare("telegram")}
                disabled={sharing === "telegram"}
                aria-label={t("share.shareOnTelegram")}
              >
                <Send className="h-4 w-4 mr-2 text-sky-400" />
                <span className="mt-0.5">Telegram</span>
              </Button>

              {/* Viber */}
              <Button
                variant="outline"
                size="sm"
                className={`justify-start transition-all ${platformStyles.viber}`}
                onClick={() => handleShare("viber")}
                disabled={sharing === "viber"}
                aria-label={t("share.shareOnViber")}
              >
                <Phone className="h-4 w-4 mr-2 text-purple-600" />
                <span className="mt-0.5">Viber</span>
              </Button>
            </div>

            {/* Copy Link */}
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start transition-all"
              onClick={handleCopyLink}
              aria-label={t("share.copyLink")}
            >
              {copied ? (
                <Check className="h-4 w-4 mr-2 text-green-600" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              <span className="mt-0.5">
                {copied ? t("share.copied") : t("share.copyLink")}
              </span>
            </Button>

            {/* More Options Collapsible */}
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-muted-foreground hover:text-foreground"
                onClick={() => setShowMore(!showMore)}
              >
                <span className="text-xs font-medium">{t("share.moreOptions")}</span>
                {showMore ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>

              {showMore && (
                <div className="space-y-2 pt-2 animate-in fade-in-50 slide-in-from-top-2">
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-2">
                    {/* Reddit */}
                    <Button
                      variant="outline"
                      size="sm"
                      className={`justify-start transition-all ${platformStyles.reddit}`}
                      onClick={() => handleShare("reddit")}
                      disabled={sharing === "reddit"}
                      aria-label={t("share.shareOnReddit")}
                    >
                      <svg className="h-4 w-4 mr-2 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                      </svg>
                      <span className="mt-0.5">Reddit</span>
                    </Button>

                    {/* QR Code */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start transition-all hover:bg-muted"
                      onClick={handleShowQR}
                      aria-label={t("share.showQRCode")}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      <span className="mt-0.5">{t("share.qrCode")}</span>
                    </Button>

                    {/* Print */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start transition-all hover:bg-muted"
                      onClick={handlePrint}
                      aria-label={t("share.print")}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      <span className="mt-0.5">{t("share.print")}</span>
                    </Button>

                    {/* Download PDF */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start transition-all hover:bg-muted"
                      onClick={handleDownloadPDF}
                      aria-label={t("share.downloadPDF")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      <span className="mt-0.5">{t("share.downloadPDF")}</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
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
              <QRCodeSVG
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
