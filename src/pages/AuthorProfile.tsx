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
import { getAuthorProfile } from "@/services/jds-api";
import { Seo } from "@/components/Seo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseTypeBadge } from "@/components/CaseBadge";
import { getCaseTypeLabelKey } from "@/utils/case-entities";
import { formatDateForLanguage } from "@/utils/date";
import { formatBigo } from "@/utils/number";
import { SITE_URL } from "@/utils/seo";
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
  const pageDescription = author.description?.trim()
    ? `${name} — ${author.description}`
    : t("author.metaDescription", { name });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title={pageTitle}
        description={pageDescription}
        canonicalUrl={`${SITE_URL}/author/${author.slug}`}
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
              {author.description?.trim() && (
                <p className="mt-1 text-base text-muted-foreground">
                  {author.description}
                </p>
              )}

              {(author.email || author.links.length > 0) && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {/* Rendered only when the author actually set one — a blank
                      address comes back as null, not "". */}
                  {author.email && (
                    <a
                      href={`mailto:${author.email}`}
                      className="text-muted-foreground transition-colors hover:text-primary"
                      aria-label={t("author.emailLabel", { name })}
                    >
                      <Mail className="h-5 w-5" />
                    </a>
                  )}
                  {author.links.map((link) => {
                    const Icon = LINK_ICONS[link.type];
                    if (!Icon) return null;
                    return (
                      <a
                        key={`${link.type}-${link.value}`}
                        href={link.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground transition-colors hover:text-primary"
                        aria-label={link.type}
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
