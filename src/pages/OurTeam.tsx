import { Mail, Linkedin, Facebook, Github, Globe, Users, Instagram } from "@/components/icons";
import { useTranslation } from "react-i18next";
import { usBoard, nepalBoard, members, pastMembers } from "@/data/team";
import type { Contact } from "@/data/team";
import { Cta } from "@/components/home/cta";
import { TeamCard } from "@/components/ui/card";
import { PageHero } from "@/components/ui/page-hero";
import { Seo } from "@/components/Seo";
import { SITE_URL } from "@/utils/seo";

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
      <Seo
        title="Our Team — Jawafdehi"
        description="Meet the Nepali volunteers building Jawafdehi — Nepal's permanent corruption case archive."
        canonicalUrl={`${SITE_URL}/team/`}
      />

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
          <section key={id} id={id} aria-labelledby={`${id}-title`} className="pt-16 md:pt-24 last-of-type:pb-4">
            <div className="layout-container">
              <h2 id={`${id}-title`} className="font-home-section-title text-primary">{heading}</h2>
              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data.map((member) => (
                  <TeamCard key={member.displayName.en}>
                    {/* Photo */}
                    <div className="mb-5 w-full">
                      {member.thumb ? (
                        <img
                          src={member.thumb}
                          alt={member.displayName.en}
                          // 112 CSS px (h-28) at DPR 4.5 — the device pixel ratio
                          // the phone gates run at — so 504 is the ceiling the
                          // generated avatars are sized to, capped at whatever the
                          // source actually has (9 of the 22 are smaller).
                          //
                          // The attributes do NOT prevent a reflow here: `h-28 w-28`
                          // already fixes the box at 112x112 before the image loads,
                          // measured. They are the declared intrinsic size and the
                          // aspect ratio, which is worth stating for its own sake —
                          // but the reflow argument belongs to data-sources.tsx,
                          // where `w-auto` leaves the width to the aspect ratio.
                          width={504}
                          height={504}
                          loading="lazy"
                          decoding="async"
                          className="h-20 w-20 rounded-full bg-muted object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                          <Users className="h-8 w-8 text-primary/40" />
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="text-xl font-normal leading-snug text-primary">
                      {member.displayName[lang] ?? member.displayName.en}
                    </h3>
                    {lang === "en" && member.displayName.ne && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{member.displayName.ne}</p>
                    )}

                    {/* Description */}
                    {member.description && (
                      <p className="mt-3 flex-1 text-base leading-7 text-muted-foreground">
                        {member.description}
                      </p>
                    )}

                    {/* Tags */}
                    {member.tags && member.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap items-center gap-1.5">
                        {member.tags.map((tag) => {
                          const isFoundingMember = tag === "Founding Member";
                          const colorClasses = isFoundingMember
                            ? "bg-accent/10 text-accent"
                            : "bg-muted text-primary/80";
                          return (
                            <span
                              key={tag}
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm ${colorClasses}`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Social links */}
                    {member.contacts.length > 0 && (
                      <div className="mt-5 flex w-full items-center gap-3 border-t border-border/70 pt-4">
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
