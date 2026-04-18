import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import {
  Search, Megaphone, Globe, BookOpen, FlaskConical,
  Github, Mail, Heart,
} from "lucide-react";

const TEAMS = [
  {
    icon: Search,
    name: "Data Scraping Team",
    color: "bg-blue-500/10 text-blue-600",
    responsibilities: [
      "Archive government documents into digital text for large-scale analysis",
      "Scrape Nepali media sources — existing and newly identified",
      "Leverage AI to bootstrap case drafts and update them as new information emerges",
      "Maintain the Nepal Entity Service data pipeline",
    ],
  },
  {
    icon: Megaphone,
    name: "Outreach Team",
    color: "bg-emerald-500/10 text-emerald-600",
    responsibilities: [
      "Build relationships with investigative journalists, corruption watchdogs, and YouTubers",
      "Source evidence and case leads from civil society organisations",
      "Coordinate with CIAA, CIB, and media for primary source access",
    ],
  },
  {
    icon: Globe,
    name: "Platform Development",
    color: "bg-violet-500/10 text-violet-600",
    responsibilities: [
      "Keep the platform accessible and performant for all stakeholders",
      "Maintain open APIs for public data access",
      "Build monitoring dashboards and run load testing",
      "Ship website improvements based on user feedback",
    ],
  },
  {
    icon: BookOpen,
    name: "Corruption Compilation Team",
    color: "bg-amber-500/10 text-amber-700",
    responsibilities: [
      "Compile, structure, and publish corruption cases",
      "Maintain case accuracy with ongoing updates and corrections",
      "Ensure every published case meets verification standards",
    ],
  },
  {
    icon: FlaskConical,
    name: "Corruption Research",
    color: "bg-rose-500/10 text-rose-600",
    responsibilities: [
      "Investigate what legally and ethically constitutes corruption in each context",
      "Analyse the role of corruption in Nepali governance structures",
      "Evaluate the effectiveness of anti-corruption policy and institutional frameworks",
    ],
  },
];

const Volunteer = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Helmet>
      <title>Volunteer with Us — Jawafdehi</title>
      <meta name="description" content="Join Jawafdehi as a volunteer. Help build Nepal's permanent corruption case archive — as a researcher, engineer, journalist, or translator." />
      <link rel="canonical" href="https://jawafdehi.org/volunteer" />
      <meta property="og:site_name" content="Jawafdehi Nepal" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://jawafdehi.org/volunteer" />
      <meta property="og:title" content="Volunteer with Us — Jawafdehi" />
      <meta property="og:description" content="Join Jawafdehi as a volunteer. Help build Nepal's permanent corruption case archive — as a researcher, engineer, journalist, or translator." />
      <meta property="og:image" content="https://jawafdehi.org/logo.PNG" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Volunteer with Us — Jawafdehi" />
      <meta name="twitter:description" content="Join Jawafdehi as a volunteer. Help build Nepal's permanent corruption case archive — as a researcher, engineer, journalist, or translator." />
      <meta name="twitter:image" content="https://jawafdehi.org/logo.PNG" />
    </Helmet>
    <Header />

    <main className="flex-1">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-navy-dark to-slate-800 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/50 mb-4">
              Volunteer with Us
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Help build Nepal's permanent accountability record
            </h1>
            <p className="text-lg text-primary-foreground/70 leading-relaxed mb-8">
              Jawafdehi runs entirely on volunteer effort. Whether you are a technology enthusiast, a working professional, a legal expert, or a student — if you believe corruption should not be forgotten, there is a place for you here. Join a worldwide network of Nepali professional volunteers building the infrastructure for accountability.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold">
                <a href="https://github.com/Jawafdehi" target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-5 w-5" />
                  Find us on GitHub
                </a>
              </Button>
              <a
                href="mailto:cases@jawafdehi.org"
                className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
              >
                <Mail className="h-4 w-4" />
                Email us at cases@jawafdehi.org
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Who we're looking for */}
      <section className="py-16 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-2">Who we're looking for</h2>
            <p className="text-muted-foreground mb-10">
              You don't need to be an expert. You need to care about Nepal and be willing to contribute your skills.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                {
                  emoji: "💻",
                  title: "Technology Enthusiasts",
                  desc: "Developers, data engineers, and AI practitioners who want to build civic infrastructure that matters. Frontend, backend, scraping, NLP — all skills are needed.",
                },
                {
                  emoji: "👔",
                  title: "Working Professionals",
                  desc: "Accountants, analysts, policy professionals, and domain experts who can bring their field knowledge to understanding and verifying corruption cases.",
                },
                {
                  emoji: "⚖️",
                  title: "Legal Professionals",
                  desc: "Lawyers, law students, and legal researchers who can help interpret CIAA filings, court orders, and legal timelines accurately for a public audience.",
                },
                {
                  emoji: "🎓",
                  title: "Students",
                  desc: "Students in law, public policy, computer science, journalism, or any field — this is real-world experience working on a problem that matters for Nepal.",
                },
              ].map(({ emoji, title, desc }) => (
                <div key={title} className="flex gap-4 p-5 rounded-xl border border-border hover:border-primary/30 transition-colors">
                  <div className="text-2xl flex-shrink-0">{emoji}</div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-5 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-semibold">🌏 A worldwide network of Nepali professionals.</span>{" "}
                Our volunteers are based across Nepal and around the world — in the US, UK, Australia, and beyond. When you join Jawafdehi, you become part of a global community of Nepali professionals united by a single goal: making sure Nepal remembers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Teams */}
      <section className="py-16 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-2">Our Volunteer Teams</h2>
            <p className="text-muted-foreground max-w-2xl">
              Each team owns a distinct part of the pipeline. Find the one that matches your skills.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TEAMS.map(({ icon: Icon, name, color, responsibilities }) => (
              <div key={name} className="rounded-xl border border-border p-6 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{name}</h3>
                </div>
                <ul className="space-y-2">
                  {responsibilities.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/50 flex-shrink-0 mt-1.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto px-4 text-center">
          <Heart className="h-8 w-8 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-3">Ready to contribute?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Start by exploring the codebase on GitHub or send us an email to introduce yourself and tell us which team interests you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <a href="https://github.com/Jawafdehi" target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-4 w-4" />
                GitHub — Jawafdehi
              </a>
            </Button>
            <a
              href="mailto:cases@jawafdehi.org"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              <Mail className="h-4 w-4" />
              Email us at cases@jawafdehi.org
            </a>
          </div>
        </div>
      </section>
    </main>

      <Footer />


  </div>
);

export default Volunteer;
