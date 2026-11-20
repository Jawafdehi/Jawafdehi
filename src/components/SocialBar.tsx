// A slim strip of social links above the navbar. It scrolls away with the
// page (the navbar below is the sticky element), so it costs no persistent
// vertical space on small screens.
import { useTranslation } from "react-i18next";
import { FaFacebook, FaInstagram, FaYoutube, FaLinkedin, FaDiscord, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter, FaTiktok } from "react-icons/fa6";
import { SiLinktree } from "react-icons/si";

import { JAWAFDEHI_SOCIALS } from "@/config/constants";

export function SocialBar() {
  const { t } = useTranslation();
  const links = [
    { label: t("footer.social.facebook"), href: JAWAFDEHI_SOCIALS.facebook, icon: FaFacebook },
    { label: t("footer.social.x"), href: JAWAFDEHI_SOCIALS.x, icon: FaXTwitter },
    { label: t("footer.social.instagram"), href: JAWAFDEHI_SOCIALS.instagram, icon: FaInstagram },
    { label: t("footer.social.tiktok"), href: JAWAFDEHI_SOCIALS.tiktok, icon: FaTiktok },
    { label: t("footer.social.youtube"), href: JAWAFDEHI_SOCIALS.youtube, icon: FaYoutube },
    { label: t("footer.social.linkedin"), href: JAWAFDEHI_SOCIALS.linkedin, icon: FaLinkedin },
    { label: t("footer.social.discord"), href: JAWAFDEHI_SOCIALS.discord, icon: FaDiscord },
    { label: t("footer.social.whatsapp"), href: JAWAFDEHI_SOCIALS.whatsapp, icon: FaWhatsapp },
    { label: t("footer.social.linktree"), href: JAWAFDEHI_SOCIALS.linktree, icon: SiLinktree },
  ];

  return (
    <div className="border-b border-border bg-background">
      <div className="layout-container flex items-center justify-end gap-1 py-1">
        {links.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="relative inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring after:absolute after:-inset-1 after:content-['']"
          >
            <Icon className="h-3.5 w-3.5" />
          </a>
        ))}
      </div>
    </div>
  );
}
