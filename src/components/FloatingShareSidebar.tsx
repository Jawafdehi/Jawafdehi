import { useState } from "react";
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
import { Link2, Check, Share2, QrCode, Printer, Download } from "lucide-react";
import { toast } from "sonner";
import { LazyQRCode } from "@/components/LazyQRCode";
import { buildShareLinks } from "@/utils/share";
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
  InstagramIcon,
  TikTokIcon,
} from "./SocialIcons";

interface FloatingShareSidebarProps {
  url: string;
  title: string;
  description?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const FloatingShareSidebar = ({
  url,
  title,
  description = "",
  open,
  onOpenChange,
}: FloatingShareSidebarProps) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [uncontrolledMoreDialogOpen, setUncontrolledMoreDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const moreDialogOpen = open ?? uncontrolledMoreDialogOpen;
  const setMoreDialogOpen = onOpenChange ?? setUncontrolledMoreDialogOpen;

  const shareLinks = buildShareLinks({ url, title, description });

  // Where to send someone for a network that has no share-by-URL intent.
  const APP_ONLY_DESTINATION: Record<string, string> = {
    instagram: "https://www.instagram.com/",
    tiktok: "https://www.tiktok.com/upload",
  };

  const handleShare = async (platform: string, label?: string) => {
    const destination = APP_ONLY_DESTINATION[platform];
    if (!destination) {
      const shareUrl = shareLinks[platform as keyof typeof shareLinks];
      window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=400");
      return;
    }

    // Instagram and TikTok only accept a post composed inside the app, so there
    // is nothing to open with the URL pre-filled. Best effort, in order:

    // 1. The OS share sheet, which on a phone lists Instagram and TikTok
    //    themselves — the only route that genuinely hands them the link.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: description, url });
        return;
      } catch (err) {
        // The user dismissing the sheet is a choice, not a failure — do not
        // then dump them on instagram.com behind the sheet they just closed.
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    // 2. No sheet (desktop): put the link where the app can reach it and open
    //    the app, rather than pretending the share happened.
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("share.appOnlyHandoff", { platform: label ?? platform }));
    } catch {
      toast.info(t("share.appOnlyHandoffNoCopy", { platform: label ?? platform }));
    }
    window.open(destination, "_blank", "noopener,noreferrer");
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

  // The five networks Jawafdehi actually publishes on, in one order, used by BOTH
  // the rail and the "Share via" dialog. The dialog previously rendered only the
  // secondary list, so the primary networks were missing from it entirely.
  //
  // Instagram and TikTok are `appOnly`. Neither has a web share intent — there is
  // no instagram.com/share?url= or tiktok.com/share?url= the way there is a
  // facebook.com/sharer or twitter.com/intent — because both only accept a post
  // composed in the app. Rendering them as ordinary share links would give two
  // buttons that quietly do nothing useful, so they take the handoff path in
  // `handleShare`: the OS share sheet where one exists, otherwise copy-the-link
  // and open the app.
  const primaryPlatforms = [
    {
      key: "facebook" as const,
      icon: FacebookIcon,
      tileBg: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900",
      label: "Facebook",
      color: "text-[#1877F2]",
      bg: "hover:bg-blue-50 dark:hover:bg-blue-950",
    },
    {
      key: "instagram" as const,
      appOnly: true,
      icon: InstagramIcon,
      tileBg: "bg-pink-50 hover:bg-pink-100 dark:bg-pink-950 dark:hover:bg-pink-900",
      label: "Instagram",
      color: "text-[#E4405F]",
      bg: "hover:bg-pink-50 dark:hover:bg-pink-950",
    },
    {
      key: "tiktok" as const,
      appOnly: true,
      icon: TikTokIcon,
      tileBg: "bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700",
      label: "TikTok",
      color: "text-black dark:text-white",
      bg: "hover:bg-gray-100 dark:hover:bg-gray-800",
    },
    {
      key: "linkedin" as const,
      icon: LinkedInIcon,
      tileBg: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900",
      label: "LinkedIn",
      color: "text-[#0A66C2]",
      bg: "hover:bg-blue-50 dark:hover:bg-blue-950",
    },
    {
      key: "twitter" as const,
      icon: XTwitterIcon,
      tileBg: "bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700",
      label: "X",
      color: "text-black dark:text-white",
      bg: "hover:bg-gray-100 dark:hover:bg-gray-800",
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

  return (
    <TooltipProvider>
      {/* min-[1536px], not lg. This rail is `fixed left-4` and 58px wide, so its
          right edge is at x=74 at EVERY viewport width, while the page's own
          content moves with the viewport: `.layout-container` is capped at
          1400px and centred, so a left gutter only opens above 1400px.

              width   content-left   gap to the rail
              1280         32            -42  collides
              1440         52            -22  collides
              1500         82             +8  collides
              1536        100            +26  fits

          Below 1536 the rail therefore painted over the page — at 1024-1400 it
          sat directly on the sticky section jump-nav, covering the first
          character of every jump link. Because it is `fixed` and vertically
          centred, what it covered changed as the reader scrolled, which is why
          this looked like a rendering artefact rather than a collision.

          The rail stays visible from `lg` and the PAGE reserves the gutter
          instead (`lg:pl-24` on the case body, dropped again at 1536 where the
          centred container opens a real gutter of its own). Gating the rail on
          width was tried first and rejected: it made the rail vanish on a
          1440px laptop and reappear on a wider screen, and a control that
          comes and goes with the window is worse than one that is simply
          always there. */}
      <div
        className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-2 p-2 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg animate-in slide-in-from-left-4 fade-in duration-300 no-print"
        role="region"
        aria-label={t("share.share")}
      >
        {primaryPlatforms.map(({ key, icon: Icon, label, color, bg }) => (
          <Tooltip key={key} delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`transition-all ${bg}`}
                onClick={() => handleShare(key, label)}
                aria-label={t(`share.shareOn${label.replace(" ", "")}`)}
              >
                <Icon className={`h-5 w-5 ${color}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Copy Link */}
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="transition-all hover:bg-muted"
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
          <TooltipContent side="right">
            <p>{copied ? t("share.copied") : t("share.copyLink")}</p>
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="h-px bg-border my-1" />

        {/* More Options */}
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="transition-all hover:bg-muted"
              onClick={() => setMoreDialogOpen(true)}
              aria-label={t("share.moreOptions")}
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{t("share.moreOptions")}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* More Options Dialog with Backdrop Blur */}
      <Dialog open={moreDialogOpen} onOpenChange={setMoreDialogOpen}>
        <DialogContent className="sm:max-w-md backdrop-blur-sm bg-background/95">
          <DialogHeader>
            <DialogTitle>{t("share.shareVia")}</DialogTitle>
          </DialogHeader>
          {/* The primary five first, then the messaging apps. This dialog used
              to render `secondaryPlatforms` ALONE, so "Share via" offered
              WhatsApp and Reddit but not Facebook, Instagram, TikTok, LinkedIn
              or X — the networks Jawafdehi actually publishes on, and the ones
              already on the rail. Both surfaces now read from the same list. */}
          <div className="grid grid-cols-3 gap-3 py-4">
            {[...primaryPlatforms, ...secondaryPlatforms].map((platform) => {
              const { key, icon: Icon, label, color } = platform;
              const tile = "tileBg" in platform ? platform.tileBg : platform.bg;
              return (
                <button
                  key={key}
                  onClick={() => {
                    handleShare(key, label);
                    setMoreDialogOpen(false);
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${tile}`}
                  aria-label={t(`share.shareOn${label.replace(" ", "")}`)}
                >
                  <Icon className={`h-6 w-6 ${color}`} />
                  <span className="text-xs font-medium text-foreground">{label}</span>
                </button>
              );
            })}
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
              <LazyQRCode
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
