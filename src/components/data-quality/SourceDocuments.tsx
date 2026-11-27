import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { getSourceDocumentStats } from "@/services/jds-api";
import {
  PDF_STATES,
  REDACTED_BY,
  SCOPES,
  TEXT_KINDS,
  TRANSCRIPT_STATES,
  WITHHELD_REASONS,
  formatAsOf,
  groupRows,
  segments,
  sharePct,
  type PdfState,
  type Scope,
  type Segment,
  type SourceDocBlock,
} from "@/lib/source-documents";
import { formatCount } from "@/utils/number";

/** One colour per public-file state; the bar and the legend share it. */
const PDF_COLOR: Record<PdfState, string> = {
  redacted: "bg-success",
  withheld: "bg-tone-amber",
  not_yet_redacted: "bg-alert",
  publisher_hosted: "bg-tone-blue",
  no_file: "bg-muted-foreground/40",
};

function usePct(language: string) {
  // A share that rounds down to 0 but is not empty reads "<0.1%", never "0%".
  return (pct: number, count?: number) =>
    pct === 0 && count
      ? `<${formatCount(0.1, undefined, language)}%`
      : `${formatCount(pct, { maximumFractionDigits: 1 }, language)}%`;
}

/** A 100%-wide bar split into the given segments, in order. */
function StackedBar({
  parts,
  label,
}: Readonly<{ parts: { key: string; pct: number; className: string }[]; label: string }>) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
    >
      {parts
        .filter((p) => p.pct > 0)
        .map((p) => (
          <div
            key={p.key}
            className={`h-full ${p.className}`}
            // A sliver under 0.5% still gets a visible hairline.
            style={{ width: `${Math.max(p.pct, 0.5)}%` }}
          />
        ))}
    </div>
  );
}

function CountRow({
  label,
  count,
  pct,
  swatch,
  indent = false,
  language,
}: Readonly<{
  label: string;
  count: number;
  pct?: number;
  swatch?: string;
  indent?: boolean;
  language: string;
}>) {
  const fmtPct = usePct(language);
  return (
    <li
      className={`flex items-baseline justify-between gap-3 py-1.5 ${
        indent ? "ps-6 text-sm text-muted-foreground" : "text-[15px] text-foreground"
      }`}
    >
      <span className="flex items-baseline gap-2">
        {swatch && (
          <span
            aria-hidden="true"
            className={`inline-block h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-sm ${swatch}`}
          />
        )}
        {label}
      </span>
      <span className="shrink-0 tabular-nums">
        <span className={indent ? "" : "font-semibold"}>{formatCount(count, undefined, language)}</span>
        {pct !== undefined && (
          <span className="ms-2 inline-block min-w-[3.5rem] text-end text-sm text-muted-foreground">
            {fmtPct(pct, count)}
          </span>
        )}
      </span>
    </li>
  );
}

function RedactionPanel({ block, language }: Readonly<{ block: SourceDocBlock; language: string }>) {
  const { t } = useTranslation();
  const pdf = segments(block.pdf, PDF_STATES, block.total);
  const sub: Partial<Record<PdfState, Segment<string>[]>> = {
    redacted: segments(block.redacted_by, REDACTED_BY, block.total, true).map((s) => ({
      ...s,
      key: `redactedBy.${s.key}`,
    })),
    withheld: segments(block.withheld_reasons, WITHHELD_REASONS, block.total, true).map((s) => ({
      ...s,
      key: `withheldReason.${s.key}`,
    })),
  };
  const transcript = segments(block.transcript, TRANSCRIPT_STATES, block.total);
  const label = pdf
    .map((s) => `${t(`dataQuality.sourceDocs.pdf.${s.key}`)} ${formatCount(s.count)}`)
    .join(", ");

  return (
    <div>
      <h3 className="font-card-title">{t("dataQuality.sourceDocs.redaction.heading")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("dataQuality.sourceDocs.redaction.summary", {
          redacted: formatCount(block.pdf.redacted, undefined, language),
          withheld: formatCount(block.pdf.withheld, undefined, language),
          total: formatCount(block.total, undefined, language),
        })}
      </p>
      <div className="mt-4">
        <StackedBar
          label={label}
          parts={pdf.map((s) => ({ key: s.key, pct: s.pct, className: PDF_COLOR[s.key] }))}
        />
      </div>
      <ul className="mt-3 divide-y divide-border">
        {pdf.map((s) => (
          <li key={s.key}>
            <ul>
              <CountRow
                label={t(`dataQuality.sourceDocs.pdf.${s.key}`)}
                count={s.count}
                pct={s.pct}
                swatch={PDF_COLOR[s.key]}
                language={language}
              />
              {(sub[s.key] ?? []).map((row) => (
                <CountRow
                  key={row.key}
                  label={t(`dataQuality.sourceDocs.${row.key}`)}
                  count={row.count}
                  indent
                  language={language}
                />
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <h4 className="mt-6 text-[15px] font-semibold text-foreground">
        {t("dataQuality.sourceDocs.transcript.heading")}
      </h4>
      <ul className="mt-1 divide-y divide-border">
        {transcript.map((s) => (
          <CountRow
            key={s.key}
            label={t(`dataQuality.sourceDocs.transcript.${s.key}`)}
            count={s.count}
            pct={s.pct}
            language={language}
          />
        ))}
      </ul>
    </div>
  );
}

function TextPanel({ block, language }: Readonly<{ block: SourceDocBlock; language: string }>) {
  const { t } = useTranslation();
  const fmtPct = usePct(language);
  const withText = block.text.with_text;
  const pct = sharePct(withText, block.total);
  const kinds = segments(block.text.by_kind, TEXT_KINDS, withText, true);
  const max = Math.max(...kinds.map((k) => k.count), 1);

  return (
    <div>
      <h3 className="font-card-title">{t("dataQuality.sourceDocs.text.heading")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("dataQuality.sourceDocs.text.summary", {
          part: formatCount(withText, undefined, language),
          total: formatCount(block.total, undefined, language),
        })}
      </p>
      <p className="mt-3 text-4xl font-semibold tabular-nums text-foreground">
        {fmtPct(pct, withText)}
      </p>
      <div className="mt-3">
        <StackedBar
          label={t("dataQuality.sourceDocs.text.barLabel", {
            pct: fmtPct(pct, withText),
          })}
          parts={[{ key: "with", pct, className: "bg-accent" }]}
        />
      </div>
      <p className="mt-6 text-[15px] font-semibold text-foreground">
        {t("dataQuality.sourceDocs.text.byKind")}
      </p>
      <ul className="mt-2 space-y-3">
        {kinds.map((k) => (
          <li key={k.key}>
            <div className="flex items-baseline justify-between gap-3 text-[15px]">
              <span>{t(`dataQuality.sourceDocs.kind.${k.key}`)}</span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold">{formatCount(k.count, undefined, language)}</span>
                <span className="ms-2 inline-block min-w-[3.5rem] text-end text-sm text-muted-foreground">
                  {fmtPct(k.pct, k.count)}
                </span>
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className="h-full rounded-full bg-accent/70"
                style={{ width: `${(k.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">
        {t("dataQuality.sourceDocs.text.without", {
          n: formatCount(block.text.without_text, undefined, language),
        })}
      </p>
    </div>
  );
}

function GroupTable({ block, language }: Readonly<{ block: SourceDocBlock; language: string }>) {
  const { t } = useTranslation();
  const fmtPct = usePct(language);
  const rows = groupRows(block);
  const n = (v: number) => formatCount(v, undefined, language);
  return (
    <div>
      <h3 className="font-card-title">{t("dataQuality.sourceDocs.groups.heading")}</h3>
      {/* Phones: one block per group, so no column scrolls out of view. */}
      <ul className="mt-3 divide-y divide-border border-y border-border sm:hidden">
        {rows.map((row) => (
          <li key={row.group} className="py-3">
            <p className="text-[15px] font-semibold text-foreground">
              {t(`dataQuality.sourceDocs.group.${row.group}`)}
            </p>
            <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {(
                [
                  ["total", n(row.total)],
                  ["withText", row.total ? fmtPct(sharePct(row.with_text, row.total), row.with_text) : "—"],
                  ["redacted", n(row.redacted_pdf)],
                  ["withheld", n(row.withheld)],
                ] as const
              ).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t(`dataQuality.sourceDocs.groups.${key}`)}</dt>
                  <dd className="tabular-nums text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <div className="mt-3 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[34rem] text-[15px]">
          <thead>
            <tr className="border-b border-border text-start text-sm text-muted-foreground">
              <th scope="col" className="py-2 pe-3 text-start font-normal">
                {t("dataQuality.sourceDocs.groups.type")}
              </th>
              <th scope="col" className="px-3 py-2 text-end font-normal">
                {t("dataQuality.sourceDocs.groups.total")}
              </th>
              <th scope="col" className="px-3 py-2 text-end font-normal">
                {t("dataQuality.sourceDocs.groups.withText")}
              </th>
              <th scope="col" className="px-3 py-2 text-end font-normal">
                {t("dataQuality.sourceDocs.groups.redacted")}
              </th>
              <th scope="col" className="ps-3 py-2 text-end font-normal">
                {t("dataQuality.sourceDocs.groups.withheld")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.group}>
                <th scope="row" className="py-2 pe-3 text-start font-normal">
                  {t(`dataQuality.sourceDocs.group.${row.group}`)}
                </th>
                <td className="px-3 py-2 text-end tabular-nums">{n(row.total)}</td>
                <td className="px-3 py-2 text-end tabular-nums">
                  {row.total ? fmtPct(sharePct(row.with_text, row.total), row.with_text) : "—"}
                </td>
                <td className="px-3 py-2 text-end tabular-nums">{n(row.redacted_pdf)}</td>
                <td className="ps-3 py-2 text-end tabular-nums">{n(row.withheld)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const EXPLAIN = ["redacted", "withheld", "notYet", "publisher", "text"] as const;

/**
 * "Source documents: redaction and readable text". How far the archive's
 * documents have been made safe to publish (a redacted copy, or withheld until
 * one exists) and how much of them we can read, for the sources of published
 * cases and for the whole archive. Hidden when the API has no snapshot.
 */
export function SourceDocuments() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [scope, setScope] = useState<Scope>("published_cases");
  const { data } = useQuery({
    queryKey: ["source-document-stats"],
    queryFn: getSourceDocumentStats,
    staleTime: 10 * 60 * 1000,
  });
  if (!data) return null;
  const block = data.scopes[scope];
  const asOf = formatAsOf(data.as_of, language);

  return (
    <section className="border-t border-border pt-10" aria-labelledby="source-docs-heading">
      <h2 id="source-docs-heading" className="font-case-section-title">
        {t("dataQuality.sourceDocs.heading")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t("dataQuality.sourceDocs.description")}
      </p>
      {asOf && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("dataQuality.sourceDocs.asOf", { date: asOf })}
        </p>
      )}

      <div
        role="group"
        aria-label={t("dataQuality.sourceDocs.scope.label")}
        className="mt-5 flex flex-wrap gap-2"
      >
        {SCOPES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={scope === s}
            onClick={() => setScope(s)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              scope === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-muted/70"
            }`}
          >
            {t(`dataQuality.sourceDocs.scope.${s}`)}{" "}
            <span className="tabular-nums opacity-80">
              ({formatCount(data.scopes[s].total, undefined, language)})
            </span>
          </button>
        ))}
      </div>
      {scope === "published_cases" && block.cases !== null && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("dataQuality.sourceDocs.scope.publishedNote", {
            cases: formatCount(block.cases, undefined, language),
          })}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
        <RedactionPanel block={block} language={language} />
        <TextPanel block={block} language={language} />
      </div>

      <div className="mt-10">
        <GroupTable block={block} language={language} />
      </div>

      <div className="mt-10 max-w-3xl rounded-lg bg-muted/60 p-5 md:p-6">
        <h3 className="font-card-title">{t("dataQuality.sourceDocs.explain.heading")}</h3>
        <dl className="mt-3 space-y-3 text-sm leading-6">
          {EXPLAIN.map((key) => (
            <div key={key}>
              <dt className="font-semibold text-foreground">
                {t(`dataQuality.sourceDocs.explain.${key}.term`)}
              </dt>
              <dd className="text-muted-foreground">
                {t(`dataQuality.sourceDocs.explain.${key}.body`)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-6 text-foreground">
          {t("dataQuality.sourceDocs.explain.why")}
        </p>
      </div>
    </section>
  );
}
