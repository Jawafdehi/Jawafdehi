import { Mail } from "@/components/icons";
import { useTranslation } from "react-i18next";

import { JAWAFDEHI_EMAIL } from "@/config/constants";

const RULE_KEYS = ["background", "clearSpace", "minSize", "dont"] as const;

const CONTACTS = [
  { key: "pressLabel", address: JAWAFDEHI_EMAIL },
  { key: "reportLabel", address: "report@jawafdehi.org" },
  { key: "privacyLabel", address: "privacy@jawafdehi.org" },
] as const;

export function PressKitUsage() {
  const { t } = useTranslation();

  return (
    <section id="usage" className="pb-20 pt-16 md:pb-28 md:pt-24">
      <div className="layout-container">
        <h2 className="font-home-section-title text-primary">{t("pressKit.rules.title")}</h2>

        <div className="mt-10 grid gap-3 md:grid-cols-2">
          {RULE_KEYS.map((key) => (
            <div key={key} className="rounded-[22px] bg-muted p-6">
              <h3 className="text-xl font-normal leading-snug text-primary">
                {t(`pressKit.rules.${key}Title`)}
              </h3>
              <p className="mt-2 text-[15px] leading-6 text-muted-foreground">
                {t(`pressKit.rules.${key}Body`)}
              </p>
            </div>
          ))}
        </div>

        <h2 className="font-home-section-title mt-16 text-primary md:mt-24">{t("pressKit.contact.title")}</h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{t("pressKit.contact.note")}</p>

        <ul className="mt-10 grid gap-3 md:grid-cols-3">
          {CONTACTS.map((contact) => (
            <li key={contact.address} className="rounded-[22px] border border-border/70 bg-surface p-5">
              <p className="text-sm text-muted-foreground">
                {t(`pressKit.contact.${contact.key}`)}
              </p>
              <a
                href={`mailto:${contact.address}`}
                className="mt-2 inline-flex items-center gap-2 text-[17px] text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {contact.address}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
