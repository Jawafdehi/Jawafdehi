import { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";

import { Seo } from "@/components/Seo";
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

      <main id="main-content" className="flex-1">
        <section
          id={`${id}-hero`}
          className="bg-gradient-to-br from-primary-surface via-navy-dark to-foreground py-16 md:py-20"
        >
          <div className="layout-container">
            <div className="max-w-3xl">
              <h1 className="font-page-title font-page-title-inverse mb-4">
                {text.title}
              </h1>
              <p className="font-page-lede font-page-lede-inverse">
                {text.lastUpdated}
              </p>
              <button
                type="button"
                lang={lang === "en" ? "ne" : "en"}
                onClick={() => void i18n.changeLanguage(lang === "en" ? "ne" : "en")}
                className="mt-4 text-sm font-semibold text-white/80 underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {text.switchLabel}
              </button>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="layout-container">
            <div
              data-legal-body={id}
              lang={lang}
              className="font-paragraph content-prose max-w-3xl mx-auto"
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
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
