import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import Seo from "@/components/Seo";
import { CapabilityRow } from "@/components/materials/CapabilityRow";
import { FolderCard } from "@/components/materials/FolderCard";
import { RecentMaterialsTable } from "@/components/materials/RecentMaterialsTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MATERIAL_SERIES, seriesBySlug } from "@/data/material-series";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { formatArchiveCount, pickRecentMaterials } from "@/lib/materials-landing";
import {
  RECENT_MATERIALS_COUNT,
  archiveStatisticsQuery,
  recentMaterialsQuery,
} from "@/queries/materials-landing";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

const CHAT_URL = "https://chat.jawafdehi.org";
const GITHUB_URL = "https://github.com/Jawafdehi";
const CC_BY_NC_URL = "https://creativecommons.org/licenses/by-nc/4.0/";

/** The three folders on the hero shelf — flagship series, front one linked. */
const SHELF_BACK_SLUGS = ["kanun-patrika", "charge-sheets"] as const;
const SHELF_FRONT_SLUG = "ciaa-annual-reports";

export default function MaterialsLanding() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const { data: statistics } = useQuery({ ...archiveStatisticsQuery(), staleTime: 5 * 60 * 1000 });
  const { data: recentResponse } = useQuery({ ...recentMaterialsQuery(), staleTime: 5 * 60 * 1000 });

  const materials = statistics?.materials;
  const countBySource = new Map(
    (materials?.by_source ?? []).map((row) => [row.source, row.count]),
  );
  const seriesCount = (source: string): number | null =>
    materials ? (countBySource.get(source) ?? 0) : null;

  const recents = recentResponse
    ? pickRecentMaterials(recentResponse.results, RECENT_MATERIALS_COUNT)
    : null;

  const gridRef = useRevealOnScroll<HTMLElement>();
  const capabilitiesRef = useRevealOnScroll<HTMLElement>();
  const recentRef = useRevealOnScroll<HTMLElement>();
  const trustRef = useRevealOnScroll<HTMLElement>();

  const shelfFront = seriesBySlug(SHELF_FRONT_SLUG);
  const shelfBack = SHELF_BACK_SLUGS.map((slug) => seriesBySlug(slug));

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

      {/* Hero: a centered stack — stat line, title, lede, CTA pair — with the
          folder shelf as the big visual beneath. */}
      <header className="layout-container pb-16 pt-14 text-center md:pb-24 md:pt-20">
        {materials && (
          <p className="font-mono text-sm tabular-nums text-muted-foreground">
            {formatArchiveCount(materials.total, language)}{" "}
            {t("materialsLanding.grid.documents", "documents")}
          </p>
        )}
        <h1 className="font-archive-hero-title mx-auto mt-4 max-w-3xl">
          {t("materialsLanding.heroTitle", "Nepal's public records. One archive. Forever free.")}
        </h1>
        <p className="font-page-lede mx-auto mt-5 max-w-xl">
          {t(
            "materialsLanding.heroLede",
            "Documents collected from government bodies — searchable, citable, always open.",
          )}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="active:scale-[0.98]">
            <a href="#series">{t("materialsLanding.ctaBrowse", "Browse the archive")}</a>
          </Button>
          <Button asChild variant="secondary" size="lg" className="active:scale-[0.98]">
            <a href={CHAT_URL} target="_blank" rel="noopener noreferrer">
              {t("materialsLanding.ctaAsk", "Ask the AI assistant")} →
            </a>
          </Button>
        </div>

        {/* The shelf: two decorative folders behind, one real link in front. */}
        <div className="relative mx-auto mt-16 hidden w-full max-w-xl sm:block md:mt-20">
          {shelfBack[0] && (
            <FolderCard
              decorative
              series={shelfBack[0]}
              count={null}
              className="absolute -left-2 top-2 w-[46%] -rotate-[6deg] opacity-80"
            />
          )}
          {shelfBack[1] && (
            <FolderCard
              decorative
              series={shelfBack[1]}
              count={null}
              className="absolute -right-2 top-2 w-[46%] rotate-[6deg] opacity-80"
            />
          )}
          {shelfFront && (
            <FolderCard
              series={shelfFront}
              count={seriesCount(shelfFront.source)}
              elevation="lg"
              heroSheets
              className="relative mx-auto mt-10 w-[54%] text-left"
            />
          )}
        </div>
      </header>

      {/* Browse by series. */}
      <section
        ref={gridRef}
        id="series"
        aria-labelledby="series-heading"
        className="scroll-mt-24 border-t border-border"
      >
        <div className="layout-container py-16 md:py-24">
          <h2 id="series-heading" className="font-archive-section-title">
            {t("materialsLanding.grid.title", "Browse by series")}
          </h2>
          <ul className="mt-12 grid list-none grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {MATERIAL_SERIES.map((series) => (
              <li key={series.slug} className="pt-4">
                <FolderCard series={series} count={seriesCount(series.source)} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Capabilities, on the navy fill with its one sanctioned wash. */}
      <section
        ref={capabilitiesRef}
        aria-labelledby="capabilities-heading"
        className="relative isolate overflow-hidden border-t border-border bg-primary-surface"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_20%_-10%,hsl(var(--primary-surface))_45%,hsl(var(--navy-deep))_100%)]"
        />
        <div className="layout-container grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <h2
              id="capabilities-heading"
              className="font-archive-section-title font-archive-title-inverse"
            >
              {t("materialsLanding.capabilities.title", "The archive works for you")}
            </h2>
            <p className="mt-4 max-w-sm leading-relaxed text-primary-foreground/70">
              {t(
                "materialsLanding.capabilities.lede",
                "Read it, question it, or take all of it — the records stay public either way.",
              )}
            </p>
          </div>
          <div className="divide-y divide-primary-foreground/15 lg:col-span-8">
            <CapabilityRow
              index={1}
              title={t("materialsLanding.capabilities.downloadTitle", "Download everything")}
              line={t(
                "materialsLanding.capabilities.downloadLine",
                "Open any series and follow every document to its source file.",
              )}
              href="#series"
            />
            <CapabilityRow
              index={2}
              title={t("materialsLanding.capabilities.askTitle", "Ask the AI assistant")}
              line={t(
                "materialsLanding.capabilities.askLine",
                "Put a question to the archive in Nepali or English and get cited answers.",
              )}
              href={CHAT_URL}
              external
            />
            <CapabilityRow
              index={3}
              title={t("materialsLanding.capabilities.analyzeTitle", "Analyze in bulk")}
              line={t(
                "materialsLanding.capabilities.analyzeLine",
                "The structured data is open (CC BY-NC) — build on it from our GitHub.",
              )}
              href={GITHUB_URL}
              external
            />
          </div>
        </div>
      </section>

      {/* Recently added. */}
      <section
        ref={recentRef}
        aria-labelledby="recent-heading"
        className="border-t border-border"
      >
        <div className="layout-container py-16 md:py-24">
          <h2 id="recent-heading" className="font-archive-section-title">
            {t("materialsLanding.recent.title", "Recently added")}
          </h2>
          <div className="mt-10">
            {recents ? (
              <RecentMaterialsTable materials={recents} />
            ) : (
              <div className="space-y-3 rounded-2xl border border-border bg-surface p-6 shadow-elev-sm">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-6 w-full" />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trust strip: the page's one centered element. */}
      <section ref={trustRef} className="border-t border-border">
        <div className="layout-container py-14 text-center md:py-20">
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium text-foreground">
            <span>{t("materialsLanding.trust.builtBy", "Built by Nepalis")}</span>
            <span aria-hidden="true" className="text-muted-foreground">·</span>
            <span>{t("materialsLanding.trust.openData", "Open data (CC BY-NC)")}</span>
            <span aria-hidden="true" className="text-muted-foreground">·</span>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm underline decoration-primary/35 underline-offset-4 outline-none hover:decoration-primary focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t("materialsLanding.trust.openSource", "Open source")}
            </a>
            <span aria-hidden="true" className="text-muted-foreground">·</span>
            <Link
              to="/data-quality"
              className="rounded-sm underline decoration-primary/35 underline-offset-4 outline-none hover:decoration-primary focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t("materialsLanding.trust.coverage", "What we cover")} →
            </Link>
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {t("footer.disclaimer")}
          </p>
        </div>
      </section>
    </div>
  );
}
