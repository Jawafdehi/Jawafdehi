import { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";

import { Seo } from "@/components/Seo";
import { LegalPage as LegalShell } from "@/components/legal-page";
import { legalBody } from "@/pages/legal/bodies";
import { SITE_URL } from "@/utils/seo";

type LegalCopy = {
  title: string;
  description: string;
  lastUpdated: string;
  switchLabel: string;
};

/**
 * The body's pre-rendered HTML for this page in this language, if the page was
 * loaded from the pre-render and the client has not replaced it yet. Read
 * during the first client render, before React commits over the server DOM.
 */
function readPrerenderedBody(id: string, lang: string): string | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector<HTMLElement>(`[data-legal-body="${id}"]`);
  return el && el.lang === lang && el.innerHTML.trim() ? el.innerHTML : null;
}

/**
 * Shell shared by the Privacy Policy and the Terms of Service: hero, date and
 * a body in the reader's language. The legal text itself lives in
 * <Name>En.tsx / <Name>Ne.tsx beside this file, one component per language
 * with the same sections and anchor ids, so each version reads as a whole and
 * the two can be compared side by side. They load lazily on the client
 * (./bodies.ts).
 */
export default function LegalPage({
  id,
  name,
  path,
  copy,
}: {
  id: string;
  name: "Privacy" | "Terms";
  path: string;
  copy: { en: LegalCopy; ne: LegalCopy };
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("en") ? "en" : "ne";
  const text = copy[lang];
  const Body = legalBody(lang === "en" ? `${name}En` : `${name}Ne`);
  const [prerendered] = useState(() => readPrerenderedBody(id, lang));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={text.title}
        description={text.description}
        canonicalUrl={`${SITE_URL}${path}`}
      />

      <LegalShell
        id={`${id}-hero`}
        eyebrow={lang === "en" ? "Legal" : "कानूनी"}
        title={text.title}
        updated={text.lastUpdated}
        heroExtra={
          <button
            type="button"
            lang={lang === "en" ? "ne" : "en"}
            onClick={() => void i18n.changeLanguage(lang === "en" ? "ne" : "en")}
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-muted px-5 text-[15px] text-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.08] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {text.switchLabel}
          </button>
        }
        bodyProps={{ "data-legal-body": id, lang }}
      >
        <Suspense
          fallback={
            prerendered ? (
              <div
                className="contents"
                dangerouslySetInnerHTML={{ __html: prerendered }}
              />
            ) : null
          }
        >
          <Body />
        </Suspense>
      </LegalShell>
    </div>
  );
}
