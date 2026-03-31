import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Helmet } from "react-helmet-async";
import { Database, Code2, LayoutDashboard, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRODUCTS = [
  {
    icon: Database,
    name: "Nepal Entity Service (NES)",
    href: "https://nes.jawafdehi.org",
    description:
      "Structured, open data on politicians, political parties, government leaders, and locations — designed to be reusable across any civic tech service.",
    tags: ["Open Source", "Open Data", "Free Public API"],
  },
  {
    icon: Code2,
    name: "Jawafdehi API",
    href: "https://portal.jawafdehi.org/api/swagger/",
    description:
      "The backend service that manages corruption cases, handles moderation workflows, and integrates with NES for entity data.",
    tags: ["REST API", "Open Source", "Swagger Docs"],
  },
  {
    icon: LayoutDashboard,
    name: "Jawafdehi Web App",
    href: "https://jawafdehi.org",
    description:
      "This platform — the public-facing interface for browsing cases, exploring entities, and understanding the archive.",
    tags: ["React", "Open Source", "Bilingual"],
  },
  {
    icon: Database,
    name: "NGM Archive",
    href: "https://ngm.jawafdehi.org",
    description:
      "Open source database schema and seed data for the Nepal Entity Service. Community-driven migrations with full audit trails.",
    tags: ["Open Schema", "Community Migrations", "GitHub"],
  },
];

const OurProducts = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Helmet>
      <title>Our Products — Jawafdehi</title>
      <meta
        name="description"
        content="Every product Jawafdehi builds is open source and free to use. Explore our public APIs, web platform, and civic data services."
      />
    </Helmet>
    <Header />

    <main className="flex-1">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-navy-dark to-slate-800 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/50 mb-4">
              Our Products
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Open source, free to use — built for civic good
            </h1>
            <p className="text-lg text-primary-foreground/70 leading-relaxed">
              Every component we build is open source and free to use. The full stack is public on GitHub — built by Nepali volunteers and made available to anyone who wants to build on top of it.
            </p>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-16 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-2">The Stack</h2>
            <p className="text-muted-foreground max-w-2xl">
              Four interconnected services — each independently usable, all open to the public.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PRODUCTS.map(({ icon: Icon, name, href, description, tags }) => (
              <div key={name} className="rounded-xl border border-border bg-background p-6 hover:border-primary/30 transition-colors">
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {name} ↗
                    </a>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {tags.map((tag) => (
                        <span key={tag} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open source CTA */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto px-4 text-center">
          <Github className="h-8 w-8 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-3">Everything is on GitHub</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Browse the source code, open issues, or contribute directly. No permission needed — it's all public.
          </p>
          <Button asChild>
            <a href="https://github.com/Jawafdehi" target="_blank" rel="noopener noreferrer">
              <Github className="mr-2 h-4 w-4" />
              GitHub — Jawafdehi
            </a>
          </Button>
        </div>
      </section>
    </main>

      <Footer />


  </div>
);

export default OurProducts;
