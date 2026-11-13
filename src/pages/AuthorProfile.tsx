import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Twitter,
  User,
} from "@/components/icons";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAuthorProfile } from "@/services/jds-api";
import { Seo } from "@/components/Seo";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseTypeBadge } from "@/components/CaseBadge";
import { getCaseTypeLabelKey } from "@/utils/case-entities";
import { formatDateForLanguage } from "@/utils/date";
import { formatBigo } from "@/utils/number";
import {
  AUTHOR_CARD_HEIGHT,
  AUTHOR_CARD_WIDTH,
  SITE_NAME,
  SITE_URL,
  authorCardUrl,
} from "@/utils/seo";
import type { AuthorLink } from "@/types/jds";

// Same icon vocabulary as the team page (src/data/team.ts ContactType), so the
// two surfaces render the same person the same way.
const LINK_ICONS: Record<AuthorLink["type"], typeof Globe> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  github: Github,
  website: Globe,
  twitter: Twitter,
};

/** Whether a stored link is safe to put in an href.
 *
 * The API already rejects anything that is not https:// on write, so this is
 * defence in depth for rows written before that rule (or by a raw ORM edit):
 * a stored `javascript:` URL would otherwise execute on click.
 */
/** A mailto href that cannot be broken by the stored address.
 *
 * Encoding neutralizes newlines and the `?`/`&`/`#` header separators, which
 * would otherwise let a stored value inject mail headers. `@` is then restored:
 * it is legal unencoded in a mailto addr-spec, and leaving it as `%40` would
 * show up in the browser status bar on every author page.
 */
function mailtoHref(email: string): string {
  return `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}`;
}

function isSafeHref(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

// The author's email and links: grey circles, 44px so a thumb finds them.
const ICON_PILL =
  "flex h-11 w-11 items-center justify-center rounded-full bg-muted text-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.08] active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function AuthorProfile() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams();
  const isNepali = i18n.language.startsWith("ne");

  const {
    data: author,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["author-profile", slug],
    queryFn: () => getAuthorProfile(slug as string),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="layout-container pt-8 md:pt-12" aria-busy="true">
        <Skeleton className="h-4 w-40" />
        <div className="mt-10 flex items-center gap-6">
          <Skeleton className="h-28 w-28 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-12 w-64 rounded-xl" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !author) {
    return (
      <div className="layout-container">
        {/* A failed request is not a missing profile: only a 404 (or no data
            at all) says "not available". */}
        {isError && (error as { statusCode?: number } | null)?.statusCode !== 404 ? (
          <EmptyState headingLevel="h1"
            kind="couldNotLoad"
            title={t("author.errorTitle", "This profile didn't load")}
            description={t("author.error", "Something went wrong on our side. Please try again in a moment.")}
          />
        ) : (
          <EmptyState headingLevel="h1" kind="notFound" title={t("author.notFoundTitle", "Profile not found")} description={t("author.notFound")} />
        )}
      </div>
    );
  }

  const name = (isNepali && author.name_ne?.trim()) || author.display_name;
  const photo = author.photo_url?.trim();
  const pageTitle = isNepali
    ? `${name} — जवाफदेही`
    : `${name} — Jawafdehi`;
  const title = author.title?.trim();
  const bio = author.bio?.trim();
  const pageDescription = title
    ? `${name} — ${title}`
    : t("author.metaDescription", { name });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title={pageTitle}
        description={pageDescription}
        canonicalUrl={`${SITE_URL}/author/${author.slug}`}
        // The composed share card, not `photo` — the headshot is a 504x504 WebP,
        // which unfurls unreliably on WhatsApp and LinkedIn and gets cropped to a
        // band across the face in a summary_large_image card. The Worker injects
        // the same URL for crawlers (which never run this component); setting it
        // here keeps the head the app renders identical to the one served at the
        // edge, so the two cannot drift.
        imageUrl={authorCardUrl(author.slug)}
        imageAlt={`${name} — ${SITE_NAME}`}
        imageWidth={AUTHOR_CARD_WIDTH}
        imageHeight={AUTHOR_CARD_HEIGHT}
        type="profile"
        language={i18n.language}
      />

      <main id="main-content" className="flex-1">
        {/* The light hero: the trail, the portrait beside the name in the
            display face, the role, and the ways to reach them as grey pills. */}
        <section className="layout-container pt-8 md:pt-12">
          <PageBreadcrumb
            items={[
              { label: t("nav.home"), to: "/" },
              { label: t("nav.team", "Our team"), to: "/team" },
              { label: name },
            ]}
          />
          <div className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-7">
            {photo ? (
              <img
                src={photo}
                alt=""
                className="h-28 w-28 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                aria-hidden="true"
              >
                <User className="h-10 w-10" />
              </span>
            )}

            <div className="min-w-0">
              <h1 className="font-home-display text-4xl text-primary sm:text-5xl">
                {name}
              </h1>
              {title && (
                <p className="mt-2 text-lg text-muted-foreground">{title}</p>
              )}

              {(author.email || author.links.length > 0) && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {/* Rendered only when the author actually set one — a blank
                      address comes back as null, not "". */}
                  {author.email && (
                    <a
                      href={mailtoHref(author.email)}
                      className={ICON_PILL}
                      aria-label={t("author.emailLabel", { name })}
                    >
                      <Mail className="h-[18px] w-[18px]" />
                    </a>
                  )}
                  {author.links.map((link) => {
                    const Icon = LINK_ICONS[link.type];
                    if (!Icon || !isSafeHref(link.value)) return null;
                    return (
                      <a
                        key={`${link.type}-${link.value}`}
                        href={link.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={ICON_PILL}
                        // Localized: a bare `link.type` would read "website" to
                        // a screen reader on the Nepali site.
                        aria-label={t("author.linkLabel", {
                          name,
                          platform: t(`author.platform.${link.type}`),
                        })}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {bio && (
          <section className="layout-container pt-14 md:pt-16">
            <h2 className="font-home-display mb-5 text-3xl text-primary md:text-4xl">
              {t("author.aboutHeading")}
            </h2>
            {/* Markdown-only (no rehype-raw): a biography is prose, and there is
                no reason for it to be able to inject markup. */}
            <div className="content-prose max-w-3xl text-lg leading-8 text-primary/85">
              <Markdown remarkPlugins={[remarkGfm]}>{bio}</Markdown>
            </div>
          </section>
        )}

        <section className="layout-container pb-20 pt-14 md:pt-16">
          <h2 className="font-home-display mb-6 text-3xl text-primary md:text-4xl">
            {t("author.casesHeading", { count: author.cases.length })}
          </h2>

          {author.cases.length === 0 ? (
            <p className="text-base text-muted-foreground">{t("author.noCases")}</p>
          ) : (
            <ul className="grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
              {author.cases.map((entry) => {
                const published = entry.case_publish_date
                  ? formatDateForLanguage(
                      entry.case_publish_date,
                      "PP",
                      null,
                      i18n.language,
                    )
                  : null;
                const typeKey = getCaseTypeLabelKey(entry.case_type);

                return (
                  <li key={entry.slug}>
                    <Link
                      to={`/case/${entry.slug}`}
                      className="flex h-full flex-col rounded-[20px] border border-border/70 bg-surface p-5 transition-[border-color] duration-200 ease-out hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <CaseTypeBadge caseType={entry.case_type}>
                          {typeKey
                            ? t(typeKey)
                            : entry.case_type.replace(/[_-]/g, " ")}
                        </CaseTypeBadge>
                        {published && (
                          <span className="text-[13px] text-muted-foreground">
                            {published.primary}
                          </span>
                        )}
                      </div>

                      <span className="text-[17px] leading-snug text-primary">{entry.title}</span>

                      {entry.short_description?.trim() && (
                        <span className="mt-2 line-clamp-2 text-[15px] leading-6 text-muted-foreground">
                          {entry.short_description}
                        </span>
                      )}

                      {entry.bigo != null && entry.bigo > 0 && (
                        <span className="mt-auto pt-3 text-sm font-medium tabular-nums text-accent">
                          {formatBigo(entry.bigo)}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
