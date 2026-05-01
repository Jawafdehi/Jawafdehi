import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link2, Check, Share2, QrCode, Printer, Download, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  FacebookIcon,
  XTwitterIcon,
  LinkedInIcon,
  WhatsAppIcon,
  TelegramIcon,
  ViberIcon,
  RedditIcon,
  MessengerIcon,
  ThreadsIcon,
} from "./SocialIcons";
import {
  CASE_COMMENTS_SECTION_ID,
  scrollToCommentsSection,
} from "./floatingShareSidebarPosition";

interface FloatingShareSidebarProps {
  url: string;
  title: string;
  description?: string;
  scrollThreshold?: number;
}

export const FloatingShareSidebar = ({
  url,
  title,
  description = "",
  scrollThreshold = 220,
}: FloatingShareSidebarProps) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [moreDialogOpen, setMoreDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > scrollThreshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrollThreshold]);

  const shareText = `${title}${description ? ` - ${description}` : ""}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    viber: `viber://forward?text=${encodedText}%20${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
    messenger: `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=291494419107518&redirect_uri=${encodedUrl}`,
    threads: `https://threads.net/intent/post?text=${encodedText}%20${encodedUrl}`,
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("share.linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error(t("share.copyFailed"));
    }
  };

  const handleOpenComments = () => {
    if (scrollToCommentsSection()) return;
    window.location.hash = CASE_COMMENTS_SECTION_ID;
  };

  const handlePrint = () => {
    setMoreDialogOpen(false);
    // Wait longer for dialog to fully unmount before printing
    setTimeout(() => window.print(), 300);
  };

  const handleDownloadPDF = () => {
    setMoreDialogOpen(false);
    // Wait longer for dialog to fully unmount before printing
    setTimeout(() => {
      toast.info(t("share.pdfHint"));
      window.print();
    }, 300);
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("floating-qr-code-svg");
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

  const primaryPlatforms = [
    {
      key: "facebook" as const,
      icon: FacebookIcon,
      label: "Facebook",
      buttonClass: "bg-[#1877F2] text-white hover:bg-[#166FE5]",
    },
    {
      key: "twitter" as const,
      icon: XTwitterIcon,
      label: "X",
      buttonClass: "bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90",
    },
    {
      key: "linkedin" as const,
      icon: LinkedInIcon,
      label: "LinkedIn",
      buttonClass: "bg-[#0A66C2] text-white hover:bg-[#085AAB]",
    },
  ];

  const secondaryPlatforms = [
    {
      key: "whatsapp" as const,
      icon: WhatsAppIcon,
      label: "WhatsApp",
      color: "text-[#25D366]",
      bg: "bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900",
    },
    {
      key: "telegram" as const,
      icon: TelegramIcon,
      label: "Telegram",
      color: "text-[#0088CC]",
      bg: "bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 dark:hover:bg-sky-900",
    },
    {
      key: "viber" as const,
      icon: ViberIcon,
      label: "Viber",
      color: "text-[#7360F2]",
      bg: "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:hover:bg-purple-900",
    },
    {
      key: "messenger" as const,
      icon: MessengerIcon,
      label: "Messenger",
      color: "text-[#0084FF]",
      bg: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900",
    },
    {
      key: "threads" as const,
      icon: ThreadsIcon,
      label: "Threads",
      color: "text-black dark:text-white",
      bg: "bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700",
    },
    {
      key: "reddit" as const,
      icon: RedditIcon,
      label: "Reddit",
      color: "text-[#FF4500]",
      bg: "bg-orange-50 hover:bg-orange-100 dark:bg-orange-950 dark:hover:bg-orange-900",
    },
  ];

  if (!isVisible) return null;

  return (
    <TooltipProvider>
      <div
        className="mb-4 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur-sm animate-in slide-in-from-top-2 fade-in duration-300 no-print"
        role="region"
        aria-label={t("share.share")}
      >
        <div className="flex items-center justify-end gap-1 overflow-x-auto sm:gap-2">
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-12 shrink-0 rounded-md border border-red-200 bg-red-50 text-red-600 transition-all hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950"
                onClick={handleOpenComments}
                aria-label={t("caseDetail.comments.title")}
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("caseDetail.comments.title")}</p>
            </TooltipContent>
          </Tooltip>

          {primaryPlatforms.map(({ key, icon: Icon, label, buttonClass }) => (
            <Tooltip key={key} delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className={`h-10 w-12 shrink-0 rounded-md border-0 transition-all ${buttonClass}`}
                  onClick={() => handleShare(key)}
                  aria-label={t(`share.shareOn${label.replace(" ", "")}`)}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{label}</p>
              </TooltipContent>
            </Tooltip>
          ))}

          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-12 shrink-0 rounded-md border border-border/60 bg-background transition-all hover:bg-muted"
                onClick={handleCopyLink}
                aria-label={t("share.copyLink")}
              >
                {copied ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Link2 className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{copied ? t("share.copied") : t("share.copyLink")}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-12 shrink-0 rounded-md border border-border/60 bg-[#8DC63F] text-white transition-all hover:bg-[#7FB737]"
                onClick={() => setMoreDialogOpen(true)}
                aria-label={t("share.moreOptions")}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("share.moreOptions")}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* More Options Dialog with Backdrop Blur */}
      <Dialog open={moreDialogOpen} onOpenChange={setMoreDialogOpen}>
        <DialogContent className="sm:max-w-md backdrop-blur-sm bg-background/95">
          <DialogHeader>
            <DialogTitle>{t("share.shareVia")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-4">
            {secondaryPlatforms.map(({ key, icon: Icon, label, color, bg }) => (
              <button
                key={key}
                onClick={() => {
                  handleShare(key);
                  setMoreDialogOpen(false);
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${bg}`}
                aria-label={t(`share.shareOn${label.replace(" ", "")}`)}
              >
                <Icon className={`h-6 w-6 ${color}`} />
                <span className="text-xs font-medium text-foreground">{label}</span>
              </button>
            ))}
          </div>
          
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {t("share.more")}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setMoreDialogOpen(false);
                  setTimeout(() => setQrDialogOpen(true), 150);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all"
              >
                <QrCode className="h-6 w-6" />
                <span className="text-xs font-medium">{t("share.qrCode")}</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all"
              >
                <Printer className="h-6 w-6" />
                <span className="text-xs font-medium">{t("share.print")}</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all"
              >
                <Download className="h-6 w-6" />
                <span className="text-xs font-medium">PDF</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("share.qrCodeTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <QRCodeSVG
                id="floating-qr-code-svg"
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
              <Button variant="outline" className="flex-1" onClick={downloadQRCode}>
                <Download className="h-4 w-4 mr-2" />
                <span className="mt-0.5">{t("share.downloadQR")}</span>
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setQrDialogOpen(false)}>
                {t("share.close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
