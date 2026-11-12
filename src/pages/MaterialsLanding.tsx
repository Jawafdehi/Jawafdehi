import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import Seo from "@/components/Seo";
import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { BrowseAllFolderCard } from "@/components/materials/BrowseAllFolderCard";
import { FolderCard } from "@/components/materials/FolderCard";
import { ArrowLink } from "@/components/ui/arrow-link";
import { MATERIAL_SERIES, seriesCount } from "@/data/material-series";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { formatArchiveCount } from "@/lib/materials-landing";
import { archiveStatisticsQuery } from "@/queries/materials-landing";
import { CHAT_URL } from "@/lib/external-links";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

const CC_BY_NC_URL = "https://creativecommons.org/licenses/by-nc/4.0/";


export default function MaterialsLanding() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const { data: statistics } = useQuery({ ...archiveStatisticsQuery(), staleTime: 5 * 60 * 1000 });

  // Counts come from `seriesCount` rather than a by_source lookup here: a shelf
  // can now be narrower than its source token (five of them scope
  // `official_report`), so the arithmetic differs per shelf and lives with the
  // registry that defines it.
  const materials = statistics?.materials;

  const gridRef = useRevealOnScroll<HTMLElement>();


  const title = `${t("materialsLanding.title", "Documents & other materials — Nepal's public records")} | ${SITE_NAME}`;
  const description = t(
    "materialsLanding.metaDescription",
    "Nepal's public records in one open archive: CIAA reports, charge sheets, Kanun Patrika precedents, court orders and procurement notices — free to search, cite and reuse.",
  );

  // Structured data from REAL figures only: the archive as one Dataset with a
  // per-series hasPart.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/assets/logo.svg`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Jawafdehi", item: `${SITE_URL}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: t("materialsPage.heading", "Documents & other materials"),
            item: `${SITE_URL}/materials/`,
          },
        ],
      },
      {
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/materials/`,
        url: `${SITE_URL}/materials/`,
        name: title,
        description,
        inLanguage: ["ne", "en"],
        mainEntity: {
          "@type": "Dataset",
          name: "Jawafdehi Archive — नेपालका सार्वजनिक अभिलेख",
          description,
          url: `${SITE_URL}/materials/`,
          creator: { "@id": `${SITE_URL}/#organization` },
          license: CC_BY_NC_URL,
          isAccessibleForFree: true,
          hasPart: MATERIAL_SERIES.map((series) => ({
            "@type": "Dataset",
            name: series.name.ne,
            alternateName: series.name.en,
            description: series.description.ne,
            url: `${SITE_URL}/materials/?series=${series.slug}`,
            creator: { "@id": `${SITE_URL}/#organization` },
            license: CC_BY_NC_URL,
            isAccessibleForFree: true,
          })),
        },
      },
    ],
  };

  return (
    <div className="bg-background">
      <Seo
        title={title}
        description={description}
        canonicalUrl={`${SITE_URL}/materials/`}
        language={language}
      >
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Seo>

      {/* Hero: the archive's own navy stage with the home page's diamond field
          — /materials is the archive, so it wears the archive's shader; the
          products (MCP, likhit) keep theirs. Left-aligned like /mcp, with the
          holdings stated underneath instead of a decorative shelf. The -mt/pt
          pair slides the navy behind the transparent navbar. */}
      <header className="relative isolate -mt-[76px] overflow-hidden bg-primary-surface pt-[76px]">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <ShaderBackdrop design="diamond" />
          {/* Navy pooled behind the copy column and under the navbar, so the
              text always sits on plain navy. */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--primary-surface))_0%,hsl(var(--primary-surface)/0.9)_40%,transparent_75%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--primary-surface))_0px,hsl(var(--primary-surface))_60px,transparent_170px)]" />
        </div>

        <div className="layout-container flex min-h-[min(760px,calc(100svh-76px))] flex-col justify-center pb-16 pt-12 md:pb-20">
          <p className="font-eyebrow text-sm tracking-[0.06em] text-[hsl(var(--accent-on-dark))] md:text-base">
            {t("materialsLanding.heroEyebrow", "The archive's documents")}
          </p>
          <h1 className="font-home-display mt-5 max-w-[16ch] text-[clamp(2.6rem,6vw,5.25rem)] text-primary-foreground [:root[lang=ne]_&]:max-w-[20ch]">
            {t("materialsLanding.heroTitle", "Nepal's public records. One archive.")}
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-primary-foreground/80 md:text-2xl md:leading-9">
            {t(
              "materialsLanding.heroLede",
              "Documents collected from government bodies — searchable, citable, always open.",
            )}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            {/* The redesign's pill with the round arrow (ui/arrow-link): straight
                into archive search, on its Materials tab. */}
            <ArrowLink to="/search?type=material" tone="light">
              {t("materialsLanding.ctaBrowse", "Browse the archive")}
            </ArrowLink>
            <a
              href={CHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded text-base text-primary-foreground/80 transition-colors hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
            >
              {t("materialsLanding.ctaAsk", "Ask the AI assistant")}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>

          {/* The holdings, stated: what a shelf of folders only implied. */}
          <dl className="mt-14 flex flex-wrap gap-x-16 gap-y-6 md:mt-16">
            <div>
              <dt className="text-sm text-primary-foreground/55">
                {t("materialsLanding.stats.documents", "Documents")}
              </dt>
              <dd className="mt-1 text-2xl tabular-nums text-primary-foreground md:text-3xl">
                {materials ? formatArchiveCount(materials.total, language) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-primary-foreground/55">
                {t("materialsLanding.stats.licence", "Licence")}
              </dt>
              <dd className="mt-1 text-2xl text-primary-foreground md:text-3xl">CC BY-NC</dd>
            </div>
          </dl>
        </div>
      </header>

      {/* Browse by series. */}
      <section
        ref={gridRef}
        id="series"
        aria-labelledby="series-heading"
        className="scroll-mt-24"
      >
        <div className="layout-container py-16 md:py-24">
          <h2 id="series-heading" className="font-home-section-title text-primary">
            {t("materialsLanding.grid.title", "Browse by series")}
          </h2>
          <ul className="mt-12 grid list-none grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 lg:grid-cols-4">
            {MATERIAL_SERIES.map((series) => (
              <li key={series.slug}>
                <FolderCard series={series} count={seriesCount(series, materials)} />
              </li>
            ))}
            <li>
              <BrowseAllFolderCard />
            </li>
          </ul>
        </div>
      </section>

    </div>
  );
}
