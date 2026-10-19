import { Github, Globe, Package } from "lucide-react";
import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";

import { Seo } from "@/components/Seo";
import { LikhitCopyButton } from "@/components/likhit/copy-button";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

import "./likhit.css";

// The two places likhit actually lives. Both are outside this site — the package
// is on PyPI and the benchmark is a GitHub Pages build of the likhit repo.
const REPO_URL = "https://github.com/Jawafdehi/likhit";
const PYPI_URL = "https://pypi.org/project/likhit/";
const BENCHMARK_URL = "https://jawafdehi.github.io/likhit/";
const MARKITDOWN_URL = "https://github.com/microsoft/markitdown";
const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`;

// Hand-maintained, and the whole "What's new" section with it. Bump this when a
// release goes out and rewrite likhit.whatsNew.* to match — nothing here reads
// PyPI or the changelog at runtime, by choice: a landing page that fetches a
// third-party API on load to render one version string is a worse trade than
// one line of upkeep per release.
const VERSION = "0.2.0";

const INSTALL_COMMAND = "pip install likhit";

// Four rows, in this order: the coloured square before each one is keyed to its
// position by :nth-child in likhit.css (lilac, marigold, blue, green), matching
// the benchmark. Reordering these re-colours them.
const FEATURES = ["repair", "layout", "ocr", "legacy"] as const;

const WHATS_NEW = ["privacy", "quality", "extraction"] as const;

// Ordered least to most removed, which is the order the tiers themselves are
// defined in — a reader scanning for "what do I get by default" should arrive at
// `strict` last, having seen what it accumulates.
const REDACTION_TIERS = ["none", "identifiers", "contact", "strict"] as const;

const REDACT_COMMANDS = [
  { key: "scan", command: "likhit-redact scan transcripts/ --out report.json" },
  {
    key: "pdf",
    command:
      "likhit-redact pdf charge-sheet.pdf --out redacted.pdf --journal redaction.jsonl",
  },
  {
    key: "tree",
    command:
      "likhit-redact redact transcripts/ --out-tree redacted/ --journal redaction.jsonl",
  },
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
    badgeClass: "lk-badge lk-badge-free",
    commands: `ollama pull qwen2.5vl:7b

# Ollama ignores the key; the client refuses to start without one
export OPENAI_API_KEY=ollama
export OPENAI_BASE_URL=http://127.0.0.1:11434/v1
export MARKITDOWN_OCR_MODEL=qwen2.5vl:7b

likhit-save scanned-notice.pdf --out notice.md`,
  },
  {
    key: "bedrock",
    badgeClass: "lk-badge",
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
    badgeClass: "lk-badge lk-badge-hosted",
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
  <code className="lk-code">{children}</code>
);

const Likhit = () => {
  const { t, i18n } = useTranslation();

  return (
    <div className="likhit-page">
      <Seo
        title={`${t("likhit.meta.title")} | ${SITE_NAME}`}
        description={t("likhit.meta.description")}
        canonicalUrl={`${SITE_URL}/likhit/`}
        language={i18n.language}
      />

      <main id="main-content">
        <section className="lk-intro" aria-labelledby="likhit-title">
          <div className="lk-intro-copy">
            <h1 id="likhit-title">
              {t("likhit.hero.title")}{" "}
              <span className="lk-hl">{t("likhit.hero.titleAccent")}</span>
            </h1>

            <p className="lk-lede">
              <Trans
                i18nKey="likhit.install.lede"
                components={{
                  name: <strong />,
                  doc: <Code />,
                  markitdown: (
                    <a href={MARKITDOWN_URL} target="_blank" rel="noopener noreferrer" />
                  ),
                }}
              />
            </p>

            <div className="lk-install-row">
              <div className="lk-install">
                <code>{INSTALL_COMMAND}</code>
                <LikhitCopyButton
                  value={INSTALL_COMMAND}
                  label={t("likhit.install.copyLabel")}
                />
              </div>

              <a className="lk-version" href={CHANGELOG_URL} target="_blank" rel="noopener noreferrer">
                v{VERSION}
              </a>
            </div>

            <p className="lk-usage">
              <Trans
                i18nKey="likhit.install.usage"
                components={{ api: <Code />, cli: <Code /> }}
              />
            </p>

            <div className="lk-links">
              <a
                className="lk-command-link"
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github aria-hidden="true" />
                {t("likhit.hero.source")}
              </a>
              <a
                className="lk-command-link"
                href={PYPI_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Package aria-hidden="true" />
                {t("likhit.hero.pypi")}
              </a>
              <a
                className="lk-command-link"
                href={BENCHMARK_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe aria-hidden="true" />
                {t("likhit.hero.benchmark")}
              </a>
            </div>
          </div>

          <ul className="lk-features">
            {FEATURES.map((key) => (
              <li key={key}>
                <strong>{t(`likhit.features.${key}.name`)}</strong>
                <span>{t(`likhit.features.${key}.body`)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="lk-whats-new" aria-labelledby="likhit-whats-new-title">
          <div className="lk-whats-new-head">
            <h2 className="lk-section-title" id="likhit-whats-new-title">
              {t("likhit.whatsNew.title")}
              <span className="lk-version-tag">{VERSION}</span>
            </h2>
            <p>{t("likhit.whatsNew.released")}</p>
          </div>

          <ul className="lk-whats-new-list">
            {WHATS_NEW.map((key) => (
              <li key={key}>
                <strong>{t(`likhit.whatsNew.${key}.name`)}</strong>
                <span>
                  <Trans
                    i18nKey={`likhit.whatsNew.${key}.body`}
                    components={{ pkg: <Code />, cli: <Code /> }}
                  />
                </span>
              </li>
            ))}
          </ul>

          <a
            className="lk-command-link"
            href={CHANGELOG_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("likhit.whatsNew.changelog")}
          </a>
        </section>

        <section className="lk-cli" aria-labelledby="likhit-cli-title">
          <div className="lk-cli-copy">
            <h2 className="lk-section-title" id="likhit-cli-title">
              {t("likhit.cli.title")}
            </h2>
            <p>
              <Trans i18nKey="likhit.cli.body" components={{ cmd: <Code /> }} />
            </p>

            {/* The commands below changed behaviour in 0.2.0 and look identical,
                so the page has to say so or a reader copies one and wonders why
                the output has holes in it. */}
            <p className="lk-inline-note">
              <Trans
                i18nKey="likhit.cli.redactNote"
                components={{ tier: <Code />, opt: <Code /> }}
              />
            </p>
          </div>

          <ul className="lk-cli-examples">
            {CLI_EXAMPLES.map(({ key, command }) => (
              <li key={key}>
                <span className="lk-cli-label">{t(`likhit.cli.${key}`)}</span>
                <code>{command}</code>
                <LikhitCopyButton value={command} label={t("likhit.cli.copyCommand")} />
              </li>
            ))}
          </ul>
        </section>

        <section className="lk-privacy" aria-labelledby="likhit-privacy-title">
          <div className="lk-privacy-copy">
            <h2 className="lk-section-title" id="likhit-privacy-title">
              {t("likhit.privacy.title")}
            </h2>
            <p>
              <Trans
                i18nKey="likhit.privacy.body"
                components={{ cmd: <Code />, opt: <Code /> }}
              />
            </p>
          </div>

          <div className="lk-tiers">
            <h3>{t("likhit.privacy.tiersTitle")}</h3>
            <p className="lk-tiers-lede">{t("likhit.privacy.tiersBody")}</p>

            <dl>
              {REDACTION_TIERS.map((key) => (
                <div className="lk-tier" key={key}>
                  <dt>
                    <code>{t(`likhit.privacy.tiers.${key}.name`)}</code>
                  </dt>
                  <dd>{t(`likhit.privacy.tiers.${key}.body`)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="lk-redact-commands">
            <h3>{t("likhit.privacy.commandsTitle")}</h3>

            <ul className="lk-cli-examples">
              {REDACT_COMMANDS.map(({ key, command }) => (
                <li key={key}>
                  <span className="lk-cli-label">{t(`likhit.privacy.${key}`)}</span>
                  <code>{command}</code>
                  <LikhitCopyButton
                    value={command}
                    label={t("likhit.privacy.copyCommand")}
                  />
                </li>
              ))}
            </ul>
          </div>

        </section>

        <section className="lk-ocr" aria-labelledby="likhit-ocr-title">
          <div className="lk-ocr-copy">
            <h2 className="lk-section-title" id="likhit-ocr-title">
              {t("likhit.ocr.title")}
            </h2>
            <p>{t("likhit.ocr.body")}</p>
            <p>
              <Trans
                i18nKey="likhit.ocr.note"
                components={{ baseUrl: <Code />, apiKey: <Code />, model: <Code /> }}
              />
            </p>
          </div>

          {/* Each recipe is sticky at a slightly lower offset than the one
              before, so scrolling deals them into a pile instead of running them
              past. The offsets and the depth are in likhit.css — nothing here
              listens to scroll. */}
          <div className="lk-recipes">
            {OCR_RECIPES.map(({ key, badgeClass, commands }) => (
              <article className="lk-recipe" key={key}>
                <header className="lk-recipe-head">
                  <span className={badgeClass}>{t(`likhit.ocr.${key}.badge`)}</span>
                  <h3>{t(`likhit.ocr.${key}.name`)}</h3>
                  <p>{t(`likhit.ocr.${key}.body`)}</p>
                </header>

                <pre className="lk-commands">{commands}</pre>

                <LikhitCopyButton value={commands} label={t("likhit.ocr.copyRecipe")} />

                {key === "bedrock" ? (
                  <p className="lk-footnote">{t("likhit.ocr.bedrock.footnote")}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
};

export default Likhit;
