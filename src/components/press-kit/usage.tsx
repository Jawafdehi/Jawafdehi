import { Mail } from "lucide-react";
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
    <section id="usage" className="py-12 md:py-16">
      <div className="layout-container">
        <h2 className="mb-8 text-center text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
          {t("pressKit.rules.title")}
        </h2>

        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          {RULE_KEYS.map((key) => (
            <div key={key} className="rounded-lg border border-border bg-background p-5">
              <h3 className="font-bold text-primary">
                {t(`pressKit.rules.${key}Title`)}
              </h3>
              <p className="mt-2 font-paragraph font-paragraph-foreground">
                {t(`pressKit.rules.${key}Body`)}
              </p>
            </div>
          ))}
        </div>

        <h2 className="mb-3 mt-14 text-center text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
          {t("pressKit.contact.title")}
        </h2>
        <p className="mx-auto mb-8 max-w-3xl text-center font-paragraph font-paragraph-foreground">
          {t("pressKit.contact.note")}
        </p>

        <ul className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
          {CONTACTS.map((contact) => (
            <li
              key={contact.address}
              className="rounded-lg border border-border bg-background p-5 text-center"
            >
              <p className="text-sm text-muted-foreground">
                {t(`pressKit.contact.${contact.key}`)}
              </p>
              <a
                href={`mailto:${contact.address}`}
                className="mt-2 inline-flex items-center gap-2 font-bold text-primary underline-offset-4 hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
