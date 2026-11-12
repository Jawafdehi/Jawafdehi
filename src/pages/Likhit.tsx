// /likhit: the landing page for likhit, Jawafdehi's open-source MarkItDown
// plugin for Nepali documents. It sits in the same family as the home page and
// /mcp — a navy hero on a brand shader, light Inter headings, white cards, the
// shared copy rows — with its own shader: a wave dither whose bands read like
// ruled lines of text, for the tool that reads documents.
//
// Content first came from PR #444 (which typeset the page in likhit's own
// benchmark design); this version keeps that content on the site's system.
import { ArrowRight, ArrowUpRight, Github, Globe, Package } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { CopyBlock, CopyButton, CopyPill } from "@/components/copy-snippet";
import { Seo } from "@/components/Seo";
import { chipVariants } from "@/components/ui/chip";
import { Panel } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { WhatsNewSection } from "@/components/whats-new/whats-new-section";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

// The two places likhit actually lives. Both are outside this site — the package
// is on PyPI and the benchmark is a GitHub Pages build of the likhit repo.
const REPO_URL = "https://github.com/Jawafdehi/likhit";
const PYPI_URL = "https://pypi.org/project/likhit/";
const BENCHMARK_URL = "https://jawafdehi.github.io/likhit/";
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

/** One redaction example: a PDF in, a redacted PDF and its journal out. */
const REDACT_COMMAND = "likhit-redact pdf charge-sheet.pdf --out redacted.pdf --journal redaction.jsonl";

/** The command-line usage as ONE copyable block, each case a comment. */
const CLI_BLOCK = `# one file
likhit-save notice.pdf --out notice.md

# many files
likhit-save a.pdf b.pdf --out-dir converted/

# a page range
likhit-save report.pdf --pages 2-4 --out pages.md

# redacts personal data by default; keep everything with
likhit-save notice.pdf --redact none --out notice.md

# or as a MarkItDown plugin
markitdown --use-plugins document.pdf`;

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

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Inline fixed-width text, for identifiers quoted inside a sentence. */
const Code = ({ children }: Readonly<{ children?: ReactNode }>) => (
  <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">{children}</code>
);

/** Every line in a block, split for CopyBlock, with comments set muted. */
function blockLines(text: string) {
  return text.split("\n").map((line) => ({ text: line || " ", muted: line.startsWith("#") }));
}

/** The install command as one terminal line on navy: prompt, command, copy. */
function InstallLine() {
  const { t } = useTranslation();
  return (
    <div className="inline-flex h-12 items-center gap-3 rounded-full bg-surface py-1 pl-5 pr-1.5">
      <code className="whitespace-nowrap font-mono text-[15px] text-primary">
        <span aria-hidden="true" className="select-none text-muted-foreground">
          ${" "}
        </span>
        {INSTALL_COMMAND}
      </code>
      <CopyButton value={INSTALL_COMMAND} label={t("likhit.install.copyLabel")} />
    </div>
  );
}

/** The three OCR setups behind the site's switcher pills, one shown at a time. */
function OcrRecipes() {
  const { t } = useTranslation();
  const [active, setActive] = useState<(typeof OCR_RECIPES)[number]["key"]>("local");
  const recipe = OCR_RECIPES.find(({ key }) => key === active) ?? OCR_RECIPES[0];
  return (
    <div className="min-w-0">
      <div role="group" aria-label={t("likhit.ocr.title")} className="flex flex-wrap gap-1">
        {OCR_RECIPES.map(({ key }) => (
          <button
            key={key}
            type="button"
            aria-pressed={key === active}
            onClick={() => setActive(key)}
            className={chipVariants({ active: key === active })}
          >
            {t(`likhit.ocr.${key}.name`)}
          </button>
        ))}
      </div>
      <p className="mt-4 text-[15px] leading-6 text-muted-foreground">{t(`likhit.ocr.${recipe.key}.body`)}</p>
      <CopyBlock value={recipe.commands} label={t("likhit.ocr.copyRecipe")} lines={blockLines(recipe.commands)} />
    </div>
  );
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

          {/* The hero names the product before it sells it (the incident.io /
              Subframe pattern): an announcement pill that is also the release
              badge, the promise, then one line saying what likhit IS — the
              headline alone never mentioned it. The install command is the
              primary action, set as a terminal line; the places to read more
              sit beside it as quieter pills of the same height. */}
          <div className="layout-container flex min-h-[min(780px,calc(100svh-76px))] flex-col justify-center pb-20 pt-12">
            <a
              href={CHANGELOG_URL}
              {...EXTERNAL}
              className="group inline-flex w-fit items-center gap-2.5 rounded-full bg-primary-foreground/10 py-1 pl-1 pr-3.5 text-sm text-primary-foreground/85 transition-colors hover:bg-primary-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
            >
              <span className="rounded-full bg-surface px-2.5 py-0.5 font-mono text-[13px] text-primary">likhit v{VERSION}</span>
              {t("likhit.hero.whatsNew")}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </a>

            <h1 id="likhit-title" className="font-home-display mt-8 max-w-[16ch] text-[clamp(2.6rem,6vw,5.25rem)] text-primary-foreground">
              {t("likhit.hero.title")} <span className="text-[hsl(var(--accent-on-dark))]">{t("likhit.hero.titleAccent")}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-primary-foreground/80 md:text-2xl md:leading-9">
              <Trans i18nKey="likhit.hero.lede" components={{ name: <strong className="font-medium text-primary-foreground" /> }} />
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <InstallLine />
              {[
                { href: REPO_URL, Icon: Github, label: t("likhit.hero.source") },
                { href: PYPI_URL, Icon: Package, label: t("likhit.hero.pypi") },
                { href: BENCHMARK_URL, Icon: Globe, label: t("likhit.hero.benchmark") },
              ].map(({ href, Icon, label }) => (
                <a
                  key={href}
                  href={href}
                  {...EXTERNAL}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-primary-foreground/10 px-4 text-[15px] text-primary-foreground/85 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* The page used to explain itself in six long sections. It now
            leaves the explaining to the hero, the launch video and the README,
            and keeps only what a visitor acts on: what it fixes, the commands,
            the redaction tiers at a glance, and the OCR setup they need. */}

        {/* ── What it does ── */}
        <section aria-labelledby="likhit-features-title" className="pt-16 md:pt-24">
          <div className="layout-container">
            <SectionTitle id="likhit-features-title">{t("likhit.features.title")}</SectionTitle>
            <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((key, index) => (
                <li key={key}>
                  <Reveal className="h-full" delayMs={(index % 4) * 70}>
                    <Panel className="min-h-[11rem] justify-end">
                      <h3 className="text-xl font-normal leading-snug text-primary">{t(`likhit.features.${key}.name`)}</h3>
                      <p className="mt-2 text-[15px] leading-6 text-muted-foreground">{t(`likhit.features.${key}.body`)}</p>
                    </Panel>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Command line: one block, the commands commented ── */}
        <section aria-labelledby="likhit-cli-title" className="pt-16 md:pt-24">
          <div className="layout-container grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <SectionTitle id="likhit-cli-title">{t("likhit.cli.title")}</SectionTitle>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                <Trans i18nKey="likhit.cli.short" components={{ cmd: <Code /> }} />
              </p>
            </div>
            <div className="min-w-0">
              <CopyBlock value={CLI_BLOCK} label={t("likhit.cli.copyCommand")} lines={blockLines(CLI_BLOCK)} />
            </div>
          </div>
        </section>

        {/* ── Redaction: the tiers at a glance ── */}
        <section aria-labelledby="likhit-privacy-title" className="pt-16 md:pt-24">
          <div className="layout-container grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <SectionTitle id="likhit-privacy-title">{t("likhit.privacy.title")}</SectionTitle>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">{t("likhit.privacy.short")}</p>
              <a
                href={REPO_URL}
                {...EXTERNAL}
                className="mt-5 inline-flex items-center gap-1.5 rounded text-base text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("likhit.privacy.guide")}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <div className="min-w-0">
              <dl aria-labelledby="likhit-privacy-title" className="divide-y divide-border/70 rounded-[22px] bg-muted px-6">
                {REDACTION_TIERS.map((key) => (
                  <div key={key} className="grid grid-cols-[8rem_minmax(0,1fr)] items-baseline gap-4 py-4">
                    <dt>
                      <code className="font-mono text-[15px] text-primary">{key}</code>
                    </dt>
                    <dd className="text-[15px] leading-6 text-muted-foreground">{t(`likhit.privacy.tiersShort.${key}`)}</dd>
                  </div>
                ))}
              </dl>
              <CopyPill value={REDACT_COMMAND} label={t("likhit.privacy.copyCommand")} mono />
            </div>
          </div>
        </section>

        {/* ── OCR: one recipe at a time, chosen with the site's switcher ── */}
        <section aria-labelledby="likhit-ocr-title" className="pt-16 md:pt-24">
          <div className="layout-container grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <SectionTitle id="likhit-ocr-title">{t("likhit.ocr.title")}</SectionTitle>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">{t("likhit.ocr.short")}</p>
            </div>
            <OcrRecipes />
          </div>
        </section>

        <WhatsNewSection id="likhit-whats-new" heading={t("likhit.whatsNewHeading")} tag="likhit" />
        <div className="pb-16 md:pb-24" />
      </main>
    </div>
  );
};

export default Likhit;
