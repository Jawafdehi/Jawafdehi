import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, Unlock } from "lucide-react";
import { FaFacebook, FaYoutube, FaLinkedin, FaWhatsapp } from "react-icons/fa";
import { SiLinktree } from "react-icons/si";

import { JAWAFDEHI_SOCIALS } from "@/config/constants";
import { API_BASE_URL } from "@/services/http";
import { cn } from "@/lib/utils";

type FooterLink = {
  label: string;
  to: string;
  external?: boolean;
};

type FooterSocialLink = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

type FooterBadge = {
  labelKey: string;
  icon?: ComponentType<{ className?: string }>;
  marker?: string;
  iconClassName: string;
};

const linkClass =
  "group -mx-3 inline-flex min-h-9 items-center justify-between gap-3 rounded-full px-3 text-sm text-[var(--footer-muted)] transition-all duration-200 hover:bg-[var(--footer-soft)] hover:text-[var(--footer-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const footerBadges: FooterBadge[] = [
  {
    labelKey: "footer.builtByNepali",
    marker: "🇳🇵",
    iconClassName: "",
  },
  {
    labelKey: "footer.publicDomain",
    icon: Unlock,
    iconClassName: "text-emerald-500 dark:text-emerald-300",
  },
  {
    labelKey: "footer.openSource",
    icon: OpenSourceFilledIcon,
    iconClassName: "text-emerald-500 dark:text-emerald-300",
  },
];

function OpenSourceFilledIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21Zm0 5.1a4.05 4.05 0 0 0-1.35 7.87l-2.25 5.46a8.7 8.7 0 1 1 7.2 0l-2.25-5.46A4.05 4.05 0 0 0 12 6.6Z"
      />
    </svg>
  );
}

function FooterNavLink({ label, to, external }: Readonly<FooterLink>) {
  const content = (
    <>
      <span>{label}</span>
      {external && (
        <ExternalLink className="h-3.5 w-3.5 opacity-0 transition-opacity duration-200 group-hover:opacity-55" />
      )}
    </>
  );

  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {content}
      </a>
    );
  }

  return (
    <Link to={to} className={linkClass}>
      {content}
    </Link>
  );
}

function FooterLinkGroup({ title, links }: Readonly<{ title: string; links: FooterLink[] }>) {
  return (
    <nav aria-label={title}>
      <h3 className="mb-3 text-sm font-bold text-[var(--footer-fg)]">
        {title}
      </h3>
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={`${link.label}-${link.to}`}>
            <FooterNavLink {...link} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function renderBadgeIcon(marker: string | undefined, Icon: ComponentType<{ className?: string }> | undefined, iconClassName: string) {
  if (marker) return <span aria-hidden="true" className="text-sm leading-none">{marker}</span>;
  if (Icon) return <Icon className={cn("h-3.5 w-3.5", iconClassName)} />;
  return null;
}

export const Footer = () => {
  const { t } = useTranslation();

  const platformLinks: FooterLink[] = [
    { label: t("footer.searchCases"), to: "/search?type=case" },
    { label: t("footer.searchEntities"), to: "/search?type=entity" },
    { label: t("nav.cases"), to: "/cases" },
    { label: t("nav.ourProcess"), to: "/our-process" },
    { label: t("nav.ourCommitment"), to: "/commitment" },
    { label: t("nav.volunteer"), to: "/volunteer" },
    { label: t("nav.donate"), to: "/donate" },
  ];

  const aboutLinks: FooterLink[] = [
    { label: t("nav.about"), to: "/about" },
    { label: t("nav.team"), to: "/team" },
    { label: t("nav.products"), to: "/products" },
    { label: t("nav.weeklySeries"), to: "/saptahik" },
    { label: t("nav.updates"), to: "/updates" },
    { label: t("footer.feedback"), to: "/feedback" },
  ];

  const resourceLinks: FooterLink[] = [
    { label: t("footer.contributorPortal"), to: `${API_BASE_URL}/admin`, external: true },
    { label: t("footer.githubRepo"), to: "https://github.com/Jawafdehi/Jawafdehi", external: true },
    { label: t("footer.siteStatus"), to: "https://status.jawafdehi.org/status/public", external: true },
    { label: t("footer.privacy"), to: "/privacy" },
    { label: t("footer.terms"), to: "/terms" },
  ];

  const socialLinks: FooterSocialLink[] = [
    { label: t("footer.social.facebook"), href: JAWAFDEHI_SOCIALS.facebook, icon: FaFacebook },
    { label: t("footer.social.youtube"), href: JAWAFDEHI_SOCIALS.youtube, icon: FaYoutube },
    { label: t("footer.social.linkedin"), href: JAWAFDEHI_SOCIALS.linkedin, icon: FaLinkedin },
    { label: t("footer.social.whatsapp"), href: JAWAFDEHI_SOCIALS.whatsapp, icon: FaWhatsapp },
    { label: t("footer.social.linktree"), href: JAWAFDEHI_SOCIALS.linktree, icon: SiLinktree },
  ];

  return (
    <footer
      className={cn(
        "relative isolate overflow-hidden border-t bg-[var(--footer-bg)] text-[var(--footer-fg)]",
        "[--footer-bg:hsl(var(--primary))] [--footer-fg:hsl(var(--primary-foreground))] [--footer-muted:hsl(var(--primary-foreground)/0.78)]",
        "[--footer-title:#FF000E]",
        "[--footer-soft:hsl(var(--primary-foreground)/0.10)] [--footer-soft-hover:hsl(var(--primary-foreground)/0.16)]",
        "[--footer-border:hsl(var(--primary-foreground)/0.16)] [--footer-border-hover:hsl(var(--primary-foreground)/0.28)] [--footer-dot:hsl(var(--primary-foreground)/0.30)]",
        "border-[var(--footer-border)]",
        "dark:[--footer-bg:hsl(var(--card))] dark:[--footer-fg:hsl(var(--card-foreground))] dark:[--footer-muted:hsl(var(--card-foreground)/0.82)]",
        "dark:[--footer-soft:hsl(var(--background)/0.70)] dark:[--footer-soft-hover:hsl(var(--secondary)/0.45)]",
        "dark:[--footer-border:hsl(var(--border)/0.70)] dark:[--footer-border-hover:hsl(var(--foreground)/0.20)] dark:[--footer-dot:hsl(var(--border))]",
      )}
    >
      <div className="container mx-auto px-4 py-12 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(280px,1.15fr)_minmax(0,1.85fr)] lg:gap-14">
          <div className="space-y-6">
            <Link
              to="/"
              aria-label="Jawafdehi home"
              className="inline-flex rounded-full transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <img
                src="/assets/logo-dark.svg"
                alt="Jawafdehi"
                className="h-9 w-auto object-contain dark:hidden"
              />
              <img
                src="/assets/logo-dark.svg"
                alt="Jawafdehi"
                className="hidden h-9 w-auto object-contain dark:block"
              />
            </Link>

            <div className="max-w-sm space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--footer-title)]">
                <em>{t("footer.accountabilityNoExpiry")}</em>
              </p>
              <p className="text-sm leading-6 text-[var(--footer-muted)]">
                {t("footer.permanentArchive")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-[var(--footer-muted)]">
              {footerBadges.map(({ labelKey, icon: Icon, marker, iconClassName }, index) => (
                <span
                  key={labelKey}
                  className="inline-flex items-center gap-1.5"
                >
                  {index > 0 && (
                    <span aria-hidden="true" className="mr-1 h-1 w-1 rounded-full bg-[var(--footer-dot)]" />
                  )}
                  {renderBadgeIcon(marker, Icon, iconClassName)}
                  {t(labelKey)}
                </span>
              ))}
            </div>

          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:gap-x-8">
            <FooterLinkGroup title={t("footer.platform")} links={platformLinks} />
            <FooterLinkGroup title={t("nav.about")} links={aboutLinks} />
            <FooterLinkGroup title={t("footer.resources")} links={resourceLinks} />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-3xl text-xs leading-5 text-[var(--footer-muted)]">
            {t("footer.disclaimer")}
          </p>

          <div className="flex shrink-0 flex-wrap gap-2">
            {socialLinks.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--footer-border)] bg-[var(--footer-soft)] text-[var(--footer-muted)] shadow-sm shadow-foreground/5 transition-all duration-200",
                  "hover:-translate-y-0.5 hover:border-[var(--footer-border-hover)] hover:bg-[var(--footer-soft-hover)] hover:text-[var(--footer-fg)] hover:shadow-md",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                )}
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 text-xs text-[var(--footer-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t("footer.allDataPublicDomain")}
          </p>
          <div className="flex gap-4">
            <Link to="/privacy" className="transition-colors hover:text-[var(--footer-fg)]">
              {t("footer.privacy")}
            </Link>
            <Link to="/terms" className="transition-colors hover:text-[var(--footer-fg)]">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
