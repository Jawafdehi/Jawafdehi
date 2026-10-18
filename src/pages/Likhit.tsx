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

const INSTALL_COMMAND = "pip install likhit";

// Four rows, in this order: the coloured square before each one is keyed to its
// position by :nth-child in likhit.css (lilac, marigold, blue, green), matching
// the benchmark. Reordering these re-colours them.
const FEATURES = ["repair", "layout", "ocr", "legacy"] as const;

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

            <div className="lk-install">
              <code>{INSTALL_COMMAND}</code>
              <LikhitCopyButton
                value={INSTALL_COMMAND}
                label={t("likhit.install.copyLabel")}
              />
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

        <section className="lk-cli" aria-labelledby="likhit-cli-title">
          <div className="lk-cli-copy">
            <h2 className="lk-section-title" id="likhit-cli-title">
              {t("likhit.cli.title")}
            </h2>
            <p>
              <Trans i18nKey="likhit.cli.body" components={{ cmd: <Code /> }} />
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
