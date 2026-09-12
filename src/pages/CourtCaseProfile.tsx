import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { CourtCaseProfileView } from "@/components/courtcase/CourtCaseProfileView";
import { CourtCaseRelatedCases } from "@/components/CourtCaseRelatedCases";
import { CaseSectionJumpNav, type CaseJumpSection } from "@/components/case-detail/case-section-jump-nav";
import { getCourtCaseFull } from "@/services/datalake-api";

// The /courtcase/* splat tail is the courtcase IRI path component
// `<court>/<case_number>` (e.g. `special/081-CR-0079`); we rebuild the canonical
// @id IRI from it for data fetching, related records, and structured metadata.
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
  const { t } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const tail = params["*"] || "";
  const parsed = parseTail(tail);
  const [activeSection, setActiveSection] = useState("case-summary");

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
    ? `${caseNumber} — ${data.case_type || t("courtCaseProfile.fallbackTitle", "Court case")}`
    : caseNumber || t("courtCaseProfile.fallbackTitle", "Court case");

  const jumpSections = useMemo<CaseJumpSection[]>(
    () => [
      { id: "case-summary", label: t("courtCaseProfile.summary", "Case summary") },
      { id: "parties", label: t("courtCaseProfile.parties", "Parties") },
      { id: "activity", label: t("courtCaseProfile.activity.heading", "Case activity") },
      { id: "source", label: t("courtCaseProfile.source.heading", "Source") },
    ],
    [t],
  );

  useEffect(() => {
    const sectionElements = jumpSections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (sectionElements.length === 0) return;

    let animationFrame = 0;
    const updateActiveSection = () => {
      animationFrame = 0;
      const readingLine = window.innerHeight * 0.5;
      let nextActiveSection = sectionElements[0].id;

      for (const section of sectionElements) {
        if (section.getBoundingClientRect().top <= readingLine) {
          nextActiveSection = section.id;
        } else {
          break;
        }
      }

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
        nextActiveSection = sectionElements[sectionElements.length - 1].id;
      }

      setActiveSection((current) =>
        current === nextActiveSection ? current : nextActiveSection,
      );
    };
    const scheduleUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [jumpSections]);

  const handleJumpToSection = (sectionId: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(sectionId);
    if (!target) return;

    setActiveSection(sectionId);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    navigate(`#${sectionId}`, { replace: true });
  };

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

      <div className="layout-container">
        <Link
          to="/search?type=courtcase"
          className="group mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
          <span>{t("courtCaseProfile.backToSearch", "Back to search")}</span>
        </Link>

        {!parsed || isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("courtCaseProfile.notFound", "This court case could not be found in the Jawafdehi governance archive.")}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="min-w-0 space-y-8 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10 lg:space-y-0 xl:grid-cols-[13rem_minmax(0,1fr)] xl:gap-12">
            <div className="py-5 lg:hidden">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                {t("courtCaseProfile.contents", "Contents")}
              </h2>
              <CaseSectionJumpNav
                activeSection={activeSection}
                onJump={handleJumpToSection}
                sections={jumpSections}
              />
            </div>

            <aside className="hidden min-w-0 lg:block">
              <div className="sticky top-28">
                <h2 className="mb-4 text-sm font-semibold text-foreground">
                  {t("courtCaseProfile.contents", "Contents")}
                </h2>
                <CaseSectionJumpNav
                  activeSection={activeSection}
                  onJump={handleJumpToSection}
                  sections={jumpSections}
                />
              </div>
            </aside>

            <div className="min-w-0 space-y-12">
              <CourtCaseProfileView
                courtCase={data}
                caseNumber={caseNumber.toUpperCase()}
                courtIdentifier={parsed.court}
                isLoading={isLoading}
              />

              {/* The reverse of the case -> court-case link: published Jawafdehi
                  cases citing this court case. Self-hiding when there are none. */}
              <CourtCaseRelatedCases courtCaseIri={courtCaseIri} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
