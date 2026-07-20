import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CourtCaseCard } from "@/components/CourtCaseCard";
import { getCourtCaseFull } from "@/services/datalake-api";

// The /courtcase/* splat tail is the courtcase IRI path component
// `<court>/<case_number>` (e.g. `special/081-CR-0079`); we rebuild the canonical
// @id IRI from it (see `courtCaseIri`) and pass that to CourtCaseCard, whose
// parser accepts only the IRI form.
function parseTail(tail: string): { court: string; caseNumber: string } | null {
  const i = tail.indexOf("/");
  if (i === -1) return null;
  const court = tail.slice(0, i);
  // useParams()/splat is already URL-decoded by React Router; a second
  // decodeURIComponent would throw URIError on any literal "%" in a case number.
  const caseNumber = tail.slice(i + 1).replace(/\/+$/, "");
  if (!court || !caseNumber) return null;
  return { court, caseNumber };
}

export default function CourtCaseProfile() {
  const params = useParams();
  const tail = params["*"] || "";
  const parsed = parseTail(tail);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["datalake-courtcase", parsed?.court, parsed?.caseNumber],
    queryFn: () => getCourtCaseFull(parsed!.court, parsed!.caseNumber),
    enabled: Boolean(parsed),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const caseNumber = parsed?.caseNumber ?? "";
  // The canonical court-case @id IRI lowercases court + case number (matches the
  // backend build_courtcase_iri); use it as the JSON-LD `url` so the structured
  // data points at one canonical URL, not a mixed-case duplicate.
  const courtCaseIri = parsed
    ? `https://jawafdehi.org/courtcase/${parsed.court.toLowerCase()}/${parsed.caseNumber.toLowerCase()}`
    : "";
  const title = data
    ? `${caseNumber} — ${data.case_type || "Court case"}`
    : caseNumber || "Court case";

  // schema.org JSON-LD for crawlers (parity with the retired R2 landing pages). A
  // court case is a document/record, so CreativeWork (matches MaterialProfile) —
  // NOT Legislation, which is schema.org's type for statutes/acts.
  const jsonLd = data
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: title,
        url: courtCaseIri,
        identifier: caseNumber,
        inLanguage: "ne",
        isAccessibleForFree: true,
        ...(data.registration_date_ad ? { dateCreated: data.registration_date_ad } : {}),
        publisher: { "@type": "Organization", name: "Jawafdehi" },
      })
    : null;

  return (
    <main id="main-content" className="min-h-screen bg-background py-8 md:py-12">
      <Helmet>
        <title>{title} | Jawafdehi court records</title>
        <meta
          name="description"
          content={`Court case ${caseNumber} in the Jawafdehi governance archive.`}
        />
        {jsonLd ? <script type="application/ld+json">{jsonLd}</script> : null}
      </Helmet>

      <div className="container mx-auto max-w-3xl px-4">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/search?type=courtcase">
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            Back to search
          </Link>
        </Button>

        {!parsed || isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This court case could not be found in the Jawafdehi governance archive.
            </AlertDescription>
          </Alert>
        ) : (
          <article className="space-y-6">
            <CourtCaseCard courtCaseId={courtCaseIri} courtCase={data} isLoading={isLoading} />

            {/* Provenance. */}
            <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
              <p>
                <strong>Source:</strong> Jawafdehi governance archive — court
                listings, hearings, and orders harvested from Nepal&apos;s public court
                records.
              </p>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
