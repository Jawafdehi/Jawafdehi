import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Twitter,
  User,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAuthorProfile } from "@/services/jds-api";
import { Seo } from "@/components/Seo";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

export default function AuthorProfile() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams();
  const isNepali = i18n.language.startsWith("ne");

  const {
    data: author,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["author-profile", slug],
    queryFn: () => getAuthorProfile(slug as string),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !author) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t("author.notFound")}</AlertDescription>
        </Alert>
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
        <section className="border-b bg-muted/30">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-5 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
            {photo ? (
              <img
                src={photo}
                alt=""
                className="h-24 w-24 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                aria-hidden="true"
              >
                <User className="h-10 w-10" />
              </span>
            )}

            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                {name}
              </h1>
              {title && (
                <p className="mt-1 text-base text-muted-foreground">{title}</p>
              )}

              {(author.email || author.links.length > 0) && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {/* Rendered only when the author actually set one — a blank
                      address comes back as null, not "". */}
                  {author.email && (
                    <a
                      href={mailtoHref(author.email)}
                      className="text-muted-foreground transition-colors hover:text-primary"
                      aria-label={t("author.emailLabel", { name })}
                    >
                      <Mail className="h-5 w-5" />
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
                        className="text-muted-foreground transition-colors hover:text-primary"
                        // Localized: a bare `link.type` would read "website" to
                        // a screen reader on the Nepali site.
                        aria-label={t("author.linkLabel", {
                          name,
                          platform: t(`author.platform.${link.type}`),
                        })}
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {bio && (
          <section className="mx-auto w-full max-w-5xl px-4 pt-10 sm:px-6">
            <h2 className="mb-3 text-xl font-semibold text-primary">
              {t("author.aboutHeading")}
            </h2>
            {/* Markdown-only (no rehype-raw): a biography is prose, and there is
                no reason for it to be able to inject markup. */}
            <div className="font-paragraph content-prose max-w-3xl">
              <Markdown remarkPlugins={[remarkGfm]}>{bio}</Markdown>
            </div>
          </section>
        )}

        <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
          <h2 className="mb-4 text-xl font-semibold text-primary">
            {t("author.casesHeading", { count: author.cases.length })}
          </h2>

          {author.cases.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("author.noCases")}</p>
          ) : (
            <ul className="grid list-none gap-4 p-0 sm:grid-cols-2">
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
                      className="flex h-full flex-col rounded-lg border p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <CaseTypeBadge caseType={entry.case_type}>
                          {typeKey
                            ? t(typeKey)
                            : entry.case_type.replace(/[_-]/g, " ")}
                        </CaseTypeBadge>
                        {published && (
                          <span className="text-xs text-muted-foreground">
                            {published.primary}
                          </span>
                        )}
                      </div>

                      <span className="font-semibold text-primary">{entry.title}</span>

                      {entry.short_description?.trim() && (
                        <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {entry.short_description}
                        </span>
                      )}

                      {entry.bigo != null && entry.bigo > 0 && (
                        <span className="mt-2 text-sm font-semibold text-accent">
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
