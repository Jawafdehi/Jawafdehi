import { Button } from "@/components/ui/button";
import { CaseCard } from "@/components/CaseCard";
import { Hero } from "@/components/home/hero";
import { ArchiveBento } from "@/components/home/archive-bento";
import { ArchiveFigures } from "@/components/home/archive-figures";
import { Reveal } from "@/components/ui/reveal";
import { ReportCaseCta } from "@/components/home/report-case-cta";
import { BlogSection } from "@/components/home/blog-section";
import { SupportingPartner } from "@/components/home/supportingpartner";
import { ArrowRight } from "@/components/icons";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useQuery } from "@tanstack/react-query";
import { getStatistics } from "@/services/jds-api";
import {
  featuredCasesQuery,
  FEATURED_CASE_COUNT,
  FEATURED_CASE_GRID_COUNT,
} from "@/queries/home";
import { formatBigo, formatCompactCount, formatCount } from "@/utils/number";
import { useMemo } from "react";
import { caseCardPropsFromSearchResult } from "@/lib/case-card-props";
import { useTranslation } from "react-i18next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_NAME_NEPALI, SITE_URL } from "@/utils/seo";

const Index = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const { data: stats, isError: statsError, isLoading: statsLoading } = useQuery({
    queryKey: ['statistics'],
    queryFn: getStatistics,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });

  // Shared loading/error/missing guard for the hero stats. With no formatter a
  // resolved value renders as a count in lakh/crore grouping (formatCount); pass one (e.g. formatBigo
  // for the currency tile) to render it differently. A missing value (an absent
  // optional field on an older/pre-deploy payload) renders the "—" placeholder
  // rather than "0" / "Rs 0", so an absent stat never reads as a real zero.
  const getStatValue = (
    value: number | undefined,
    format: (v: number) => string = formatCount,
  ): string => {
    if (statsError || statsLoading || value == null) return "—";
    return format(value);
  };

  // Query key + params live in queries/home.ts, shared verbatim with the SSR
  // prefetch in entry-server.tsx — the two must agree or the prefetch is wasted.
  // Still the search source (not /api/cases/), sorted newest first.
  const { data: casesData } = useQuery({
    ...featuredCasesQuery(),
    staleTime: 5 * 60 * 1000,
  });

  const featuredCases = useMemo(() => {
    if (!casesData?.results) return [];
    return casesData.results
      .slice(0, FEATURED_CASE_COUNT)
      .map((result) => caseCardPropsFromSearchResult(result, currentLang));
  }, [casesData, currentLang]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`${SITE_NAME} — Nepal's Digital Archive of Public Accountability`}
        description={SITE_DESCRIPTION}
        canonicalUrl={`${SITE_URL}/`}
      >
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": SITE_NAME,
          // schema.org's slot for the same organisation under another name, and
          // the one identity field with room for the Nepali. Appending it to
          // SITE_NAME instead would double the length of every <title>.
          "alternateName": [SITE_NAME_NEPALI, "Jawafdehi"],
          "url": "https://jawafdehi.org",
          "description": SITE_DESCRIPTION,
          "inLanguage": ["en", "ne"],
          "potentialAction": [
            {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://jawafdehi.org/search?type=case&q={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            },
            {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://jawafdehi.org/search?type=entity&q={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            }
          ]
        })}</script>
      </Seo>

      <div className="flex-1">
        <Hero />
        <ArchiveFigures
          casesDocumented={getStatValue(stats?.published_cases)}
          totalBigo={getStatValue(stats?.total_bigo, formatBigo)}
          materials={getStatValue(stats?.materials?.total, formatCompactCount)}
          courtCasesTracked={getStatValue(stats?.ngm?.court_cases_total, formatCompactCount)}
        />
        <ArchiveBento casesDocumented={getStatValue(stats?.published_cases)} />


        {/* ── What we're building ── */}
        {/* <section id="archive-intro" className="py-12 bg-muted/30 border-b border-border">
          <div className="layout-container">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-base md:text-lg text-foreground/80 leading-relaxed">
                Corruption records are scattered across dozens of government portals, court systems, and public databases — inaccessible to most citizens.{" "}
                <span className="font-semibold text-foreground">We are building the technology and the volunteer network to bring it all into one permanent, publicly searchable knowledge base.</span>{" "}
                Free to use. Open source. Built entirely by Nepali volunteers.
              </p>
            </div>
          </div>
        </section>  */}

        {/* <Features /> */}

        {/* ── Featured Cases ── */}
        {/* The `recent-cases` id is kept on purpose: nothing in src links to it,
            but external links to jawafdehi.org/#recent-cases would break. */}
        <section id="recent-cases" className="py-12 md:py-16">
          <div className="layout-container">
            <Reveal>
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
                <div>
                  {/* Same subtitle treatment and no one-off underline as the
                      other sections (PR #359 visual review, item 5). One step
                      down from FaqSection's heading scale, matching the CTA
                      sections — the cards below carry this section, not the
                      heading. */}
                  <h2 className="font-home-section-title text-primary">
                    {t("home.featuredCases.heading", "Featured Cases")}
                  </h2>
                  <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/65 md:text-xl">
                    {t(
                      "home.featuredCases.subtitle",
                      "Recent high-impact corruption cases under public scrutiny",
                    )}
                  </p>
                </div>
              </div>
            </Reveal>

            {featuredCases.length > 0 ? (
              <>
                {/* Every case gets the same card: no lead or spotlight. Order
                    comes from the newest-first order from the search
                    source. */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredCases.map((caseItem, index) => (
                    <Reveal key={caseItem.id} className="h-full" delayMs={(index % 3) * 90}>
                      <CaseCard {...caseItem} />
                    </Reveal>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: FEATURED_CASE_GRID_COUNT }, (_, i) => (
                    <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              </>
            )}

            <Reveal>
              <div className="text-center mt-10 flex justify-center">
                <Button variant="primary" size="lg" asChild className="group">
                  <Link to="/search/?type=case">
                    {t("home.featuredCases.viewAll", "View all cases")}{" "}
                    <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Partners after the report band: the white strip keeps the band's
            navy from running into the footer's. */}
        <ReportCaseCta />
        {/* Recent blogs: the latest blog posts, linking to /blog. */}
        <BlogSection />
        <SupportingPartner />
      </div>
    </div>
  );
};

export default Index;
