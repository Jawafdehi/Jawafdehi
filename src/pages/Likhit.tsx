// /likhit: the landing page for likhit, Jawafdehi's open-source MarkItDown
// plugin for Nepali documents. It sits in the same family as the home page and
// /mcp — a navy hero on a brand shader, light Inter headings, white cards, the
// shared copy rows — with its own shader: a wave dither whose bands read like
// ruled lines of text, for the tool that reads documents.
//
// Content first came from PR #444 (which typeset the page in likhit's own
// benchmark design); this version keeps that content on the site's system.
import { ArrowRight, ArrowUpRight, Github, Globe, Package } from "@/components/icons";
import { useEffect, useState, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { Eyebrow } from "@/components/ui/eyebrow";
import { MistCarousel } from "@/components/ui/mist-carousel";
import { CopyBlock, CopyButton, CopyPill } from "@/components/copy-snippet";
import { Seo } from "@/components/Seo";
import { Panel } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { WhatsNewSection } from "@/components/whats-new/whats-new-section";
import { cn } from "@/lib/utils";
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


/** The command-line cases, one copyable command each. */
const CLI_EXAMPLES = [
  { key: "one", command: "likhit-save notice.pdf --out notice.md" },
  { key: "many", command: "likhit-save a.pdf b.pdf --out-dir converted/" },
  { key: "pages", command: "likhit-save report.pdf --pages 2-4 --out pages.md" },
  { key: "keep", command: "likhit-save notice.pdf --redact none --out notice.md" },
  { key: "plugin", command: "markitdown --use-plugins document.pdf" },
] as const;
// One recipe per place the OCR endpoint can live. They differ only in the
// three environment variables, which is the point the section makes, so the
// commands are written out in full.
/** How long each OCR setup shows before the switcher moves on. */
const OCR_DWELL_MS = 6000;

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

/**
 * The three OCR setups as a slow carousel (the Wild and Retool step pattern):
 * a light card on the mist shader, the setup's name as a title with its line
 * under it on the left and its commands on white on the right, and the
 * progress dots under the card.
 */
function OcrRecipes() {
  const { t } = useTranslation();
  return (
    <MistCarousel
      ariaLabel={t("likhit.ocr.title")}
      dwellMs={OCR_DWELL_MS}
      slides={OCR_RECIPES.map(({ key, commands }) => ({
        key,
        label: t(`likhit.ocr.${key}.name`),
        title: t(`likhit.ocr.${key}.name`),
        body: t(`likhit.ocr.${key}.body`),
        aside: (
          <CopyBlock
            value={commands}
            label={t("likhit.ocr.copyRecipe")}
            lines={blockLines(commands)}
            className="mt-0 h-full border-border/60 bg-surface/90 backdrop-blur-sm [&_pre]:text-[15px] [&_pre]:leading-8 lg:w-full"
          />
        ),
      }))}
    />
  );
}

/**
 * The closing pitch, in the poster-card form (a framed card: art on the left
 * holding a small code window, the promise on the right, the product mark and
 * its URL at the foot). The art is likhit's own lines shader on navy, so the
 * card belongs to this page; the window shows one real run and its output.
 */
function PitchCard() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="likhit-pitch-title" className="pt-16 md:pt-24">
      <div className="layout-container">
        <div className="grid grid-cols-1 gap-4 rounded-[32px] border border-border/70 bg-surface p-3 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:p-4">
          <div className="relative isolate flex min-h-[22rem] items-center justify-center overflow-hidden rounded-[24px] bg-primary-surface p-6 md:min-h-[30rem] md:p-10">
            <div aria-hidden="true" className="absolute inset-0 -z-10">
              <ShaderBackdrop design="lines" />
            </div>
            <div aria-hidden="true" className="w-full max-w-md rounded-xl bg-surface p-5 font-mono text-[12px] leading-6 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.5)] md:text-[13px]">
              <p className="text-primary">
                <span className="select-none text-muted-foreground">$ </span>pip install likhit
              </p>
              <p className="text-primary">
                <span className="select-none text-muted-foreground">$ </span>likhit-save notice.pdf --out notice.md
              </p>
              <p className="mt-3 text-muted-foreground"># notice.md</p>
              <p className="text-accent"># अख्तियार दुरुपयोग अनुसन्धान आयोग</p>
              <p className="text-primary">## प्रेस विज्ञप्ति</p>
              <p className="mt-2 h-1.5 w-[85%] rounded-full bg-border" />
              <p className="mt-2 h-1.5 w-[70%] rounded-full bg-border" />
              <p className="mt-3 text-muted-foreground">{t("likhit.pitch.redacted")}</p>
            </div>
          </div>
          <div className="flex flex-col p-4 md:p-8">
            <h2
              id="likhit-pitch-title"
              className="font-home-display text-[clamp(2.2rem,3.6vw,3.25rem)] leading-[1.05] text-primary [:root[lang=ne]_&]:leading-[1.25]"
            >
              {t("likhit.pitch.titleA")}
              <br />
              {t("likhit.pitch.titleB")}
            </h2>
            <p className="mt-auto max-w-md pt-12 text-lg leading-8 text-muted-foreground md:text-xl">{t("likhit.pitch.body")}</p>
            <div className="mt-8 flex items-center justify-between gap-6">
              <span className="font-home-display text-2xl text-primary">likhit</span>
              <a
                href={PYPI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded text-base text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                pypi.org/project/likhit
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The art at the top of each feature card: a dithered field of dots, dense at
 * one corner and thinning out, in crimson or the archive's blue by turn. Pure
 * CSS (a dot grid under a radial mask), so four cards cost no WebGL.
 */
const DITHER_ART = [
  { color: "hsl(var(--accent))", at: "100% 0%" },
  { color: "hsl(214 65% 52%)", at: "0% 0%" },
  { color: "hsl(var(--accent))", at: "50% 0%" },
  { color: "hsl(214 65% 52%)", at: "100% 0%" },
] as const;

function FeatureDither({ index }: Readonly<{ index: number }>) {
  const { color, at } = DITHER_ART[index % DITHER_ART.length];
  // Two masks multiplied: the corner bloom, and a fade to nothing before the
  // text, so the dots never sit under a word.
  const mask = `radial-gradient(circle at ${at}, #000 0%, rgba(0,0,0,0.5) 35%, transparent 75%), linear-gradient(#000 30%, transparent 100%)`;
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 -z-10 h-[55%]"
      style={{
        backgroundImage: `radial-gradient(${color} 1.5px, transparent 2px), radial-gradient(${color} 1.5px, transparent 2px)`,
        backgroundSize: "8px 8px, 8px 8px",
        backgroundPosition: "0 0, 4px 4px",
        maskImage: mask,
        WebkitMaskImage: mask,
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    />
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
                    <Panel className="relative isolate min-h-[15rem] justify-end overflow-hidden">
                      <FeatureDither index={index} />
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
            {/* One command per row, each with its own label and copy button. */}
            <ul className="min-w-0 space-y-5">
              {CLI_EXAMPLES.map(({ key, command }) => (
                <li key={key}>
                  <p className="text-sm text-muted-foreground">{t(`likhit.cli.cases.${key}`)}</p>
                  <CopyPill value={command} label={t("likhit.cli.copyCommand")} mono fullWidth />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Redaction: the tiers at a glance ── */}
        <section aria-labelledby="likhit-privacy-title" className="pt-16 md:pt-24">
          <div className="layout-container">
            {/* The OCR card's twin: the same mist shader, padding and height,
                the tiers on white on the left, the title, line and guide link
                on the right. */}
            <div className="relative isolate grid grid-cols-1 gap-8 overflow-hidden rounded-[28px] border border-border/70 bg-surface p-6 md:p-10 lg:min-h-[25rem] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
              <div aria-hidden="true" className="absolute inset-0 -z-10">
                <ShaderBackdrop design="mist" />
              </div>
              <div className="flex flex-col lg:order-last">
                <SectionTitle id="likhit-privacy-title">{t("likhit.privacy.title")}</SectionTitle>
                <p className="mt-4 text-lg leading-8 text-muted-foreground">{t("likhit.privacy.short")}</p>
                <a
                  href={REPO_URL}
                  {...EXTERNAL}
                  className="mt-6 inline-flex w-fit items-center gap-1.5 self-end rounded text-base font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:mt-auto"
                >
                  {t("likhit.privacy.guidePrefix")}
                  <Github className="h-4 w-4" aria-hidden="true" />
                  GitHub
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
              <div className="min-w-0">
                <dl aria-labelledby="likhit-privacy-title" className="flex h-full flex-col justify-center rounded-3xl border border-border/60 bg-surface/90 px-6 py-4 backdrop-blur-sm">
                  {REDACTION_TIERS.map((key) => (
                    <div key={key} className="grid grid-cols-[8rem_minmax(0,1fr)] items-baseline gap-4 py-3">
                      <dt>
                        <code className="font-mono text-[15px] text-accent">{key}</code>
                      </dt>
                      <dd className="text-[15px] leading-6 text-muted-foreground">
                        {t(`likhit.privacy.tiersShort.${key}`)}
                        {key === "strict" ? (
                          <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                            {t("likhit.privacy.default")}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* ── OCR: an eyebrow, then the setups as one card. ── */}
        <section aria-labelledby="likhit-ocr-title" className="pt-16 md:pt-24">
          <div className="layout-container">
            {/* An eyebrow, not a section title: the slide titles inside the
                card are the headline here, so a second large title above them
                would compete. */}
            <h2 id="likhit-ocr-title">
              <Eyebrow>{t("likhit.ocr.title")}</Eyebrow>
            </h2>
            <div className="mt-5">
              <OcrRecipes />
            </div>
          </div>
        </section>

        <PitchCard />

        <WhatsNewSection id="likhit-whats-new" heading={t("likhit.whatsNewHeading")} tag="likhit" />
        <div className="pb-16 md:pb-24" />
      </main>
    </div>
  );
};

export default Likhit;
