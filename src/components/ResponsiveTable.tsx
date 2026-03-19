import React, { useMemo } from 'react';

interface ResponsiveTableProps {
  html: string;
}

interface ParsedContent {
  before: string;
  table: string | null;
  after: string;
}

function parseHtmlContent(html: string): ParsedContent {
  const tableRegex = /<table[\s\S]*<\/table>/i;
  const match = html.match(tableRegex);

  if (!match || match.index === undefined) {
    return { before: html, table: null, after: '' };
  }

  const before = html.slice(0, match.index).trim();
  const table = match[0];
  const after = html.slice(match.index + table.length).trim();

  return { before, table, after };
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ html }) => {
  const { before, table, after } = useMemo(() => parseHtmlContent(html), [html]);

  return (
    <div className="w-full">
      <style>{`
        .table-scroll-wrapper::-webkit-scrollbar {
          display: none;
        }
        .table-scroll-wrapper {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        @media (max-width: 639px) {
          .table-scroll-wrapper table {
            table-layout: auto;
          }
          .table-scroll-wrapper td,
          .table-scroll-wrapper th {
            white-space: nowrap;
            font-size: 11px;
            padding: 4px 6px;
          }
        }
      `}</style>

      {/* Text content before table */}
      {before && (
        <div
          className="prose-content text-muted-foreground leading-relaxed mb-4 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:space-y-2 [&_ul]:my-4 [&_li]:ml-6 [&_li]:pl-2 [&_a]:underline [&_strong]:font-semibold [&_em]:italic [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_br]:block"
          dangerouslySetInnerHTML={{ __html: before }}
        />
      )}

      {/* Responsive table wrapper */}
      {table && (
        <div
          className="table-scroll-wrapper overflow-x-auto -mx-4 px-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            className="[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_th]:bg-gradient-to-b [&_th]:from-muted [&_th]:to-muted/80 [&_th]:font-semibold [&_th]:text-xs [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-xs [&_tr:nth-child(even)]:bg-muted/40 [&_tr:hover]:bg-muted/60 [&_tr]:transition-colors [&_caption]:text-sm [&_caption]:font-semibold [&_caption]:mb-3 [&_caption]:text-foreground [&_p]:mb-0 [&_p]:text-sm sm:[&_th]:px-3 sm:[&_th]:py-3 sm:[&_th]:text-sm sm:[&_td]:px-3 sm:[&_td]:py-2.5 sm:[&_td]:text-sm"
            dangerouslySetInnerHTML={{ __html: table }}
          />
        </div>
      )}

      {/* Text content after table */}
      {after && (
        <div
          className="prose-content text-muted-foreground leading-relaxed mt-4 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:space-y-2 [&_ul]:my-4 [&_li]:ml-6 [&_li]:pl-2 [&_a]:underline [&_strong]:font-semibold [&_em]:italic [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1"
          dangerouslySetInnerHTML={{ __html: after }}
        />
      )}
    </div>
  );
};
