import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";

import { http } from "@/services/http";
import { entityPath } from "@/lib/entity-links";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { humanizeEntityType } from "@/utils/entity-helpers";

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
  alternateName?: Array<Bilingual | string>;
  description?: Bilingual | string;
  address?: { description?: string; streetAddress?: string } | string;
  url?: string;
  sameAs?: string;
  identifier?: Identifier[] | string;
  dateCreated?: string;
  foundingDate?: string;
  leader?: string;
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

// Keys handled explicitly elsewhere (header/relations/links/identifiers/provenance)
// or that are pure plumbing — never shown in the generic Details list.
const HANDLED_KEYS = new Set([
  "@id", "@type", "@context", "additionalType", "name", "alternateName",
  "description", "address", "url", "sameAs", "identifier", "dateCreated",
  "containedInPlace", "parentOrganization", "jawafdehi:version",
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

function RelationLink({ label, refObj }: { label: string; refObj?: JsonLdRef }) {
  const iri = refObj?.["@id"];
  const path = entityPath(iri);
  if (!iri) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">
        {path ? (
          <Link to={path} className="text-primary hover:underline">
            {iriLabel(iri)}
          </Link>
        ) : (
          <span className="text-foreground">{iriLabel(iri)}</span>
        )}
      </dd>
    </div>
  );
}

export default function EntityRecordProfile() {
  const params = useParams();
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
  const typeLabel = humanizeEntityType(data ? typeToken(data["@type"], data.additionalType) : undefined);
  const description = data ? bilingual(data.description) : { en: "", ne: "" };
  const descText = description.en || description.ne;
  const address =
    typeof data?.address === "string"
      ? data.address
      : data?.address?.description || data?.address?.streetAddress || "";
  const identifiers = Array.isArray(data?.identifier) ? data!.identifier! : [];
  const version = data?.["jawafdehi:version"];
  const blacklisted = data?.["jawafdehi:blacklisted"] === true;

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

  return (
    <main id="main-content" className="min-h-screen bg-background py-8 md:py-12">
      <Helmet>
        <title>{displayName} | Jawafdehi Entity Registry</title>
        <meta
          name="description"
          content={`${displayName} — ${typeLabel} in the Jawafdehi public entity registry.`}
        />
      </Helmet>

      <div className="container mx-auto max-w-3xl px-4">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/search?type=entity">
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            Back to search
          </Link>
        </Button>

        {isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This entity could not be found in the registry.
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-6 h-32 w-full" />
          </div>
        ) : data ? (
          <article className="space-y-6">
            <header className="space-y-2">
              <Badge variant="outline" className="capitalize">{typeLabel}</Badge>
              <h1 className="text-3xl font-extrabold text-primary md:text-4xl">{displayName}</h1>
              {name.ne && name.ne !== displayName ? (
                <p className="text-lg text-muted-foreground">{name.ne}</p>
              ) : null}
            </header>

            {/* Blacklist / debarment alert (contractors). */}
            {blacklisted ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Blacklisted / debarred.</strong>{" "}
                  {(() => {
                    const deb = data["jawafdehi:debarment"] as Record<string, unknown> | undefined;
                    const type = deb && scalar(deb["jawafdehi:debarmentType"]);
                    const start = deb && scalar(deb["jawafdehi:debarmentStartAD"]);
                    const end = deb && scalar(deb["jawafdehi:debarmentEndAD"]);
                    const parts = [type, start && end ? `${start} → ${end}` : null].filter(Boolean);
                    return parts.length ? parts.join(" · ") : "See public procurement debarment register.";
                  })()}
                </AlertDescription>
              </Alert>
            ) : null}

            {descText ? <p className="text-base leading-7 text-foreground">{descText}</p> : null}

            {/* External links. */}
            {data.url || data.sameAs ? (
              <div className="flex flex-wrap gap-2">
                {data.url ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={data.url} target="_blank" rel="noopener noreferrer">
                      Official website <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </Button>
                ) : null}
                {data.sameAs ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={data.sameAs} target="_blank" rel="noopener noreferrer">
                      Wikidata <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : null}

            {/* Details + relationships + identifiers. */}
            <dl className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
              {detailRows.map((r) => (
                <div key={r.label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{r.label}</dt>
                  <dd className="mt-1 text-sm capitalize text-foreground">{r.value.replace(/-/g, " ")}</dd>
                </div>
              ))}
              <RelationLink label="Located in" refObj={data.containedInPlace} />
              <RelationLink label="Part of" refObj={data.parentOrganization} />
              {data["jawafdehi:appealsTo"] ? (
                <RelationLink label="Appeals to" refObj={data["jawafdehi:appealsTo"] as JsonLdRef} />
              ) : null}
              {address ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Address</dt>
                  <dd className="mt-1 text-sm text-foreground">{address}</dd>
                </div>
              ) : null}
              {identifiers.map((id, i) => (
                <div key={`${id.propertyID}-${i}`}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {labelFor(id.propertyID || "Identifier")}
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">{id.value}</dd>
                </div>
              ))}
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Canonical ID</dt>
                <dd className="mt-1 break-all font-mono text-xs text-muted-foreground">{data["@id"]}</dd>
              </div>
            </dl>

            {/* Provenance. */}
            <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
              <p>
                <strong>Source:</strong> Jawafdehi entity registry — a public registry of Nepal&apos;s
                people, organizations, and places.
              </p>
              {version?.change_description ? (
                <p className="mt-1">
                  Added via {version.author?.slug || "import"}: {version.change_description}
                </p>
              ) : null}
            </div>
          </article>
        ) : null}
      </div>
    </main>
  );
}
