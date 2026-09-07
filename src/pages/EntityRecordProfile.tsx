import type { ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertCircle, AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";

import { http, API_BASE_URL } from "@/services/http";
import { entityPath } from "@/lib/entity-links";
import { ViewJsonButton } from "@/components/ViewJsonButton";
import { ShareButton } from "@/components/ShareButton";
import { EntityAvatar } from "@/components/EntityAvatar";
import { EntityRelatedCases } from "@/components/EntityRelatedCases";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { entityKindFor, humanizeEntityType } from "@/utils/entity-helpers";

// Entity records are schema.org JSON-LD with a jawafdehi: extension namespace. We type
// the spine we read explicitly and keep an index signature for the long tail of
// type-specific fields (rendered generically).
interface JsonLdRef {
  "@id"?: string;
}
interface Identifier {
  propertyID?: string;
  value?: string;
}
interface VersionInfo {
  author?: { id?: string; slug?: string };
  created_at?: string;
  version_number?: number;
  change_description?: string;
}
type Bilingual = { en?: string | null; ne?: string | null };
interface EntityRecord {
  "@id": string;
  "@type"?: string | string[];
  additionalType?: string;
  name?: Bilingual | string;
  // A language map (`{en: [...], ne: [...]}`, what NES writes), an array, or a
  // plain string — normalised by localizedList().
  alternateName?: unknown;
  description?: Bilingual | string;
  address?: { description?: string; streetAddress?: string } | string;
  url?: string;
  sameAs?: string;
  identifier?: Identifier[] | string;
  dateCreated?: string;
  foundingDate?: string;
  leader?: string;
  image?: unknown;
  logo?: unknown;
  containedInPlace?: JsonLdRef;
  parentOrganization?: JsonLdRef;
  "jawafdehi:version"?: VersionInfo;
  [key: string]: unknown;
}

// Human label from the last segment of an IRI (when we can't resolve the name).
function iriLabel(iri: string | undefined): string {
  if (!iri) return "";
  const tail = iri.split("/").filter(Boolean).pop() || iri;
  return tail.replace(/-[a-z]{0,2}\d[\w-]*$/i, "").replace(/[-_]/g, " ").trim() || tail;
}

function bilingual(v: Bilingual | string | undefined): { en: string; ne: string } {
  if (!v) return { en: "", ne: "" };
  if (typeof v === "string") return { en: v, ne: "" };
  return { en: v.en || "", ne: v.ne || "" };
}

// Flatten a schema.org value that may be a language map, an array, or a plain
// string into display strings for the active language.
//
// NES stores `alternateName` as a language MAP (`{en: [...], ne: [...]}`) — its
// `@context` declares `"@container": "@language"` — so an Array.isArray() check
// misses every record the store actually writes.
function localizedList(v: unknown, lang: "en" | "ne"): string[] {
  const fromLangMap = (o: Record<string, unknown>): string[] => {
    const ordered = [o[lang], o[lang === "ne" ? "en" : "ne"]];
    return ordered.flatMap((val) =>
      Array.isArray(val) ? val : val == null ? [] : [val],
    ).filter((s): s is string => typeof s === "string" && s.length > 0);
  };

  if (v == null) return [];
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) {
    return v.flatMap((item) =>
      typeof item === "string"
        ? [item]
        : item && typeof item === "object"
          ? fromLangMap(item as Record<string, unknown>).slice(0, 1)
          : [],
    );
  }
  if (typeof v === "object") return fromLangMap(v as Record<string, unknown>);
  return [];
}

function typeToken(t: EntityRecord["@type"], additional?: string): string | undefined {
  const parts: string[] = [];
  if (Array.isArray(t)) parts.push(...t);
  else if (t) parts.push(t);
  if (additional) parts.push(additional);
  return parts.length ? parts.join(",") : undefined;
}

// schema.org / jawafdehi field key -> human label, for the "Details" section. Only
// scalar, presentable fields; relationships, identifiers and provenance are handled
// separately. Anything not listed but matching jawafdehi:* is humanized generically.
const FIELD_LABELS: Record<string, string> = {
  foundingDate: "Founded",
  leader: "Leader",
  "jawafdehi:partyLeader": "Party leader",
  "jawafdehi:govLevel": "Government level",
  "jawafdehi:officeTier": "Office tier",
  "jawafdehi:officeType": "Office type",
  "jawafdehi:officeCategory": "Office category",
  "jawafdehi:adminLevel": "Administrative level",
  "jawafdehi:wardNumber": "Ward number",
  "jawafdehi:bfiClass": "BFI class",
  "jawafdehi:regulator": "Regulator",
  "jawafdehi:ownership": "Ownership",
  "jawafdehi:governmentOwnershipPercent": "Govt ownership %",
  "jawafdehi:enterpriseSector": "Sector",
  "jawafdehi:industrySector": "Industry sector",
  "jawafdehi:insuranceCategory": "Insurance category",
  "jawafdehi:companyKind": "Company kind",
  "jawafdehi:exchange": "Exchange",
  tickerSymbol: "Ticker",
  "jawafdehi:mediaType": "Media type",
  "jawafdehi:language": "Language",
  "jawafdehi:publisher": "Publisher",
  "jawafdehi:missionType": "Mission type",
  "jawafdehi:representsCountry": "Represents",
  "jawafdehi:bodyKind": "Body kind",
  "jawafdehi:establishingAct": "Establishing act",
  "jawafdehi:courtTier": "Court tier",
  "jawafdehi:facilityType": "Facility type",
  "jawafdehi:orgType": "Organization type",
  "jawafdehi:institutionType": "Institution type",
  "jawafdehi:province": "Province",
  "jawafdehi:constituency": "Constituency",
  "jawafdehi:electoralSystem": "Electoral system",
  "jawafdehi:branch": "Branch",
  "jawafdehi:registrationDateBS": "Registered (BS)",
};

// Keys handled explicitly elsewhere (header/image/relations/links/identifiers/provenance)
// or that are pure plumbing — never shown in the generic Details list.
const HANDLED_KEYS = new Set([
  "@id", "@type", "@context", "additionalType", "name", "alternateName",
  "description", "address", "url", "sameAs", "identifier", "dateCreated",
  "containedInPlace", "parentOrganization", "jawafdehi:version", "image", "logo",
]);

function labelFor(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const bare = key.includes(":") ? key.split(":").pop()! : key;
  return bare.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

// Render a scalar/bilingual value as a string (skip objects/arrays — handled elsewhere).
function scalar(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object" && ("en" in (v as object) || "ne" in (v as object))) {
    const b = bilingual(v as Bilingual);
    return [b.en, b.ne].filter(Boolean).join(" · ") || null;
  }
  return null;
}

// schema.org image/logo -> a single URL (a plain string, an ImageObject via url/contentUrl,
// or an array of either). Returns undefined when there's nothing usable.
function imageUrlOf(rec: EntityRecord | undefined): string | undefined {
  const pick = (v: unknown): string | undefined => {
    if (typeof v === "string") return v.trim() || undefined;
    if (Array.isArray(v)) {
      for (const x of v) {
        const u = pick(x);
        if (u) return u;
      }
      return undefined;
    }
    if (v && typeof v === "object") {
      const o = v as { url?: unknown; contentUrl?: unknown };
      if (typeof o.url === "string" && o.url.trim()) return o.url.trim();
      if (typeof o.contentUrl === "string" && o.contentUrl.trim()) return o.contentUrl.trim();
    }
    return undefined;
  };
  return pick(rec?.image) ?? pick(rec?.logo);
}

// One labelled row of the summary table — the same shape the material page uses.
function Row({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="grid gap-1 py-3 md:grid-cols-[190px_minmax(0,1fr)] md:gap-4">
      <dt className="font-semibold text-foreground underline decoration-dotted underline-offset-4">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </div>
  );
}

function RelationRow({ label, refObj }: Readonly<{ label: string; refObj?: JsonLdRef }>) {
  const iri = refObj?.["@id"];
  const path = entityPath(iri);
  if (!iri) return null;
  return (
    <Row label={label}>
      {path ? (
        <Link to={path} className="text-primary underline underline-offset-2 hover:no-underline">
          {iriLabel(iri)}
        </Link>
      ) : (
        iriLabel(iri)
      )}
    </Row>
  );
}

export default function EntityRecordProfile() {
  const params = useParams();
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || "ne").startsWith("en") ? "en" : "ne";
  const tail = params["*"] || "";
  const { data, isLoading, isError } = useQuery({
    queryKey: ["entity-record", tail],
    queryFn: async () => {
      const res = await http.get<EntityRecord>(`/api/entities/${tail}`);
      return res.data;
    },
    enabled: tail.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const name = data ? bilingual(data.name) : { en: "", ne: "" };
  const displayName = name.en || name.ne || iriLabel(data?.["@id"]) || tail.split("/").pop() || "Entity";
  const rawType = data ? typeToken(data["@type"], data.additionalType) : undefined;
  const typeLabel = humanizeEntityType(rawType);
  const kind = entityKindFor(rawType);
  const description = data ? bilingual(data.description) : { en: "", ne: "" };
  // Nepali-first: show the active language, falling back to the other only when
  // that language is missing.
  const descText =
    currentLang === "ne"
      ? description.ne || description.en
      : description.en || description.ne;
  const address =
    typeof data?.address === "string"
      ? data.address
      : data?.address?.description || data?.address?.streetAddress || "";
  const identifiers = Array.isArray(data?.identifier) ? data!.identifier! : [];
  const blacklisted = data?.["jawafdehi:blacklisted"] === true;
  const imageUrl = imageUrlOf(data);
  const aliases = localizedList(data?.alternateName, currentLang);
  const created = data?.dateCreated ? String(data.dateCreated).slice(0, 10) : "";
  const version = data?.["jawafdehi:version"];

  // Generic details: any presentable scalar field not handled elsewhere.
  const detailRows: Array<{ label: string; value: string }> = [];
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      if (HANDLED_KEYS.has(key) || key.startsWith("jawafdehi:version")) continue;
      if (key === "jawafdehi:blacklisted" || key === "jawafdehi:debarment") continue; // shown as alert
      const s = scalar(value);
      if (s) detailRows.push({ label: labelFor(key), value: s });
    }
  }

  const revision = version
    ? [
        `${version.version_number ?? "?"}`,
        version.created_at ? `updated ${String(version.created_at).slice(0, 10)}` : null,
        version.change_description || null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const debarment = data?.["jawafdehi:debarment"] as Record<string, unknown> | undefined;
  const debarmentText = (() => {
    const type = debarment && scalar(debarment["jawafdehi:debarmentType"]);
    const start = debarment && scalar(debarment["jawafdehi:debarmentStartAD"]);
    const end = debarment && scalar(debarment["jawafdehi:debarmentEndAD"]);
    const parts = [type, start && end ? `${start} → ${end}` : null].filter(Boolean);
    return parts.length ? parts.join(" · ") : "See public procurement debarment register.";
  })();

  return (
    <main id="main-content" className="min-h-screen bg-background py-8 md:py-12">
      <Helmet>
        <title>{displayName} | Jawafdehi Entity Registry</title>
        <meta
          name="description"
          content={descText || `${displayName} — ${typeLabel} in the Jawafdehi public entity registry.`}
        />
      </Helmet>

      <div className="layout-container">
        <div className="mb-8 flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/search?type=entity">
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              Back to entities
            </Link>
          </Button>
        </div>

        {isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>This entity could not be found in the registry.</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-5">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-12 w-3/5" />
            </div>
            <Skeleton className="h-80 w-full" />
          </div>
        ) : data ? (
          <article>
            {/* The same header as a material page, led by the entity's avatar so it
                reads as the same record that appears on case pages and in search. */}
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
              <EntityAvatar kind={kind} src={imageUrl} />
              <div className="min-w-0 sm:pt-2">
                <h1 className="font-archive-hero-title max-w-4xl">{displayName}</h1>
                {name.ne && name.ne !== displayName ? (
                  <p className="mt-3 text-lg text-muted-foreground">{name.ne}</p>
                ) : null}
              </div>
            </header>

            {blacklisted ? (
              <Alert variant="destructive" className="mt-8">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Blacklisted / debarred.</strong> {debarmentText}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] xl:gap-14">
              <div className="min-w-0 space-y-10">
                <Tabs defaultValue="summary">
                  <TabsList className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0">
                    <TabsTrigger
                      value="summary"
                      className="rounded-none border-b-2 border-transparent px-5 py-3 data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      Summary
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="mt-0">
                    <Card className="rounded-none border border-t-0 shadow-none">
                      <div className="p-5 md:p-8">
                        {descText ? (
                          <p className="mb-6 max-w-3xl text-base leading-7 text-foreground">{descText}</p>
                        ) : null}
                        <dl className="divide-y divide-border/70">
                          <Row label="Type">{typeLabel}</Row>
                          {aliases.length > 0 ? <Row label="Also known as">{aliases.join(" · ")}</Row> : null}
                          <RelationRow label="Located in" refObj={data.containedInPlace} />
                          <RelationRow label="Part of" refObj={data.parentOrganization} />
                          {data["jawafdehi:appealsTo"] ? (
                            <RelationRow label="Appeals to" refObj={data["jawafdehi:appealsTo"] as JsonLdRef} />
                          ) : null}
                          {address ? <Row label="Address">{address}</Row> : null}
                          {detailRows.map((r) => (
                            <Row key={r.label} label={r.label}>
                              <span className="capitalize">{r.value.replace(/-/g, " ")}</span>
                            </Row>
                          ))}
                          {identifiers.map((id, i) => (
                            <Row key={`${id.propertyID}-${i}`} label={labelFor(id.propertyID || "Identifier")}>
                              {id.value}
                            </Row>
                          ))}
                          {created ? <Row label="Created">{created}</Row> : null}
                          {revision ? <Row label="Revision">{revision}</Row> : null}
                          <Row label="Source">
                            Jawafdehi entity registry — a public registry of Nepal&apos;s people, organizations,
                            and places.
                          </Row>
                          <div className="grid gap-1 py-3 md:grid-cols-[190px_minmax(0,1fr)] md:gap-4">
                            <dt className="font-semibold text-foreground underline decoration-dotted underline-offset-4">
                              Canonical ID
                            </dt>
                            <dd className="min-w-0 break-all font-mono text-xs text-muted-foreground">{data["@id"]}</dd>
                          </div>
                        </dl>
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Published cases citing this entity; renders nothing when there are none. */}
                {data["@id"] ? <EntityRelatedCases entityIri={data["@id"]} /> : null}
              </div>

              <aside className="space-y-8 lg:sticky lg:top-24">
                {data.url || data.sameAs ? (
                  <section aria-labelledby="entity-links-heading">
                    <h2 id="entity-links-heading" className="text-lg font-semibold text-foreground">
                      Links
                    </h2>
                    <Separator className="mt-3" />
                    <div className="mt-4 inline-grid gap-3">
                      {data.url ? (
                        <Button asChild variant="outline" className="h-auto min-h-11 justify-start gap-3 px-4 py-2.5 text-left">
                          <a href={data.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                            Official website
                          </a>
                        </Button>
                      ) : null}
                      {data.sameAs ? (
                        <Button asChild variant="outline" className="h-auto min-h-11 justify-start gap-3 px-4 py-2.5 text-left">
                          <a href={data.sameAs} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                            Wikidata
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                <section aria-labelledby="entity-actions-heading">
                  <h2 id="entity-actions-heading" className="text-lg font-semibold text-foreground">
                    Actions
                  </h2>
                  <Separator className="mt-3" />
                  <div className="mt-4 inline-grid gap-2">
                    {tail ? (
                      <ViewJsonButton
                        data={data}
                        title={`${displayName} — JSON-LD`}
                        rawUrl={`${API_BASE_URL}/api/entities/${tail}`}
                        variant="outline"
                        className="h-11 justify-start gap-3 px-4"
                      />
                    ) : null}
                    <ShareButton
                      url={data["@id"]}
                      title={displayName}
                      description={descText}
                      variant="ghost"
                      size="default"
                      showLabel
                      className="h-11 justify-start gap-3 px-4 [&_span]:!mt-0 [&_span]:!inline"
                    />
                  </div>
                </section>
              </aside>
            </div>
          </article>
        ) : null}
      </div>
    </main>
  );
}
