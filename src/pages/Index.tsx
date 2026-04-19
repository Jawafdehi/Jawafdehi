import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CaseCard } from "@/components/CaseCard";
import { Archive, Scale, Sparkles, ArrowRight, Search, SendHorizonal } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { getCases, getStatistics } from "@/services/jds-api";
import { getEntityById } from "@/services/api";
import { useEffect, useMemo, useState } from "react";
import { formatDateWithBS } from "@/utils/date";
import type { Entity } from "@/types/nes";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { useTranslation } from "react-i18next";

type DemoPhase = "typing" | "loading" | "answer";

const Index = () => {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;
  const [resolvedEntities, setResolvedEntities] = useState<Record<string, Entity>>({});
  const [demoTypedQuestion, setDemoTypedQuestion] = useState("");
  const [demoSubmittedQuestion, setDemoSubmittedQuestion] = useState("");
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("typing");
  const demoQuestion = t("guestChat.prompts.ciaaProcess");
  const demoAnswer =
    "CIAA appears mainly at the investigation and charge-filing stage of corruption cases. The pattern usually looks like this: a complaint or allegation is examined by CIAA, CIAA investigates the alleged irregularity, and, if it considers the evidence sufficient, it files an आरोपपत्र / charge sheet in the Special Court. After that, the public record shifts toward court proceedings, decisions, and source-based updates. The archive also shows that this process does not always move quickly or consistently. In some cases, CIAA investigation is described as stalled, delayed, or politically contested. So CIAA appears less as the entire end-to-end corruption system and more as the body that investigates, decides whether to prosecute, and brings major corruption allegations into court.";

  const { data: stats, isError: statsError, isLoading: statsLoading } = useQuery({
    queryKey: ['statistics'],
    queryFn: getStatistics,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });

  const getStatValue = (value: number | undefined): string => {
    if (statsError || statsLoading) return "—";
    return value?.toLocaleString() || "0";
  };

  const { data: casesData } = useQuery({
    queryKey: ['cases', { page: 1 }],
    queryFn: () => getCases({ page: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  // Resolve location entities from NES
  useEffect(() => {
    if (!casesData?.results) return;

    let isMounted = true;

    const resolveEntities = async () => {
      const allEntities = casesData.results.flatMap(c => c.entities || []);
      const locationEntities = allEntities.filter(e => e.type === 'location');
      const uniqueNesIds = [...new Set(locationEntities.map(e => e.nes_id!).filter(Boolean))];

      const entityPromises = uniqueNesIds.map(async (nesId) => {
        try {
          const entity = await getEntityById(nesId);
          return { id: nesId, entity };
        } catch {
          return null;
        }
      });

      const entities = await Promise.all(entityPromises);
      
      // Only update state if component is still mounted
      if (isMounted) {
        const entitiesMap = entities.reduce((acc, item) => {
          if (item) acc[item.id] = item.entity;
          return acc;
        }, {} as Record<string, Entity>);
        setResolvedEntities(entitiesMap);
      }
    };

    resolveEntities();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [casesData]);

  useEffect(() => {
    let typingInterval: ReturnType<typeof setInterval> | null = null;
    let submitTimeout: ReturnType<typeof setTimeout> | null = null;
    let answerTimeout: ReturnType<typeof setTimeout> | null = null;

    setDemoPhase("typing");
    setDemoSubmittedQuestion("");
    setDemoTypedQuestion("");

    let currentIndex = 0;
    typingInterval = setInterval(() => {
      currentIndex += 1;
      setDemoTypedQuestion(demoQuestion.slice(0, currentIndex));

      if (currentIndex >= demoQuestion.length) {
        if (typingInterval) {
          clearInterval(typingInterval);
          typingInterval = null;
        }

        submitTimeout = setTimeout(() => {
          setDemoSubmittedQuestion(demoQuestion);
          setDemoTypedQuestion("");
          setDemoPhase("loading");

          answerTimeout = setTimeout(() => {
            setDemoPhase("answer");
          }, 1200);
        }, 450);
      }
    }, 38);

    return () => {
      if (typingInterval) clearInterval(typingInterval);
      if (submitTimeout) clearTimeout(submitTimeout);
      if (answerTimeout) clearTimeout(answerTimeout);
    };
  }, [demoQuestion]);

  // Transform API cases to CaseCard format
  const featuredCases = useMemo(() => {
    if (!casesData?.results) return [];
    return casesData.results.slice(0, 3).map((caseItem) => {
      // Get accused entities and locations from unified entities array
      const accusedEntities = caseItem.entities?.filter(e => e.type === 'accused') || [];
      const locationEntities = caseItem.entities?.filter(e => e.type === 'location') || [];

      const primaryEntity = accusedEntities[0]?.display_name || "Unknown Entity";

      // Translate location names using NES resolution
      const locationNames = locationEntities.map(e => {
        if (e.nes_id && resolvedEntities[e.nes_id]) {
          const entity = resolvedEntities[e.nes_id];
          const name = entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id;
          return translateDynamicText(name, currentLang);
        }
        const name = e.display_name || e.nes_id || 'Unknown';
        return translateDynamicText(name, currentLang);
      }).join(', ') || translateDynamicText('Unknown Location', currentLang);

      const formattedDate = formatDateWithBS(caseItem.created_at, 'PPP');

      return {
        id: caseItem.id.toString(),
        title: caseItem.title,
        entity: primaryEntity,
        location: locationNames,
        date: formattedDate,
        status: "ongoing" as const, // All published cases shown as ongoing
        description: caseItem.description.replace(/<[^>]*>/g, '').substring(0, 200),
        allegations: caseItem.key_allegations, // Pass key allegations to CaseCard
        thumbnailUrl: caseItem.thumbnail_url ?? undefined,
        tags: caseItem.tags,
        entityIds: accusedEntities.map(e => e.id),
        locationIds: locationEntities.map(l => l.id),
      };
    });
  }, [casesData, resolvedEntities, currentLang]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Jawafdehi — Nepal's Corruption Case Archive</title>
        <meta name="description" content="Every CIAA corruption case documented, simplified, and permanently accessible. Nepal's authoritative public record of corruption cases and official documents." />
        <link rel="canonical" href="https://jawafdehi.org/" />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/" />
        <meta property="og:title" content="Jawafdehi — Nepal's Corruption Case Archive" />
        <meta property="og:description" content="Every CIAA corruption case documented, simplified, and permanently accessible. Nepal's authoritative public record of corruption cases and official documents." />
        <meta property="og:image" content="https://jawafdehi.org/og-favicon.png" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Jawafdehi — Nepal's Corruption Case Archive" />
        <meta name="twitter:description" content="Every CIAA corruption case documented, simplified, and permanently accessible. Nepal's authoritative public record of corruption cases and official documents." />
        <meta name="twitter:image" content="https://jawafdehi.org/og-favicon.png" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Jawafdehi",
          "alternateName": "Jawafdehi Nepal",
          "url": "https://jawafdehi.org",
          "description": "Nepal's permanent public archive of CIAA corruption cases — every filing, every document, forever.",
          "inLanguage": ["en", "ne"],
          "potentialAction": [
            {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://jawafdehi.org/cases?search={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            },
            {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://jawafdehi.org/entities?search={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            }
          ]
        })}</script>
      </Helmet>
      <Header />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative bg-gradient-to-br from-primary via-navy-dark to-slate-800 py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.04] bg-[size:24px_24px]" />

          <div className="container mx-auto px-4 relative">
            <div className="grid grid-cols-1 gap-12 items-center lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:items-stretch">

              {/* Left — headline + stats + CTAs */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/80 mb-5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  CIAA Cases &nbsp;·&nbsp; Official Documents &nbsp;·&nbsp; Verified Facts
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight tracking-tight">
                  Nepal's Permanent<br />
                  <span className="text-amber-400">Corruption Case</span> Archive
                </h1>

                <p className="text-xl text-white/90 font-medium mb-3 leading-snug">
                  Reviewed, digestible case summaries —<br className="hidden sm:block" /> written for every Nepali, not just lawyers.
                </p>

                <p className="text-amber-300/90 font-semibold tracking-wide mb-6 text-base italic">
                  Accountability has no Expiry.
                </p>

                <p className="text-base text-white/65 mb-5 leading-relaxed">
                  Every CIAA case documented, simplified, and permanently accessible. Original filings, legal timelines, and verified facts — AI-assisted, human-reviewed, free forever.
                </p>

                {/* Inline stats */}
                <div className="flex flex-wrap gap-8 mb-6">
                  <div>
                    <div className="text-3xl font-bold text-white tabular-nums">{getStatValue(stats?.published_cases)}</div>
                    <div className="text-sm text-white/50 mt-0.5">Cases Documented</div>
                  </div>
                  <div className="border-l border-white/20 pl-8">
                    <div className="text-3xl font-bold text-white tabular-nums">{getStatValue(stats?.entities_tracked)}</div>
                    <div className="text-sm text-white/50 mt-0.5">Officials &amp; Entities Tracked</div>
                  </div>
                  <div className="border-l border-white/20 pl-8">
                    <div className="text-3xl font-bold text-amber-400">Free</div>
                    <div className="text-sm text-white/50 mt-0.5">Forever. No paywall. Ever.</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90 font-semibold">
                    <Link to="/cases">
                      <Search className="mr-2 h-5 w-5" />
                      Browse Cases
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right — Ask Jawafdehi preview */}
              <div className="relative block lg:h-full">
                <div className="absolute -top-3 right-0 lg:right-2 z-10 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary shadow-lg ring-1 ring-primary/10">
                  Demo
                </div>

                <div className="ml-auto flex h-full max-w-[660px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-background/95 shadow-2xl ring-1 ring-white/10 backdrop-blur">
                  <div className="border-b border-border/60 px-4 py-3.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/15 bg-primary/10">
                          <img
                            src="/assets/bot.svg"
                            alt={t("guestCommon.assistantAlt")}
                            className="h-10 w-10"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Public case archive
                          </p>
                          <h2 className="text-lg font-semibold tracking-tight text-foreground">
                            {t("guestChat.title")}
                          </h2>
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm" className="hidden rounded-full sm:inline-flex">
                        <Link to="/ask">Try it yourself</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-center p-4 md:p-5">
                    <div className="space-y-2.5">
                      <div className="flex min-h-[72px] items-start justify-end">
                        <div
                          className="max-w-[82%] rounded-[24px] bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm transition-opacity duration-200"
                          style={{ opacity: demoSubmittedQuestion ? 1 : 0 }}
                          aria-hidden={!demoSubmittedQuestion}
                        >
                          {demoSubmittedQuestion || demoQuestion}
                        </div>
                      </div>

                      <div className="min-h-[264px]">
                        <div className="flex items-start gap-3">
                          <div
                            className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-opacity duration-200"
                            style={{ opacity: demoPhase === "loading" || demoPhase === "answer" ? 1 : 0 }}
                            aria-hidden={demoPhase === "typing"}
                          >
                            <img
                              src="/assets/bot.svg"
                              alt={t("guestCommon.assistantAlt")}
                              className="h-7 w-7"
                            />
                          </div>
                          {demoPhase === "loading" ? (
                            <div
                              role="status"
                              aria-live="polite"
                              aria-atomic="true"
                              className="inline-flex items-center gap-2 self-start rounded-[24px] border border-border/70 bg-card px-4 py-4 shadow-sm transition-opacity duration-200"
                              style={{ opacity: 1 }}
                            >
                              <span className="sr-only">{t("guestCommon.assistantTyping")}</span>
                              {[0, 1, 2].map((index) => (
                                <span
                                  key={index}
                                  aria-hidden="true"
                                  className="h-2.5 w-2.5 rounded-full bg-muted-foreground/45 animate-pulse"
                                  style={{ animationDelay: `${index * 180}ms`, animationDuration: "1.1s" }}
                                />
                              ))}
                            </div>
                          ) : demoPhase === "answer" ? (
                            <div
                              className="min-w-0 flex-1 rounded-[24px] border border-border/70 bg-card p-4 shadow-sm transition-opacity duration-200"
                              style={{ opacity: 1 }}
                            >
                              <p className="text-sm leading-6 text-foreground">
                                {demoAnswer}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/60 bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                    <div className="rounded-[24px] border border-border/80 bg-card p-2.5 shadow-sm">
                      <div className="flex items-end gap-3">
                        <div className="min-h-[24px] flex-1 py-1 text-sm leading-6 text-muted-foreground">
                          {demoTypedQuestion || t("guestChatInput.askQuestionPlaceholder")}
                        </div>
                        <div className="flex h-8 w-[106px] shrink-0 items-center justify-center rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground">
                          <SendHorizonal className="mr-1.5 h-4 w-4" />
                          {demoPhase === "loading"
                            ? t("guestChatInput.searching")
                            : t("guestChatInput.submit")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust strip ── */}
        <section className="bg-primary/5 border-b border-border py-5">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-y-3 gap-x-8 text-sm">
              {[
                { icon: "🇳🇵", text: "Built by Nepali, for Nepali" },
                { icon: "∞", text: "Free forever — no paywall", iconClass: "text-emerald-600 font-bold" },
                { icon: "🔓", text: "All data in the public domain" },
                { icon: "📜", text: "Records are never deleted" },
                { icon: "✅", text: "Human-reviewed summaries" },
                { icon: "⚙️", text: "All technology is open source" },
                { icon: "🤝", text: "100% volunteer-powered" },
              ].map(({ icon, text, iconClass }) => (
                <div key={text} className="flex items-center gap-2 text-foreground/70">
                  <span className={`text-base flex-shrink-0 ${iconClass ?? ""}`}>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── What we're building ── */}
        <section className="py-12 bg-muted/30 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-base md:text-lg text-foreground/80 leading-relaxed">
                Corruption records are scattered across dozens of government portals, court systems, and public databases — inaccessible to most citizens.{" "}
                <span className="font-semibold text-foreground">We are building the technology and the volunteer network to bring it all into one permanent, publicly searchable knowledge base.</span>{" "}
                Free to use. Open source. Built entirely by Nepali volunteers.
              </p>
            </div>
          </div>
        </section>

        {/* ── Three Pillars ── */}
        <section className="py-20 bg-background border-b border-border">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Archive className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">CIAA Case Archive</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We index every case the Commission for the Investigation of Abuse of Authority files — including supporting documents, court orders, and legal filings, all in one place.
                </p>
              </div>

              <div className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Scale className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Plain-Language Summaries</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Complex legal filings rewritten so any citizen can understand them — not just lawyers. Every summary is reviewed by human volunteers for factual accuracy before it is published.
                </p>
              </div>

              <div className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-foreground">AI Case Research</h3>
                  <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Ask any question about a case or corruption trend in Nepali or English. Natural language queries against the full case archive — instant, sourced answers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Recently Documented Cases ── */}
        <section className="py-16 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Recently Documented Cases</h2>
                <p className="text-muted-foreground mt-1">Latest cases added to the archive</p>
              </div>
              <Button variant="ghost" asChild className="hidden sm:flex">
                <Link to="/cases">
                  View all cases <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {featuredCases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {featuredCases.map((caseItem) => (
                  <CaseCard key={caseItem.id} {...caseItem} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            )}

            <div className="text-center sm:hidden">
              <Button variant="outline" asChild>
                <Link to="/cases">View all cases →</Link>
              </Button>
            </div>
          </div>
        </section>

      </main>

      <Footer />


    </div>
  );
};

export default Index;
