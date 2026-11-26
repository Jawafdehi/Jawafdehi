import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CaseSectionHeading } from "@/components/case-detail/case-section-heading";
import { DocumentPreviewDialog, type PreviewDocument } from "@/components/DocumentPreviewDialog";
import { DocumentSourceCard } from "@/components/DocumentSourceCard";
import { ChevronDown, FileText, Lock } from "@/components/icons";
import { chipVariants } from "@/components/ui/chip";
import {
  EVIDENCE_GROUPS,
  buildEvidenceRow,
  sortByDate,
  type EvidenceGroup,
} from "@/lib/evidence-sources";
import { cn } from "@/lib/utils";
import type { EvidenceEntry } from "@/types/jds";
import { toNepaliDigits } from "@/utils/name-summary";

interface EvidenceSectionProps {
  evidence: EvidenceEntry[];
  title: string;
}

/** Rows a group shows before "show the rest". */
export const GROUP_PREVIEW_ROWS = 5;

type View = "type" | "date";

const GROUP_DOT: Record<EvidenceGroup, string> = {
  court: "bg-tone-blue",
  charge: "bg-tone-red",
  document: "bg-muted-foreground",
  news: "bg-tone-amber",
  social: "bg-tone-pink",
  law: "bg-tone-indigo",
};

export function EvidenceSection({ evidence, title }: Readonly<EvidenceSectionProps>) {
  const { t, i18n } = useTranslation();
  const ne = (i18n.language ?? "ne").startsWith("ne");
  const num = (n: number) => (ne ? toNepaliDigits(n) : String(n));

  const rows = useMemo(() => evidence.map((entry, index) => buildEvidenceRow(entry, index)), [evidence]);
  const [view, setView] = useState<View>("type");
  const [filter, setFilter] = useState<EvidenceGroup | "all">("all");
  const [expanded, setExpanded] = useState<Partial<Record<EvidenceGroup, boolean>>>({});
  const [previewDocument, setPreviewDocument] = useState<PreviewDocument | null>(null);

  if (rows.length === 0) return null;

  const counts = EVIDENCE_GROUPS.map((group) => ({ group, count: rows.filter((r) => r.group === group).length })).filter(
    (g) => g.count > 0,
  );
  const visible = filter === "all" ? rows : rows.filter((r) => r.group === filter);
  const readable = rows.filter((r) => r.actions.length > 0).length;
  const pending = rows.filter((r) => r.withheld === "all").length;
  const showFilters = counts.length > 1;

  const renderRows = (list: typeof rows, showGroup: boolean) => (
    <ol className="list-none">
      {list.map((row) => (
        <DocumentSourceCard key={row.key} row={row} showGroup={showGroup} onPreview={setPreviewDocument} />
      ))}
    </ol>
  );

  return (
    <section id="evidence" className="mb-16 scroll-mt-28">
      <CaseSectionHeading className="mb-2">
        {title}
        <span className="ml-3 align-middle text-sm font-normal text-muted-foreground">
          {t("caseSources.count", { count: rows.length, n: num(rows.length) })}
        </span>
      </CaseSectionHeading>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-4 w-4" aria-hidden="true" />
            {t("caseSources.readable", { n: num(readable) })}
          </span>
          {pending > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              {t("caseSources.pendingCount", { n: num(pending) })}
            </span>
          ) : null}
        </p>
        {showFilters ? (
          <div
            className="inline-flex shrink-0 rounded-full bg-muted p-0.5 print:hidden"
            role="group"
            aria-label={t("caseSources.orderLabel")}
          >
            {(["type", "date"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1 text-[13px] transition-colors",
                  view === v ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-primary",
                )}
              >
                {t(`caseSources.view.${v}`)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {showFilters ? (
        <div
          className="-mx-1 mb-1 flex gap-1 overflow-x-auto border-b border-border/70 px-1 pb-3 [scrollbar-width:none] print:hidden md:flex-wrap md:overflow-visible"
          role="group"
          aria-label={t("caseSources.filterLabel")}
        >
          {[{ group: "all" as const, count: rows.length }, ...counts].map(({ group, count }) => (
            <button
              key={group}
              type="button"
              aria-pressed={filter === group}
              onClick={() => setFilter(group)}
              className={cn(chipVariants({ active: filter === group }), "h-8 px-3 text-[13.5px]")}
            >
              {group === "all" ? t("caseSources.all") : t(`caseSources.group.${group}`)}
              <span className="opacity-60">{num(count)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {view === "date" || !showFilters ? (
        renderRows(sortByDate(visible), showFilters)
      ) : (
        EVIDENCE_GROUPS.map((group) => {
          const groupRows = sortByDate(visible.filter((r) => r.group === group));
          if (groupRows.length === 0) return null;
          const open = filter !== "all" || expanded[group] || groupRows.length <= GROUP_PREVIEW_ROWS + 1;
          const shown = open ? groupRows : groupRows.slice(0, GROUP_PREVIEW_ROWS);
          return (
            <div key={group} className="mt-6 first:mt-4">
              <h3 className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", GROUP_DOT[group])} aria-hidden="true" />
                {t(`caseSources.group.${group}`)}
                <span className="font-normal">{num(groupRows.length)}</span>
              </h3>
              {renderRows(shown, false)}
              {shown.length < groupRows.length ? (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [group]: true }))}
                  className="mt-1 inline-flex items-center gap-1 py-2 text-sm text-tone-blue hover:underline print:hidden"
                >
                  {t("caseSources.showRest", { n: num(groupRows.length - shown.length) })}
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          );
        })
      )}

      {pending > 0 || rows.some((r) => r.withheld === "pdf") ? (
        <p className="mt-5 max-w-3xl text-[12.5px] leading-6 text-muted-foreground">{t("caseSources.legend")}</p>
      ) : null}

      <DocumentPreviewDialog
        document={previewDocument}
        open={Boolean(previewDocument)}
        onOpenChange={(open) => {
          if (!open) setPreviewDocument(null);
        }}
      />
    </section>
  );
}
