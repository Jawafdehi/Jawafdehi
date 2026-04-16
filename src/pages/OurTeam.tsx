import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Helmet } from "react-helmet-async";
import { Mail, Linkedin, Facebook, Github, Globe, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { teamMembers } from "@/data/team";
import type { Contact } from "@/data/team";

const ContactIcon = ({ contact }: { contact: Contact }) => {
  const href = contact.type === "email" ? `mailto:${contact.value}` : contact.value;
  const icon = {
    email: <Mail className="h-4 w-4" />,
    linkedin: <Linkedin className="h-4 w-4" />,
    facebook: <Facebook className="h-4 w-4" />,
    github: <Github className="h-4 w-4" />,
    website: <Globe className="h-4 w-4" />,
  }[contact.type];

  return (
    <a
      href={href}
      target={contact.type !== "email" ? "_blank" : undefined}
      rel={contact.type !== "email" ? "noopener noreferrer" : undefined}
      className="text-muted-foreground hover:text-primary transition-colors"
      aria-label={contact.type}
    >
      {icon}
    </a>
  );
};

const OurTeam = () => {
  const { i18n } = useTranslation();
  const lang = (i18n.language?.startsWith("ne") ? "ne" : "en") as "en" | "ne";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Our Team — Jawafdehi</title>
        <meta name="description" content="Meet the Nepali volunteers building Jawafdehi — Nepal's permanent corruption case archive." />
        <link rel="canonical" href="https://jawafdehi.org/team" />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/team" />
        <meta property="og:title" content="Our Team — Jawafdehi" />
        <meta property="og:description" content="Meet the Nepali volunteers building Jawafdehi — Nepal's permanent corruption case archive." />
        <meta property="og:image" content="https://jawafdehi.org/og-favicon.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Team — Jawafdehi" />
        <meta name="twitter:description" content="Meet the Nepali volunteers building Jawafdehi — Nepal's permanent corruption case archive." />
        <meta name="twitter:image" content="https://jawafdehi.org/og-favicon.png" />
      </Helmet>
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary via-navy-dark to-slate-800 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/50 mb-4">
                Our Team
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
                Built by Nepali volunteers, for Nepal
              </h1>
              <p className="text-lg text-primary-foreground/70 leading-relaxed">
                Jawafdehi runs entirely on volunteer effort from Nepali citizens across technology, research, journalism, and public policy. No corporate interests. No government funding. Just people who believe accountability matters.
              </p>
            </div>
          </div>
        </section>

        {/* Team grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamMembers.map((member) => (
                <div
                  key={member.displayName.en}
                  className="flex flex-col items-center text-center p-8 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors"
                >
                  {/* Photo */}
                  <div className="mb-5">
                    {member.thumb ? (
                      <img
                        src={member.thumb}
                        alt={member.displayName.en}
                        className="h-28 w-28 rounded-full object-cover ring-4 ring-background shadow-md"
                      />
                    ) : (
                      <div className="h-28 w-28 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-background shadow-md">
                        <Users className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-lg font-bold text-foreground mb-0.5">
                    {member.displayName[lang]}
                  </h3>
                  {lang === "en" && member.displayName.ne && (
                    <p className="text-sm text-muted-foreground/60 mb-3">{member.displayName.ne}</p>
                  )}

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                    {member.description}
                  </p>

                  {/* Social links */}
                  {member.contacts.length > 0 && (
                    <div className="flex items-center gap-3 pt-4 border-t border-border w-full justify-center">
                      {member.contacts.map((contact, i) => (
                        <ContactIcon key={i} contact={contact} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Join CTA */}
        <section className="py-14 bg-muted/30 border-t border-border">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">Want to contribute?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              We're always looking for volunteers — engineers, researchers, journalists, and translators who care about accountability in Nepal.
            </p>
            <a
              href="https://github.com/Jawafdehi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Github className="h-4 w-4" />
              Find us on GitHub
            </a>
          </div>
        </section>
      </main>

      <Footer />


    </div>
  );
};

export default OurTeam;
