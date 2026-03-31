import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Helmet } from "react-helmet-async";
import {
  Search, ShieldCheck, FileText, Sparkles, RefreshCw, FlaskConical,
  Newspaper, Youtube, Users, Building2, Mic2,
} from "lucide-react";

const PIPELINE_STEPS = [
  {
    number: "01",
    icon: Search,
    title: "Discovery",
    description:
      "Our data scraping team archives government documents, CIAA filings, court records, and CIB reports into digital text. The outreach team simultaneously works with investigative journalists, corruption watchdogs, and media organisations to surface cases not yet in the public record.",
  },
  {
    number: "02",
    icon: FlaskConical,
    title: "Research",
    description:
      "Our research team investigates what constitutes corruption in each case, the role it plays in Nepali governance, and the effectiveness of existing anti-corruption frameworks. Every case is contextualised before it is written up.",
  },
  {
    number: "03",
    icon: FileText,
    title: "Compilation",
    description:
      "The compilation team structures each case: key allegations, timeline of events, entities involved, and all source documents. Cases are written in plain language so citizens — not just lawyers — can understand them.",
  },
  {
    number: "04",
    icon: Sparkles,
    title: "AI-Assisted Drafting",
    description:
      "AI helps our team process large volumes of legal documents faster — summarising filings, extracting key facts, and flagging inconsistencies. Every AI-generated output is reviewed and approved by a human volunteer before publication.",
  },
  {
    number: "05",
    icon: ShieldCheck,
    title: "Verification & Publication",
    description:
      "All cases are cross-referenced against at least two independent sources. Once approved, the case is published to the archive — permanently. Records are never altered without a visible audit trail and never deleted.",
  },
  {
    number: "06",
    icon: RefreshCw,
    title: "Ongoing Tracking",
    description:
      "Published cases are actively monitored for developments: new court orders, verdicts, appeals, and entity responses. Updates are added to the existing case record so the full history is always visible.",
  },
];


const EXTERNAL_SOURCES = [
  { icon: Building2, label: "CIAA", desc: "Commission for the Investigation of Abuse of Authority" },
  { icon: ShieldCheck, label: "CIB", desc: "Central Investigation Bureau" },
  { icon: Newspaper, label: "Media", desc: "National and regional news organisations" },
  { icon: Mic2, label: "Investigative Journalists", desc: "Independent reporters and press groups" },
  { icon: Users, label: "Corruption Watchdogs", desc: "Civil society accountability organisations" },
  { icon: Youtube, label: "YouTubers & Creators", desc: "Digital journalists covering governance" },
];

const OurProcess = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Helmet>
      <title>Our Process — Jawafdehi</title>
      <meta
        name="description"
        content="How Jawafdehi discovers, researches, compiles, and publishes CIAA corruption cases — from raw government documents to a permanent public archive."
      />
    </Helmet>
    <Header />

    <main className="flex-1">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-navy-dark to-slate-800 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/50 mb-4">
              Our Process
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              How a corruption case goes from discovery to the public archive
            </h1>
            <p className="text-lg text-primary-foreground/70 leading-relaxed">
              Every case on Jawafdehi passes through a structured pipeline — from raw government documents and media sources through research, AI-assisted drafting, human review, and permanent publication.
            </p>
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="py-16 border-b border-border">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground mb-12">The Case Pipeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {PIPELINE_STEPS.map(({ number, icon: Icon, title, description }) => (
              <div key={number} className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="text-4xl font-black text-primary/10 leading-none mb-2">{number}</div>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="pt-1">
                    <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* External sources */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-2">Where Our Data Comes From</h2>
            <p className="text-muted-foreground max-w-2xl">
              We draw from official government sources and independent civil society — always citing the origin of every claim.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {EXTERNAL_SOURCES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-xl border border-border bg-background p-4 text-center">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm font-semibold text-foreground mb-1">{label}</div>
                <div className="text-xs text-muted-foreground leading-tight">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>

      <Footer />


  </div>
);

export default OurProcess;
