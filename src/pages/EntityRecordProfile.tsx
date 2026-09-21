import type { ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertCircle, AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";

import { http, API_BASE_URL } from "@/services/http";
import { entityPath } from "@/lib/entity-links";
import { entityImageUrl } from "@/lib/entity-jsonld";
import { ViewJsonButton } from "@/components/ViewJsonButton";
import { ShareButton } from "@/components/ShareButton";
import { EntityAvatar } from "@/components/EntityAvatar";
import { EntityRelatedCases } from "@/components/EntityRelatedCases";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

// schema.org image/logo -> a single URL. The implementation lives in
// lib/entity-jsonld so the admin picture field resolves the SAME url this page
// renders; see entityImageUrl there for the shapes it accepts.
const imageUrlOf = (rec: EntityRecord | undefined): string | undefined =>
  entityImageUrl(rec as Record<string, unknown> | undefined);

// One fact in the About panel: small caps label over the value.
function Fact({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div>
      <dt className="font-meta uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

function RelationFact({ label, refObj }: Readonly<{ label: string; refObj?: JsonLdRef }>) {
  const iri = refObj?.["@id"];
  const path = entityPath(iri);
  if (!iri) return null;
  return (
    <Fact label={label}>
      {path ? (
        <Link to={path} className="text-primary underline underline-offset-2 hover:no-underline">
          {iriLabel(iri)}
        </Link>
      ) : (
        iriLabel(iri)
      )}
    </Fact>
  );
}

export default function EntityRecordProfile() {
  const params = useParams();
  const { t, i18n } = useTranslation();
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
  const debarmentSummary = () => {
    const deb = data?.["jawafdehi:debarment"] as Record<string, unknown> | undefined;
    const type = deb && scalar(deb["jawafdehi:debarmentType"]);
    const start = deb && scalar(deb["jawafdehi:debarmentStartAD"]);
    const end = deb && scalar(deb["jawafdehi:debarmentEndAD"]);
    const parts = [type, start && end ? `${start} → ${end}` : null].filter(Boolean);
    return parts.length ? parts.join(" · ") : "See public procurement debarment register.";
  };
  // The About panel's rows, built once so the panel and its guard agree. The
  // type is left out — the identity line already states it.
  const facts: ReactNode[] = data
    ? [
        <RelationFact key="in" label="Located in" refObj={data.containedInPlace} />,
        <RelationFact key="of" label="Part of" refObj={data.parentOrganization} />,
        data["jawafdehi:appealsTo"] ? (
          <RelationFact key="appeals" label="Appeals to" refObj={data["jawafdehi:appealsTo"] as JsonLdRef} />
        ) : null,
        address ? (
          <div key="address" className="sm:col-span-2">
            <Fact label="Address">{address}</Fact>
          </div>
        ) : null,
        ...detailRows.map((r) => (
          <Fact key={r.label} label={r.label}>
            <span className="capitalize">{r.value.replace(/-/g, " ")}</span>
          </Fact>
        )),
        ...identifiers.map((id, i) => (
          <Fact key={`${id.propertyID}-${i}`} label={labelFor(id.propertyID || "Identifier")}>
            {id.value}
          </Fact>
        )),
      ].filter((row) => {
        // RelationFact renders nothing without an IRI; don't count those.
        if (row && typeof row === "object" && "props" in row && "refObj" in (row.props as object)) {
          return Boolean((row.props as { refObj?: JsonLdRef }).refObj?.["@id"]);
        }
        return Boolean(row);
      })
    : [];
  const hasLinks = Boolean(data?.url || data?.sameAs);
  const hasFacts = facts.length > 0 || hasLinks;
  // The identity line under the name: what it is, where it is, since when.
  const placeIri = data?.containedInPlace?.["@id"];
  const identity = [
    t(`entityDetail.${kind}`),
    placeIri ? iriLabel(placeIri) : null,
    created ? `In the registry since ${created.slice(0, 4)}` : null,
  ].filter(Boolean);

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
        <div className="mb-6 flex items-center justify-between gap-2">
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
          <div className="grid items-start gap-10 lg:grid-cols-[3fr_2fr] xl:gap-14" aria-busy="true">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
              <Skeleton className="h-32 w-32 shrink-0 rounded-full" />
              <div className="w-full space-y-3">
                <Skeleton className="h-8 w-4/5" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-[4.5rem] w-full rounded-xl" />
              <Skeleton className="h-[4.5rem] w-full rounded-xl" />
            </div>
          </div>
        ) : data ? (
          <article>
            <div className="grid items-start gap-10 lg:grid-cols-[3fr_2fr] xl:gap-14">
              {/* Identity + details take the left 60%: avatar beside the name, the
                  facts (when there are any beyond the type, which the identity
                  line already states), and the actions. */}
              <div className="min-w-0 space-y-8">
                <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
                  <EntityAvatar kind={kind} src={imageUrl} size="xl" />
                  <div className="min-w-0">
                    <h1 className="font-archive-section-title text-balance break-words">{displayName}</h1>
                    {name.ne && name.ne !== displayName ? (
                      <p className="mt-2 text-lg text-muted-foreground">{name.ne}</p>
                    ) : null}
                    <p className="mt-3 text-base text-muted-foreground">{identity.join(" · ")}</p>
                    {aliases.length > 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">Also known as {aliases.join(", ")}</p>
                    ) : null}
                  </div>
                </header>

                {blacklisted ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Blacklisted / debarred.</strong> {debarmentSummary()}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {descText ? <p className="max-w-3xl text-lg leading-8 text-foreground">{descText}</p> : null}

                {hasFacts ? (
                  <section aria-labelledby="entity-about-heading" className="rounded-2xl bg-muted/50 p-5">
                    <h2 id="entity-about-heading" className="text-lg font-semibold text-foreground">
                      About
                    </h2>
                    {facts.length > 0 ? <dl className="mt-4 grid gap-4 sm:grid-cols-2">{facts}</dl> : null}
                    {hasLinks ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {data.url ? (
                          <Button asChild variant="outline" size="sm">
                            <a href={data.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                              Official website
                            </a>
                          </Button>
                        ) : null}
                        {data.sameAs ? (
                          <Button asChild variant="outline" size="sm">
                            <a href={data.sameAs} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                              Wikidata
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <section aria-labelledby="entity-actions-heading">
                  <h2 id="entity-actions-heading" className="text-lg font-semibold text-foreground">
                    Actions
                  </h2>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {tail ? (
                      <ViewJsonButton
                        data={data}
                        title={`${displayName} — JSON-LD`}
                        rawUrl={`${API_BASE_URL}/api/entities/${tail}`}
                        variant="outline"
                        className="h-11 gap-3 px-4"
                      />
                    ) : null}
                    <ShareButton
                      url={data["@id"]}
                      title={displayName}
                      description={descText}
                      variant="ghost"
                      size="default"
                      showLabel
                      className="h-11 gap-3 px-4 [&_span]:!mt-0 [&_span]:!inline"
                    />
                  </div>
                </section>

                <section aria-labelledby="entity-record-heading" className="text-xs leading-5 text-muted-foreground">
                  <h2 id="entity-record-heading" className="font-meta uppercase tracking-wide">
                    Record
                  </h2>
                  <p className="mt-2">
                    Jawafdehi entity registry — a public registry of Nepal&apos;s people, organizations, and places.
                    {created ? ` Created ${created}.` : ""}
                    {revision ? ` Revision ${revision}` : ""}
                  </p>
                  <p className="mt-2 break-all font-mono">{data["@id"]}</p>
                </section>
              </div>

              {/* Right 40%: the cases. On desktop the column is pinned where it
                  first sits (under the 76px header, the page padding and the back
                  link row — 11.25rem) and capped to the viewport with a 2rem
                  margin, so it never runs below the fold; the heading stays and
                  only the list scrolls. */}
              <div className="min-w-0 lg:sticky lg:top-[11.25rem] lg:flex lg:max-h-[calc(100vh-13.25rem)] lg:flex-col">
                {data["@id"] ? <EntityRelatedCases entityIri={data["@id"]} className="lg:min-h-0" /> : null}
              </div>
            </div>
          </article>
        ) : null}
      </div>
    </main>
  );
}
