import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUpRight, Download, FileSearch, MessagesSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import Seo from "@/components/Seo";
import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { BrowseAllFolderCard } from "@/components/materials/BrowseAllFolderCard";
import { FolderCard } from "@/components/materials/FolderCard";
import { RecentMaterialsCarousel } from "@/components/materials/RecentMaterialsCarousel";
import { Panel } from "@/components/ui/panel";
import { SplitHeading } from "@/components/ui/split-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { MATERIAL_SERIES, seriesCount } from "@/data/material-series";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { formatArchiveCount, pickRecentMaterials } from "@/lib/materials-landing";
import {
  RECENT_MATERIALS_COUNT,
  archiveStatisticsQuery,
  recentMaterialsQuery,
} from "@/queries/materials-landing";
import { getMaterial, materialTail } from "@/services/datalake-api";
import { CHAT_URL } from "@/lib/external-links";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

const CC_BY_NC_URL = "https://creativecommons.org/licenses/by-nc/4.0/";

/** The three ways to use the archive, in the capabilities bento. */
const CAPABILITIES = [
  {
    key: "download",
    icon: Download,
    titleFallback: "Download everything",
    lineFallback: "Open any series and follow every document to its source file.",
  },
  {
    key: "ask",
    icon: MessagesSquare,
    titleFallback: "Ask the AI assistant",
    lineFallback: "Put a question to the archive in Nepali or English and get cited answers.",
  },
  {
    key: "analyze",
    icon: FileSearch,
    titleFallback: "Analyze in bulk",
    lineFallback: "The structured data is open (CC BY-NC) — build on it from our GitHub.",
  },
] as const;

export default function MaterialsLanding() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const { data: statistics } = useQuery({ ...archiveStatisticsQuery(), staleTime: 5 * 60 * 1000 });
  const { data: recentResponse } = useQuery({ ...recentMaterialsQuery(), staleTime: 5 * 60 * 1000 });

  // Counts come from `seriesCount` rather than a by_source lookup here: a shelf
  // can now be narrower than its source token (five of them scope
  // `official_report`), so the arithmetic differs per shelf and lives with the
  // registry that defines it.
  const materials = statistics?.materials;

  const recents = recentResponse
    ? pickRecentMaterials(recentResponse.results, RECENT_MATERIALS_COUNT)
    : null;

  // Each recent card shows ITS OWN document's description — search hits carry
  // none when browsing. Four ~1KB fetches, on the same query key the document
  // page uses, so clicking through hits a warm cache.
  const recentDetails = useQueries({
    queries: (recents ?? []).map(({ result }) => {
      const tail = materialTail(result.id);
      return {
        queryKey: ["datalake-material", tail] as const,
        queryFn: () => getMaterial(tail),
        staleTime: 5 * 60 * 1000,
      };
    }),
  });
  const descriptions: Record<string, { ne?: string | null; en?: string | null }> = {};
  (recents ?? []).forEach(({ result }, index) => {
    const detail = recentDetails[index]?.data;
    if (!detail?.description) return;
    descriptions[result.id] =
      typeof detail.description === "string"
        ? { ne: detail.description, en: detail.description }
        : detail.description;
  });

  const gridRef = useRevealOnScroll<HTMLElement>();
  const capabilitiesRef = useRevealOnScroll<HTMLElement>();
  const recentRef = useRevealOnScroll<HTMLElement>();


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
            {/* The redesign's pill with the round arrow (ui/arrow-link), as an
                in-page anchor rather than a route. */}
            <a
              href="#series"
              className="group inline-flex items-center justify-between gap-6 rounded-full bg-surface py-1.5 pl-5 pr-1.5 text-base text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-surface"
            >
              {t("materialsLanding.ctaBrowse", "Browse the archive")}
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-surface text-primary-foreground transition-transform duration-200 group-hover:translate-y-0.5"
              >
                <ArrowDown className="h-4 w-4" />
              </span>
            </a>
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
          <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-primary-foreground/15 pt-6 md:mt-20">
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
                {t("materialsLanding.stats.series", "Series")}
              </dt>
              <dd className="mt-1 text-2xl tabular-nums text-primary-foreground md:text-3xl">
                {formatArchiveCount(MATERIAL_SERIES.length, language)}
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
          <SplitHeading
            id="series-heading"
            lead={`${t("materialsLanding.grid.title", "Browse by series")}.`}
            rest={t("materialsLanding.grid.lede", "Shelved by publisher.")}
          />
          <ul className="mt-12 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Capabilities, in the home page's bento kit: a two-tone heading over
          three grey panels, one per way to use the archive. */}
      <section ref={capabilitiesRef} aria-labelledby="capabilities-heading">
        <div className="layout-container pb-16 md:pb-24">
          <SplitHeading
            id="capabilities-heading"
            lead={`${t("materialsLanding.capabilities.title", "The archive works for you")}.`}
            rest={t("materialsLanding.capabilities.short", "Read it, ask it, take it all.")}
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {CAPABILITIES.map(({ key, icon: Icon, titleFallback, lineFallback }) => (
              <Panel key={key} className="min-h-[15rem] justify-between gap-10">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-primary"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-xl font-normal text-primary">
                    {t(`materialsLanding.capabilities.${key}Title`, titleFallback)}
                  </h3>
                  <p className="mt-2 text-[15px] leading-6 text-muted-foreground">
                    {t(`materialsLanding.capabilities.${key}Line`, lineFallback)}
                  </p>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      {/* Recently added. */}
      <section
        ref={recentRef}
        aria-labelledby="recent-heading"
      >
        <div className="layout-container py-16 md:py-24">
          {recents ? (
            <RecentMaterialsCarousel
              materials={recents}
              descriptions={descriptions}
              heading={
                <div>
                  <h2 id="recent-heading" className="font-home-section-title text-primary">
                    {t("materialsLanding.recent.title", "Recently added")}
                  </h2>
                  {/* Four cards with nothing around them read as the whole
                      holding — a reviewer counted three news items here and
                      asked why we only have those three. Say what the slice is
                      and where the rest live. */}
                  {materials && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      <span className="tabular-nums">
                        {t("materialsLanding.recent.slice", {
                          shown: formatArchiveCount(recents.length, language),
                          total: formatArchiveCount(materials.total, language),
                          defaultValue:
                            "The {{shown}} newest of {{total}} documents in the archive.",
                        })}
                      </span>{" "}
                      <Link
                        to="/materials/?sort=newest"
                        className="font-medium text-primary underline underline-offset-4 hover:text-primary/75"
                      >
                        {t("materialsLanding.recent.browseAll", "Browse all documents")}
                      </Link>
                    </p>
                  )}
                </div>
              }
            />
          ) : (
            <>
              <h2 id="recent-heading" className="font-home-section-title pb-10 text-primary">
                {t("materialsLanding.recent.title", "Recently added")}
              </h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="min-h-[300px] w-full rounded-2xl" />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

    </div>
  );
}
