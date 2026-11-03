// /likhit: the landing page for likhit, Jawafdehi's open-source MarkItDown
// plugin for Nepali documents. It sits in the same family as the home page and
// /mcp — a navy hero on a brand shader, light Inter headings, white cards, the
// shared copy rows — with its own shader: a wave dither whose bands read like
// ruled lines of text, for the tool that reads documents.
//
// Content first came from PR #444 (which typeset the page in likhit's own
// benchmark design); this version keeps that content on the site's system.
import { ArrowUpRight, Github, Globe, Package } from "lucide-react";
import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { CopyBlock, CopyPill } from "@/components/copy-snippet";
import { Seo } from "@/components/Seo";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { WhatsNewSection } from "@/components/whats-new/whats-new-section";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

// The two places likhit actually lives. Both are outside this site — the package
// is on PyPI and the benchmark is a GitHub Pages build of the likhit repo.
const REPO_URL = "https://github.com/Jawafdehi/likhit";
const PYPI_URL = "https://pypi.org/project/likhit/";
const BENCHMARK_URL = "https://jawafdehi.github.io/likhit/";
const MARKITDOWN_URL = "https://github.com/microsoft/markitdown";
const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`;

// Hand-maintained: bump when a release goes out. Nothing here reads PyPI at
// runtime, by choice — one line of upkeep per release beats a third-party
// request on every page load to render one version string. Release notes live
// in the platform changelog (src/data/whats-new.ts, tag "likhit").
const VERSION = "0.2.0";

const INSTALL_COMMAND = "pip install likhit";

const FEATURES = ["repair", "layout", "ocr", "legacy"] as const;

// Least to most removed, the order the tiers are defined in, so a reader
// scanning for "what do I get by default" reaches `strict` last.
const REDACTION_TIERS = ["none", "identifiers", "contact", "strict"] as const;

const REDACT_COMMANDS = [
  { key: "scan", command: "likhit-redact scan transcripts/ --out report.json" },
  { key: "pdf", command: "likhit-redact pdf charge-sheet.pdf --out redacted.pdf --journal redaction.jsonl" },
  { key: "tree", command: "likhit-redact redact transcripts/ --out-tree redacted/ --journal redaction.jsonl" },
] as const;

const CLI_EXAMPLES = [
  { key: "one", command: "likhit-save notice.pdf --out notice.md" },
  { key: "many", command: "likhit-save a.pdf b.pdf --out-dir converted/" },
  { key: "pages", command: "likhit-save report.pdf --pages 2-4 --out pages.md" },
] as const;

// One recipe per place the OCR endpoint can live. They differ only in the
// three environment variables, which is the point the section makes, so the
// commands are written out in full.
const OCR_RECIPES = [
  {
    key: "local",
    commands: `ollama pull qwen2.5vl:7b

# Ollama ignores the key; the client refuses to start without one
export OPENAI_API_KEY=ollama
export OPENAI_BASE_URL=http://127.0.0.1:11434/v1
export MARKITDOWN_OCR_MODEL=qwen2.5vl:7b

likhit-save scanned-notice.pdf --out notice.md`,
  },
  {
    key: "bedrock",
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
    commands: `export OPENAI_API_KEY=your-api-key
export OPENAI_BASE_URL=https://api.example.com/v1
export MARKITDOWN_OCR_MODEL=your-vision-model

# or Gemini, where the base URL is filled in for you
export GEMINI_API_KEY=your-gemini-key
export GEMINI_MODEL=gemini-2.5-flash`,
  },
] as const;

const CARD = "rounded-3xl border border-border/60 bg-surface shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)]";
const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Inline fixed-width text, for identifiers quoted inside a sentence. */
const Code = ({ children }: Readonly<{ children?: ReactNode }>) => (
  <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">{children}</code>
);

/** The same inline code, on the navy hero. */
const CodeOnDark = ({ children }: Readonly<{ children?: ReactNode }>) => (
  <code className="rounded-md bg-primary-foreground/10 px-1.5 py-0.5 font-mono text-[0.9em] text-primary-foreground">
    {children}
  </code>
);

/** Every line in a block, split for CopyBlock, with comments set muted. */
function blockLines(text: string) {
  return text.split("\n").map((line) => ({ text: line || " ", muted: line.startsWith("#") }));
}

function SectionTitle({ id, children }: Readonly<{ id: string; children: ReactNode }>) {
  return (
    <h2 id={id} className="font-home-section-title text-primary">
      {children}
    </h2>
  );
}

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
        {/* ── Hero: navy on the lines shader; the navbar is transparent over
            it at rest (Navbar.tsx, DARK_HERO_PATHS). ── */}
        <section
          aria-labelledby="likhit-title"
          className="relative isolate -mt-[76px] overflow-hidden bg-primary-surface pt-[76px]"
        >
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <ShaderBackdrop design="lines" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--primary-surface))_0px,hsl(var(--primary-surface))_60px,transparent_170px),linear-gradient(90deg,hsl(var(--primary-surface))_30%,hsl(var(--primary-surface)/0.75)_55%,transparent_90%)]" />
          </div>

          <div className="layout-container flex min-h-[calc(100svh-76px)] flex-col justify-center pb-20 pt-10">
            <p className="font-eyebrow font-eyebrow-display text-sm text-[hsl(var(--accent-on-dark))] md:text-base">
              {t("likhit.hero.eyebrow")}
            </p>
            <h1 id="likhit-title" className="font-home-display mt-5 max-w-[16ch] text-[clamp(2.6rem,6vw,5.25rem)] text-primary-foreground">
              {t("likhit.hero.title")} <span className="text-[hsl(var(--accent-on-dark))]">{t("likhit.hero.titleAccent")}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-primary-foreground/80">
              <Trans
                i18nKey="likhit.install.lede"
                components={{
                  name: <strong className="font-medium text-primary-foreground" />,
                  doc: <CodeOnDark />,
                  markitdown: <a href={MARKITDOWN_URL} {...EXTERNAL} className="underline underline-offset-4 hover:text-primary-foreground" />,
                }}
              />
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <CopyPill value={INSTALL_COMMAND} label={t("likhit.install.copyLabel")} mono />
              <a
                href={CHANGELOG_URL}
                {...EXTERNAL}
                className="rounded-full border border-primary-foreground/30 px-3 py-1 font-mono text-sm text-primary-foreground/85 transition-colors hover:border-primary-foreground/60"
              >
                v{VERSION}
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              {[
                { href: REPO_URL, Icon: Github, label: t("likhit.hero.source") },
                { href: PYPI_URL, Icon: Package, label: t("likhit.hero.pypi") },
                { href: BENCHMARK_URL, Icon: Globe, label: t("likhit.hero.benchmark") },
              ].map(({ href, Icon, label }) => (
                <a
                  key={href}
                  href={href}
                  {...EXTERNAL}
                  className="group inline-flex items-center gap-2 rounded text-base text-primary-foreground/80 transition-colors hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── What it does ── */}
        <section aria-labelledby="likhit-features-title" className="pt-16 md:pt-24">
          <div className="layout-container">
            <Reveal>
              <SectionTitle id="likhit-features-title">{t("likhit.features.title")}</SectionTitle>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/70">
                <Trans i18nKey="likhit.install.usage" components={{ api: <Code />, cli: <Code /> }} />
              </p>
            </Reveal>
            <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((key, index) => (
                <li key={key}>
                  <Reveal className="h-full" delayMs={(index % 4) * 70}>
                    <article className={`${CARD} h-full p-6`}>
                      <h3 className="font-home-display text-xl leading-snug text-primary md:text-2xl">
                        {t(`likhit.features.${key}.name`)}
                      </h3>
                      <p className="mt-3 text-base leading-7 text-foreground/70">{t(`likhit.features.${key}.body`)}</p>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Command line ── */}
        <section aria-labelledby="likhit-cli-title" className="pt-16 md:pt-24">
          <div className="layout-container grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <Reveal>
              <SectionTitle id="likhit-cli-title">{t("likhit.cli.title")}</SectionTitle>
              <p className="mt-4 text-lg leading-8 text-foreground/70">
                <Trans i18nKey="likhit.cli.body" components={{ cmd: <Code /> }} />
              </p>
              {/* These commands changed behaviour in 0.2.0 and look identical,
                  so the page has to say so. */}
              <p className="mt-5 rounded-2xl bg-accent/5 px-5 py-4 text-base leading-7 text-foreground">
                <Trans i18nKey="likhit.cli.redactNote" components={{ tier: <Code />, opt: <Code /> }} />
              </p>
            </Reveal>
            <ul className="space-y-6">
              {CLI_EXAMPLES.map(({ key, command }) => (
                <li key={key}>
                  <p className="text-base font-medium text-foreground">{t(`likhit.cli.${key}`)}</p>
                  <CopyPill value={command} label={t("likhit.cli.copyCommand")} mono />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Redaction ── */}
        <section aria-labelledby="likhit-privacy-title" className="pt-16 md:pt-24">
          <div className="layout-container">
            <Reveal>
              <SectionTitle id="likhit-privacy-title">{t("likhit.privacy.title")}</SectionTitle>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-foreground/70">
                <Trans i18nKey="likhit.privacy.body" components={{ cmd: <Code />, opt: <Code /> }} />
              </p>
            </Reveal>

            <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
              <div aria-labelledby="likhit-tiers-title" role="group">
                <h3 id="likhit-tiers-title" className="font-home-display text-2xl text-primary">
                  {t("likhit.privacy.tiersTitle")}
                </h3>
                <p className="mt-3 text-base leading-7 text-foreground/70">{t("likhit.privacy.tiersBody")}</p>
                <dl className="mt-6 space-y-5">
                  {REDACTION_TIERS.map((key) => (
                    <div key={key} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-4">
                      <dt>
                        <code className="font-mono text-base text-accent">{t(`likhit.privacy.tiers.${key}.name`)}</code>
                      </dt>
                      <dd className="text-base leading-7 text-foreground/75">{t(`likhit.privacy.tiers.${key}.body`)}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div aria-labelledby="likhit-redact-title" role="group">
                <h3 id="likhit-redact-title" className="font-home-display text-2xl text-primary">
                  {t("likhit.privacy.commandsTitle")}
                </h3>
                <ul className="mt-6 space-y-6">
                  {REDACT_COMMANDS.map(({ key, command }) => (
                    <li key={key}>
                      <p className="text-base font-medium text-foreground">{t(`likhit.privacy.${key}`)}</p>
                      <CopyPill value={command} label={t("likhit.privacy.copyCommand")} mono />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── OCR ── */}
        <section aria-labelledby="likhit-ocr-title" className="pt-16 md:pt-24">
          <div className="layout-container">
            <Reveal>
              <SectionTitle id="likhit-ocr-title">{t("likhit.ocr.title")}</SectionTitle>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-foreground/70">{t("likhit.ocr.body")}</p>
              <p className="mt-4 max-w-3xl text-base leading-7 text-foreground/70">
                <Trans i18nKey="likhit.ocr.note" components={{ baseUrl: <Code />, apiKey: <Code />, model: <Code /> }} />
              </p>
            </Reveal>

            {/* One recipe per row: the description beside the full commands,
                so no line of the setup is cut off. */}
            <ul className="mt-10 space-y-6">
              {OCR_RECIPES.map(({ key, commands }, index) => (
                <li key={key}>
                  <Reveal delayMs={index * 80}>
                    <article className={`${CARD} grid grid-cols-1 gap-6 p-6 md:p-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10`}>
                      <div>
                        <Eyebrow className="text-sm">{t(`likhit.ocr.${key}.badge`)}</Eyebrow>
                        <h3 className="font-home-display mt-3 text-xl leading-snug text-primary md:text-2xl">
                          {t(`likhit.ocr.${key}.name`)}
                        </h3>
                        <p className="mt-3 text-base leading-7 text-foreground/70">{t(`likhit.ocr.${key}.body`)}</p>
                        {key === "bedrock" ? (
                          <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("likhit.ocr.bedrock.footnote")}</p>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <CopyBlock value={commands} label={t("likhit.ocr.copyRecipe")} lines={blockLines(commands)} />
                      </div>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <WhatsNewSection id="likhit-whats-new" heading={t("likhit.whatsNewHeading")} tag="likhit" />
        <div className="pb-16 md:pb-24" />
      </main>
    </div>
  );
};

export default Likhit;
