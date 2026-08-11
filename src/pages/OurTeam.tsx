import { Helmet } from "react-helmet-async";
import { Mail, Linkedin, Facebook, Github, Globe, Users, Instagram } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usBoard, nepalBoard, members, pastMembers } from "@/data/team";
import type { Contact } from "@/data/team";
import { Cta } from "@/components/home/cta";
import { TeamCard } from "@/components/ui/card";
import { PageHero } from "@/components/ui/page-hero";
import { SITE_NAME } from "@/utils/seo";

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
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/team" />
        <meta property="og:title" content="Our Team — Jawafdehi" />
        <meta property="og:description" content="Meet the Nepali volunteers building Jawafdehi — Nepal's permanent corruption case archive." />
        <meta property="og:image" content="https://jawafdehi.org/assets/social-preview.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Team — Jawafdehi" />
        <meta name="twitter:description" content="Meet the Nepali volunteers building Jawafdehi — Nepal's permanent corruption case archive." />
        <meta name="twitter:image" content="https://jawafdehi.org/assets/social-preview.png" />
      </Helmet>

      <main id="main-content" className="flex-1">
        <PageHero
          id="team-hero"
          description={t("team.hero.description")}
          title={
            <>
              {t("team.hero.builtBy")}{" "}
              <span className="text-accent sm:whitespace-nowrap">
                {t("team.hero.nepaliVolunteers")}
              </span>
              <span className="block text-primary">{t("team.hero.forNepal")}</span>
            </>
          }
        />

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
                          const isFoundingMember = tag === "Founding Member";
                          const colorClasses = isFoundingMember
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-blue-500/10 text-blue-600";
                          return (
                            <span
                              key={tag}
                              className={`font-meta inline-flex items-center rounded-full px-2.5 py-0.5 ${colorClasses}`}
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
