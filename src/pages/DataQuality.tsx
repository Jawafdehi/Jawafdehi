import { type FormEvent, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Database, FileText, Gavel } from "lucide-react";

import { getStatistics } from "@/services/jds-api";
import type { MaterialsMetrics, EntityMetrics, DataLakeMetrics } from "@/types/jds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SearchBar } from "@/components/ui/search-bar";
import { Skeleton } from "@/components/ui/skeleton";

/** Breakdown lists longer than this collapse behind a "show more" toggle. */
const BREAKDOWN_VISIBLE_LIMIT = 10;

type BreakdownItem = { label: string; count: number };

type CompletenessItem = { label: string; part: number; whole: number; pct: number };

const DataQuality = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const { data, isLoading, isError } = useQuery({
    // Share the cache with the home hero — same query key + fn.
    queryKey: ["statistics"],
    queryFn: getStatistics,
    staleTime: 5 * 60 * 1000,
  });

  const nes = data?.nes;
  const ngm = data?.ngm;
  const materials = data?.materials;

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{t("dataQuality.title", "Data Quality & Coverage")} — Jawafdehi</title>
        <meta
          name="description"
          content={t(
            "dataQuality.intro",
            "What our public datasets track today, and how complete the records are.",
          )}
        />
        <link rel="canonical" href="https://jawafdehi.org/data-quality" />
      </Helmet>

      <main id="main-content" className="flex-1">
        <section className="border-b bg-muted/20">
          <div className="container mx-auto px-6 py-12 md:py-16">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {t("dataQuality.title", "Data Quality & Coverage")}
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground md:text-lg">
              {t(
                "dataQuality.intro",
                "What our public datasets track today, and how complete the records are.",
              )}
            </p>

            <form className="mt-6 w-full max-w-2xl" onSubmit={submitSearch}>
              <label className="sr-only" htmlFor="data-quality-search">
                {t("dataQuality.searchLabel", "Search the Jawafdehi archive")}
              </label>
              <SearchBar
                id="data-quality-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t(
                  "dataQuality.searchPlaceholder",
                  "Search cases, people, offices, court records, or materials",
                )}
                submitLabel={t("dataQuality.searchSubmit", "Search")}
              />
            </form>
          </div>
        </section>

        <div className="container mx-auto space-y-10 px-6 py-12">
          {isError && (
            <p className="text-muted-foreground">
              {t("dataQuality.error", "Metrics are temporarily unavailable. Please try again later.")}
            </p>
          )}

          {isLoading && !isError && <LoadingState />}

          {nes && <EntitiesSection nes={nes} t={t} />}
          {ngm && <DataLakeSection ngm={ngm} t={t} />}
          {materials && <MaterialsSection materials={materials} t={t} />}
        </div>
      </main>
    </div>
  );
};

type Translate = ReturnType<typeof useTranslation>["t"];

function EntitiesSection({ nes, t }: Readonly<{ nes: EntityMetrics; t: Translate }>) {
  const completeness: CompletenessItem[] = [
    {
      label: t("dataQuality.completeness.withIdentifier", "Have a stable identifier"),
      part: nes.counts.with_identifier,
      whole: nes.total,
      pct: nes.completeness.with_identifier,
    },
    {
      label: t("dataQuality.completeness.withProvenance", "Have provenance"),
      part: nes.counts.with_provenance,
      whole: nes.total,
      pct: nes.completeness.with_provenance,
    },
    {
      label: t("dataQuality.completeness.withBilingualName", "Bilingual name (EN + NE)"),
      part: nes.counts.with_bilingual_name,
      whole: nes.total,
      pct: nes.completeness.with_bilingual_name,
    },
  ];

  return (
    <SourceSection
      icon={<Database className="h-6 w-6 text-accent" />}
      heading={t("dataQuality.nes.heading", "Entities")}
      description={t(
        "dataQuality.nes.description",
        "People, offices, organizations and locations tracked across the archive.",
      )}
      headlineLabel={t("dataQuality.nes.total", "Entities tracked")}
      headlineValue={nes.total}
      breakdowns={[
        {
          title: t("dataQuality.nes.byType", "By type"),
          items: nes.by_type.map((r) => ({ label: r.entity_type, count: r.count })),
        },
      ]}
      completeness={completeness}
      t={t}
    />
  );
}

function DataLakeSection({ ngm, t }: Readonly<{ ngm: DataLakeMetrics; t: Translate }>) {
  const completeness: CompletenessItem[] = [
    {
      label: t("dataQuality.completeness.nesResolved", "Resolved to a tracked entity"),
      part: ngm.counts.nes_resolved,
      whole: ngm.court_cases_total,
      pct: ngm.completeness.nes_resolved,
    },
    {
      label: t("dataQuality.completeness.withRegistrationDate", "Have a registration date"),
      part: ngm.counts.with_registration_date,
      whole: ngm.court_cases_total,
      pct: ngm.completeness.with_registration_date,
    },
    {
      label: t("dataQuality.completeness.withDocumentSources", "Have document sources"),
      part: ngm.counts.with_document_sources,
      whole: ngm.court_cases_total,
      pct: ngm.completeness.with_document_sources,
    },
  ];

  return (
    <SourceSection
      icon={<Gavel className="h-6 w-6 text-accent" />}
      heading={t("dataQuality.ngm.heading", "Judicial records")}
      description={t(
        "dataQuality.ngm.description",
        "Court cases, hearings and source documents collected from Nepal's judiciary.",
      )}
      headlineLabel={t("dataQuality.ngm.courtCases", "Court records")}
      headlineValue={ngm.court_cases_total}
      secondaryHeadlines={[
        { label: t("dataQuality.ngm.courts", "Courts"), value: ngm.courts_total },
      ]}
      breakdowns={[
        {
          title: t("dataQuality.ngm.byCourtType", "By court type"),
          items: ngm.by_court_type.map((r) => ({
            label: r.court__court_type,
            count: r.count,
          })),
        },
      ]}
      completeness={completeness}
      t={t}
    />
  );
}

function MaterialsSection({
  materials,
  t,
}: Readonly<{ materials: MaterialsMetrics; t: Translate }>) {
  const completeness: CompletenessItem[] = [
    {
      label: t("dataQuality.materials.withDescription", "Have a description"),
      part: materials.counts.with_description,
      whole: materials.total,
      pct: materials.completeness.with_description,
    },
    {
      label: t("dataQuality.materials.withUrl", "Have a source link"),
      part: materials.counts.with_url,
      whole: materials.total,
      pct: materials.completeness.with_url,
    },
    {
      label: t("dataQuality.materials.withDate", "Have a date"),
      part: materials.counts.with_date,
      whole: materials.total,
      pct: materials.completeness.with_date,
    },
  ];

  return (
    <SourceSection
      icon={<FileText className="h-6 w-6 text-accent" />}
      heading={t("dataQuality.materials.heading", "Materials")}
      description={t(
        "dataQuality.materials.description",
        "Development projects, financing records and source documents collected from public portals.",
      )}
      headlineLabel={t("dataQuality.materials.total", "Materials tracked")}
      headlineValue={materials.total}
      breakdowns={[
        {
          title: t("dataQuality.materials.byType", "By type"),
          items: materials.by_type.map((r) => ({
            label: r.material_type,
            count: r.count,
          })),
        },
        {
          title: t("dataQuality.materials.bySource", "By source"),
          items: materials.by_source.map((r) => ({
            label: r.source,
            count: r.count,
          })),
        },
      ]}
      completeness={completeness}
      t={t}
    />
  );
}

type Headline = { label: string; value: number };

function SourceSection({
  icon,
  heading,
  description,
  headlineLabel,
  headlineValue,
  secondaryHeadlines = [],
  breakdowns,
  completeness,
  t,
}: Readonly<{
  icon: React.ReactNode;
  heading: string;
  description: string;
  headlineLabel: string;
  headlineValue: number;
  secondaryHeadlines?: Headline[];
  breakdowns: { title: string; items: BreakdownItem[] }[];
  completeness: CompletenessItem[];
  t: Translate;
}>) {
  const headlines: Headline[] = [
    { label: headlineLabel, value: headlineValue },
    ...secondaryHeadlines,
  ];

  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        {icon}
        <div>
          <h2 className="text-2xl font-bold text-foreground">{heading}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Headline counts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              {t("dataQuality.headlineHeading", "At a glance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {headlines.map((h) => (
              <div key={h.label}>
                <p className="text-3xl font-extrabold tabular-nums text-primary">
                  {h.value.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">{h.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Breakdowns */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              {t("dataQuality.breakdownHeading", "What's tracked")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {breakdowns.map((b) => (
              <BreakdownList key={b.title} title={b.title} items={b.items} t={t} />
            ))}
          </CardContent>
        </Card>

        {/* Completeness */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              {t("dataQuality.completeness.heading", "Completeness")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {completeness.map((c) => (
              <CompletenessBar key={c.label} item={c} t={t} />
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function BreakdownList({
  title,
  items,
  t,
}: Readonly<{ title: string; items: BreakdownItem[]; t: Translate }>) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = items.length > BREAKDOWN_VISIBLE_LIMIT;
  const visibleItems =
    canCollapse && !expanded ? items.slice(0, BREAKDOWN_VISIBLE_LIMIT) : items;
  const hiddenCount = items.length - BREAKDOWN_VISIBLE_LIMIT;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("dataQuality.empty", "No data yet")}</p>
      ) : (
        <>
          <ul className="space-y-1.5">
            {visibleItems.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-2">
                <Badge variant="secondary" className="font-normal capitalize">
                  {item.label}
                </Badge>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {item.count.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
          {canCollapse && (
            <Button
              variant="link"
              size="sm"
              className="mt-1 h-auto p-0 text-xs"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded
                ? t("dataQuality.showLess", "Show less")
                : t("dataQuality.showMore", "Show {{count}} more", {
                    count: hiddenCount,
                  })}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function CompletenessBar({
  item,
  t,
}: Readonly<{ item: CompletenessItem; t: Translate }>) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm text-foreground">{item.label}</span>
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">
          {item.pct}%
        </span>
      </div>
      <Progress value={item.pct} className="h-2" />
      <p className="mt-1 text-xs text-muted-foreground">
        {t("dataQuality.completeness.ofTotal", "{{part}} of {{total}} ({{pct}}%)", {
          part: item.part.toLocaleString(),
          total: item.whole.toLocaleString(),
          pct: item.pct,
        })}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-10">
      {[0, 1].map((section) => (
        <div key={section} className="space-y-5">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {[0, 1, 2].map((card) => (
              <Skeleton key={card} className="h-56 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default DataQuality;
