// A slim strip of social links above the navbar. It scrolls away with the
// page (the navbar below is the sticky element), so it costs no persistent
// vertical space on small screens. It takes the top of the page's colour: navy
// with light icons over a navy hero (the same rule the navbar reads), light
// elsewhere, so it never sits on the hero as a white band.
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { FaFacebook, FaInstagram, FaYoutube, FaLinkedin, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter, FaTiktok } from "react-icons/fa6";
import { SiLinktree } from "react-icons/si";

import { JAWAFDEHI_SOCIALS } from "@/config/constants";
import { opensOnDarkHero } from "@/lib/dark-hero";
import { cn } from "@/lib/utils";

export function SocialBar() {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  const onDark = opensOnDarkHero(pathname, search);
  const links = [
    { label: t("footer.social.facebook"), href: JAWAFDEHI_SOCIALS.facebook, icon: FaFacebook },
    { label: t("footer.social.x"), href: JAWAFDEHI_SOCIALS.x, icon: FaXTwitter },
    { label: t("footer.social.instagram"), href: JAWAFDEHI_SOCIALS.instagram, icon: FaInstagram },
    { label: t("footer.social.tiktok"), href: JAWAFDEHI_SOCIALS.tiktok, icon: FaTiktok },
    { label: t("footer.social.youtube"), href: JAWAFDEHI_SOCIALS.youtube, icon: FaYoutube },
    { label: t("footer.social.linkedin"), href: JAWAFDEHI_SOCIALS.linkedin, icon: FaLinkedin },
    { label: t("footer.social.whatsapp"), href: JAWAFDEHI_SOCIALS.whatsapp, icon: FaWhatsapp },
    { label: t("footer.social.linktree"), href: JAWAFDEHI_SOCIALS.linktree, icon: SiLinktree },
  ];

  return (
    // Over a navy hero the bar is transparent and stacked above it: the hero
    // runs up behind the bar and the navbar (.hero-under-chrome), so its colour
    // and shader reach the top edge. h-10 is the height that class allows for.
    <div className={onDark ? "relative z-10 bg-transparent" : "border-b border-border bg-background"}>
      <div className="layout-container flex h-10 items-center justify-end gap-1">
        {links.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={cn(
              "relative inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 after:absolute after:-inset-1 after:content-['']",
              onDark
                ? "text-primary-foreground/70 hover:text-primary-foreground focus-visible:ring-primary-foreground/60"
                : "text-muted-foreground hover:text-foreground focus-visible:ring-ring",
            )}
          >
            <Icon className="h-4 w-4" />
          </a>
        ))}
      </div>
    </div>
  );
}
