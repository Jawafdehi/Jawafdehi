import {
  ExternalLink,
  FileClock,
  Github,
  ScanText,
  Table,
  Terminal,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";

import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { CopyBlock, CopyButton, CopyField } from "@/components/ui/copy-field";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHero } from "@/components/ui/page-hero";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

// The two places likhit actually lives. Both are outside this site — the
// package is on PyPI and the benchmark is a GitHub Pages build of the likhit
// repo — so this page is the signpost, not the home.
const REPO_URL = "https://github.com/Jawafdehi/likhit";
const BENCHMARK_URL = "https://jawafdehi.github.io/likhit/";
const MARKITDOWN_URL = "https://github.com/microsoft/markitdown";

const INSTALL_COMMAND = "pip install likhit";

// Split for display only, the same way /mcp splits its endpoint: the package
// name is set in the accent colour so the part a reader is actually copying
// stands out. INSTALL_COMMAND above stays the one whole string that gets
// copied, so the two halves cannot drift apart.
const INSTALL_PREFIX = "pip install ";
const INSTALL_PACKAGE = "likhit";

const FEATURES = [
  { key: "repair", icon: Wrench },
  { key: "layout", icon: Table },
  { key: "ocr", icon: ScanText },
  { key: "legacy", icon: FileClock },
] as const;

const CLI_EXAMPLES = [
  { key: "one", command: "likhit-save notice.pdf --out notice.md" },
  { key: "many", command: "likhit-save a.pdf b.pdf --out-dir converted/" },
  { key: "pages", command: "likhit-save report.pdf --pages 2-4 --out pages.md" },
] as const;

// One recipe per place the OCR endpoint can live. They differ only in the three
// environment variables, which is the point the section is making, so the
// commands are written out in full rather than abbreviated to a diff.
const OCR_RECIPES = [
  {
    key: "local",
    highlight: true,
    commands: `ollama pull qwen2.5vl:7b

# Ollama ignores the key; the client refuses to start without one
export OPENAI_API_KEY=ollama
export OPENAI_BASE_URL=http://127.0.0.1:11434/v1
export MARKITDOWN_OCR_MODEL=qwen2.5vl:7b

likhit-save scanned-notice.pdf --out notice.md`,
  },
  {
    key: "bedrock",
    highlight: false,
    commands: `pip install 'litellm[proxy]'
litellm --model bedrock/anthropic.claude-sonnet-5

# whatever you configured the proxy to accept
export OPENAI_API_KEY=local-proxy-key
export OPENAI_BASE_URL=http://127.0.0.1:4000/v1
export MARKITDOWN_OCR_MODEL=bedrock/anthropic.claude-sonnet-5

likhit-save scanned-notice.pdf --out notice.md`,
  },
  {
    key: "hosted",
    highlight: false,
    commands: `export OPENAI_API_KEY=your-api-key
export OPENAI_BASE_URL=https://api.example.com/v1
export MARKITDOWN_OCR_MODEL=your-vision-model

# or Gemini, where the base URL is filled in for you
export GEMINI_API_KEY=your-gemini-key
export GEMINI_MODEL=gemini-2.5-flash`,
  },
] as const;

/** Inline fixed-width text, for the identifiers quoted inside a sentence. */
const Code = ({ children }: Readonly<{ children?: ReactNode }>) => (
  <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
    {children}
  </code>
);

const Likhit = () => {
  const { t, i18n } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`${t("likhit.meta.title")} | ${SITE_NAME}`}
        description={t("likhit.meta.description")}
        canonicalUrl={`${SITE_URL}/likhit/`}
        language={i18n.language}
      />

      <main id="main-content" className="flex-1">
        <PageHero
          id="likhit-hero"
          eyebrow={<Eyebrow className="mb-4">{t("likhit.hero.eyebrow")}</Eyebrow>}
          description={t("likhit.hero.description")}
          descriptionClassName="max-w-3xl"
          title={
            <>
              {t("likhit.hero.title")}{" "}
              <span className="text-accent">{t("likhit.hero.titleAccent")}</span>
            </>
          }
          actions={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="font-semibold">
                <a href={BENCHMARK_URL} target="_blank" rel="noopener noreferrer">
                  {t("likhit.hero.benchmark")}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>

              <Button asChild variant="outline" className="font-semibold">
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" aria-hidden="true" />
                  {t("likhit.hero.source")}
                </a>
              </Button>
            </div>
          }
        />

        <section id="install" className="bg-muted/10 py-12 md:py-16">
          <div className="layout-container">
            <div className="flex items-center justify-center gap-3">
              <code className="break-all text-center font-mono text-xl font-bold leading-tight text-foreground sm:text-2xl md:text-4xl lg:text-5xl">
                {INSTALL_PREFIX}
                <span className="text-accent">{INSTALL_PACKAGE}</span>
              </code>

              <CopyButton
                value={INSTALL_COMMAND}
                label={t("likhit.install.copyLabel")}
                iconClassName="h-5 w-5 md:h-6 md:w-6"
              />
            </div>

            <div className="measure-intro mx-auto mt-8 space-y-4 text-center">
              <p className="font-paragraph font-paragraph-foreground">
                <Trans
                  i18nKey="likhit.install.lede"
                  components={{
                    name: <span className="font-bold text-foreground" />,
                    markitdown: (
                      <a
                        href={MARKITDOWN_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:no-underline"
                      />
                    ),
                  }}
                />
              </p>

              <p className="font-paragraph font-paragraph-foreground text-sm">
                <Trans
                  i18nKey="likhit.install.usage"
                  components={{ api: <Code />, cli: <Code /> }}
                />
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="py-12 md:py-16">
          <div className="layout-container">
            <h2 className="mb-8 text-center text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
              {t("likhit.features.title")}
            </h2>

            <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
              {FEATURES.map(({ key, icon: Icon }) => (
                <div
                  key={key}
                  className="flex gap-4 rounded-lg border border-border bg-background p-6"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary-surface/[0.07] text-primary">
                    <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.6} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-lg font-bold text-primary">
                      {t(`likhit.features.${key}.name`)}
                    </p>
                    <p className="mt-1.5 font-paragraph font-paragraph-foreground text-sm">
                      {t(`likhit.features.${key}.body`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="cli" className="bg-muted/10 py-12 md:py-16">
          <div className="layout-container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-3 flex items-center justify-center gap-2.5 text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
                <Terminal className="h-7 w-7 md:h-8 md:w-8" aria-hidden="true" />
                {t("likhit.cli.title")}
              </h2>

              <p className="font-paragraph font-paragraph-foreground">
                <Trans i18nKey="likhit.cli.body" components={{ cmd: <Code /> }} />
              </p>
            </div>

            <ul className="mx-auto mt-8 grid max-w-4xl gap-4">
              {CLI_EXAMPLES.map(({ key, command }) => (
                <li key={key}>
                  <p className="mb-1.5 text-sm font-bold text-foreground">
                    {t(`likhit.cli.${key}`)}
                  </p>
                  <CopyField value={command} label={t("likhit.cli.copyCommand")} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="ocr" className="py-12 md:py-16">
          <div className="layout-container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-3 flex items-center justify-center gap-2.5 text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
                <ScanText className="h-7 w-7 md:h-8 md:w-8" aria-hidden="true" />
                {t("likhit.ocr.title")}
              </h2>

              <p className="font-paragraph font-paragraph-foreground">
                {t("likhit.ocr.body")}
              </p>

              <p className="mt-4 font-paragraph font-paragraph-foreground text-sm">
                <Trans
                  i18nKey="likhit.ocr.note"
                  components={{ baseUrl: <Code />, apiKey: <Code />, model: <Code /> }}
                />
              </p>
            </div>

            {/* Three abreast only from xl: at lg the columns are narrow enough
                that every `export` line in the recipes overflows. */}
            <div className="mx-auto mt-10 grid max-w-6xl gap-6 md:grid-cols-2 xl:grid-cols-3">
              {OCR_RECIPES.map(({ key, highlight, commands }) => (
                <article
                  key={key}
                  className="flex flex-col rounded-lg border border-border bg-background p-6"
                >
                  <span
                    className={
                      highlight
                        ? "self-start rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-accent"
                        : "self-start rounded-full bg-muted px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"
                    }
                  >
                    {t(`likhit.ocr.${key}.badge`)}
                  </span>

                  <h3 className="mt-3 text-lg font-bold text-primary">
                    {t(`likhit.ocr.${key}.name`)}
                  </h3>

                  <p className="mt-1.5 font-paragraph font-paragraph-foreground text-sm">
                    {t(`likhit.ocr.${key}.body`)}
                  </p>

                  <div className="mt-5">
                    <CopyBlock value={commands} label={t("likhit.ocr.copyRecipe")} />
                  </div>

                  {key === "bedrock" ? (
                    <p className="mt-3 font-paragraph text-xs text-muted-foreground">
                      {t("likhit.ocr.bedrock.footnote")}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="benchmark" className="bg-muted/10 py-12 md:py-16">
          <div className="layout-container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="mb-3 text-3xl font-extrabold tracking-normal text-accent md:text-4xl">
                {t("likhit.benchmark.title")}
              </h2>

              <p className="font-paragraph font-paragraph-foreground">
                {t("likhit.benchmark.body")}
              </p>

              <div className="mt-8">
                <Button asChild className="font-semibold">
                  <a href={BENCHMARK_URL} target="_blank" rel="noopener noreferrer">
                    {t("likhit.benchmark.cta")}
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Likhit;
