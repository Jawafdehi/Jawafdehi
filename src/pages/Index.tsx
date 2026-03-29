import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CaseCard } from "@/components/CaseCard";
import { Archive, Scale, Sparkles, ArrowRight, Search, SendHorizonal } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { getCases, getStatistics } from "@/services/jds-api";
import { useMemo, useState, useEffect } from "react";
import { formatDate } from "@/utils/date";

// Animated chat phases:
// 0 = reset/empty
// 1 = user msg 1
// 2 = typing indicator
// 3 = AI response 1
// 4 = user msg 2
// 5 = typing indicator
// 6 = AI response 2
const SEQUENCE: [number, number][] = [
  [700,   1],
  [1700,  2],
  [3100,  3],
  [4500,  4],
  [5400,  5],
  [6900,  6],
];
const LOOP_AFTER = 10500;

const TypingDots = () => (
  <div className="flex items-center gap-1 px-4 py-3">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="h-2 w-2 rounded-full bg-slate-400"
        style={{
          animation: "bounce 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`,
        }}
      />
    ))}
  </div>
);

const Index = () => {
  const [chatPhase, setChatPhase] = useState(0);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const runLoop = () => {
      setChatPhase(0);
      SEQUENCE.forEach(([delay, phase]) => {
        timeouts.push(setTimeout(() => setChatPhase(phase), delay));
      });
      timeouts.push(setTimeout(runLoop, LOOP_AFTER));
    };

    // Small initial delay before first run
    const start = setTimeout(runLoop, 400);

    return () => {
      clearTimeout(start);
      timeouts.forEach(clearTimeout);
    };
  }, []);

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

  const featuredCases = useMemo(() => {
    if (!casesData?.results) return [];
    return casesData.results.slice(0, 3).map((caseItem) => {
      const accusedEntities = caseItem.entities?.filter(e => e.type === 'accused') || [];
      const locationEntities = caseItem.entities?.filter(e => e.type === 'location') || [];
      const primaryEntity = accusedEntities[0]?.display_name || "Unknown Entity";
      const primaryLocation = locationEntities[0]?.display_name || "Unknown Location";
      const formattedDate = caseItem.case_start_date
        ? formatDate(caseItem.case_start_date, 'PPP')
        : formatDate(caseItem.created_at, 'PPP');
      return {
        id: caseItem.id.toString(),
        title: caseItem.title,
        entity: primaryEntity,
        location: primaryLocation,
        date: formattedDate,
        status: "ongoing" as const,
        description: caseItem.description.replace(/<[^>]*>/g, '').substring(0, 200),
        tags: caseItem.tags,
        entityIds: accusedEntities.map(e => e.id),
        locationIds: locationEntities.map(l => l.id),
      };
    });
  }, [casesData]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Jawafdehi — Nepal's Corruption Case Archive</title>
        <meta
          name="description"
          content="Every CIAA corruption case documented, simplified, and permanently accessible. Nepal's authoritative public record of corruption cases and official documents."
        />
      </Helmet>
      <Header />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative bg-gradient-to-br from-primary via-navy-dark to-slate-800 py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.04] bg-[size:24px_24px]" />

          <div className="container mx-auto px-4 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

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

              {/* Right — animated AI chat mock */}
              <div className="relative hidden lg:block">
                {/* Coming soon badge */}
                <div className="absolute -top-3 -right-3 z-10 flex items-center gap-1.5 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Search — Coming Soon
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur overflow-hidden shadow-2xl ring-1 ring-white/5">
                  {/* Window chrome */}
                  <div className="border-b border-white/10 px-4 py-3 flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-slate-700" />
                      <div className="h-3 w-3 rounded-full bg-slate-700" />
                      <div className="h-3 w-3 rounded-full bg-slate-700" />
                    </div>
                    <div className="flex items-center gap-1.5 ml-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs text-slate-400 font-medium">Jawafdehi AI — Case Research</span>
                    </div>
                  </div>

                  {/* Chat messages — fixed height, all slots always in DOM */}
                  <div className="p-5 flex flex-col gap-3 h-[320px] overflow-hidden">
                    {/* Spacer pushes messages to bottom */}
                    <div className="flex-1" />

                    {/* User message 1 */}
                    <div
                      className="flex justify-end transition-all duration-500"
                      style={{
                        opacity: chatPhase >= 1 ? 1 : 0,
                        transform: chatPhase >= 1 ? "translateY(0)" : "translateY(6px)",
                      }}
                    >
                      <div className="bg-primary rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[82%]">
                        <p className="text-sm text-white leading-relaxed">
                          Who has the most CIAA cases in Bagmati Province?
                        </p>
                      </div>
                    </div>

                    {/* AI response 1 — typing dots overlay same slot */}
                    <div
                      className="flex justify-start transition-all duration-500"
                      style={{
                        opacity: chatPhase >= 2 ? 1 : 0,
                        transform: chatPhase >= 2 ? "translateY(0)" : "translateY(6px)",
                      }}
                    >
                      <div className="bg-slate-700/80 rounded-2xl rounded-tl-sm max-w-[88%] min-w-[72px]">
                        {chatPhase === 2 ? (
                          <TypingDots />
                        ) : (
                          <div className="px-4 py-3">
                            <p className="text-sm text-slate-200 leading-relaxed">
                              Based on the archive,{" "}
                              <span className="text-amber-400 font-semibold">12 officials</span> in
                              Bagmati have 3 or more CIAA cases, primarily involving land
                              acquisition irregularities and financial misconduct.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User message 2 */}
                    <div
                      className="flex justify-end transition-all duration-500"
                      style={{
                        opacity: chatPhase >= 4 ? 1 : 0,
                        transform: chatPhase >= 4 ? "translateY(0)" : "translateY(6px)",
                      }}
                    >
                      <div className="bg-primary rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[82%]">
                        <p className="text-sm text-white leading-relaxed">
                          Show me the court documents for the top case
                        </p>
                      </div>
                    </div>

                    {/* AI response 2 — typing dots overlay same slot */}
                    <div
                      className="flex justify-start transition-all duration-500"
                      style={{
                        opacity: chatPhase >= 5 ? 1 : 0,
                        transform: chatPhase >= 5 ? "translateY(0)" : "translateY(6px)",
                      }}
                    >
                      <div className="bg-slate-700/80 rounded-2xl rounded-tl-sm max-w-[88%] min-w-[72px]">
                        {chatPhase === 5 ? (
                          <TypingDots />
                        ) : (
                          <div className="px-4 py-3 space-y-2">
                            <p className="text-sm text-slate-200 leading-relaxed">
                              Found{" "}
                              <span className="text-amber-400 font-semibold">4 court documents</span>{" "}
                              for case JWF-2023-0089:
                            </p>
                            <div className="space-y-1">
                              {["CIAA Filing — 12 Mar 2023", "Court Order — 28 Apr 2023", "Verdict — 14 Sep 2023"].map((doc) => (
                                <div key={doc} className="flex items-center gap-2 text-xs text-slate-400">
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                  {doc}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Input bar */}
                  <div className="border-t border-white/10 px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 rounded-lg bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                      <p className="text-sm text-slate-500 flex-1">Ask about any CIAA case...</p>
                      <span className="h-4 w-0.5 bg-slate-500 rounded animate-pulse" />
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-primary/50 flex items-center justify-center flex-shrink-0">
                      <SendHorizonal className="h-4 w-4 text-white/50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust strip ── */}
        <section className="bg-primary/5 border-b border-border py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm">
              <div className="flex items-center gap-2 text-foreground/70">
                <span className="text-base">🇳🇵</span>
                <span>Built by Nepali, for Nepali</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-foreground/70">
                <span className="text-emerald-600 font-bold text-base">∞</span>
                <span>Free forever — no subscriptions, no paywalls</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-foreground/70">
                <span className="text-base">🔓</span>
                <span>All data in the public domain</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-foreground/70">
                <span className="text-base">📜</span>
                <span>Records are never deleted</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-foreground/70">
                <span className="text-base">✅</span>
                <span>Every AI-generated summary is reviewed for factual accuracy</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-foreground/70">
                <span className="text-base">⚙️</span>
                <span>All technology is open source</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-foreground/70">
                <span className="text-base">🤝</span>
                <span>100% volunteer-powered</span>
              </div>
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
