import { Helmet } from "react-helmet-async";
import { Mail, Linkedin, Facebook, Github, Globe, Users, Instagram } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usBoard, nepalBoard, members, pastMembers } from "@/data/team";
import type { Contact } from "@/data/team";
import { Cta } from "@/components/home/cta";
import { TeamCard } from "@/components/ui/card";

const ContactIcon = ({ contact }: { contact: Contact }) => {
  const href = contact.type === "email" ? `mailto:${contact.value}` : contact.value;
  const icon = {
    email: <Mail className="h-4 w-4" />,
    linkedin: <Linkedin className="h-4 w-4" />,
    facebook: <Facebook className="h-4 w-4" />,
    github: <Github className="h-4 w-4" />,
    website: <Globe className="h-4 w-4" />,
    instagram: <Instagram className="h-4 w-4" />,
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
  const { t, i18n } = useTranslation();
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
        <meta property="og:image" content="https://jawafdehi.org/assets/social-preview.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Team — Jawafdehi" />
        <meta name="twitter:description" content="Meet the Nepali volunteers building Jawafdehi — Nepal's permanent corruption case archive." />
        <meta name="twitter:image" content="https://jawafdehi.org/assets/social-preview.png" />
      </Helmet>

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section id="team-hero" className="relative isolate -mt-[76px] overflow-hidden bg-background pt-[76px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 left-[64%] z-0 h-[320px] w-[560px] max-w-none -translate-x-1/2 opacity-[0.34] blur-[124px] dark:hidden sm:-top-24 sm:left-[65%] sm:h-[400px] sm:w-[680px] sm:opacity-[0.38] sm:blur-[136px] lg:-top-28 lg:left-[66%] lg:h-[500px] lg:w-[820px] lg:opacity-[0.42] lg:blur-[152px]"
          >
            <div className="absolute right-[4%] top-10 h-[66%] w-[54%] rounded-full bg-accent opacity-85" />
            <div className="absolute left-[32%] top-24 h-[52%] w-[42%] rounded-full bg-accent opacity-55" />
            <div className="absolute -left-[14%] top-[46%] h-[34%] w-[26%] rounded-full bg-primary opacity-35" />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 z-[1] opacity-[0.22] [background-image:radial-gradient(hsl(var(--foreground)/0.14)_0.75px,transparent_0.75px)] [background-size:18px_18px]"
          />

          <div className="container relative z-10 mx-auto flex min-h-[52svh] w-full items-center justify-center py-14 text-center md:py-[4.5rem] lg:py-20">
            <div className="mx-auto max-w-5xl">
              
              <h1 className="text-[2.65rem] font-extrabold leading-[0.98] tracking-normal text-primary sm:text-5xl md:text-[3.35rem]">
                {t("team.hero.builtBy")}{" "}
                <span className="text-accent sm:whitespace-nowrap">
                  {t("team.hero.nepaliVolunteers")}
                </span>
                <span className="block text-primary">{t("team.hero.forNepal")}</span>
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
                {t("team.hero.description")}
              </p>
            </div>
          </div>
        </section>

        {/* Team sections */}
        {[
          { id: "nepal-board", heading: t("team.sections.nepalBoard", "Nepal Board"), data: nepalBoard },
          { id: "us-board", heading: t("team.sections.usBoard", "US Board"), data: usBoard },
          { id: "members", heading: t("team.sections.currentMembers", "Current Members"), data: members },
          { id: "past-members", heading: t("team.sections.pastMembers", "Past Members"), data: pastMembers },
        ].map(({ id, heading, data }) => (
          <section key={id} id={id} className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold text-primary mb-8">{heading}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {data.map((member) => (
                  <TeamCard key={member.displayName.en}>
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
                    {member.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                        {member.description}
                      </p>
                    )}

                    {/* Tags */}
                    {member.tags && member.tags.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4">
                        {member.tags.map((tag) => {
                          const isFounder = tag === "Founder";
                          const colorClasses = isFounder
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-blue-500/10 text-blue-600";
                          return (
                            <span
                              key={tag}
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${colorClasses}`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Social links */}
                    {member.contacts.length > 0 && (
                      <div className="flex items-center gap-3 pt-4 border-t border-border w-full justify-center">
                        {member.contacts.map((contact, i) => (
                          <ContactIcon key={i} contact={contact} />
                        ))}
                      </div>
                    )}
                  </TeamCard>
                ))}
              </div>
            </div>
          </section>
        ))}

       <Cta/>
      </main>

    </div>
  );
};

export default OurTeam;
