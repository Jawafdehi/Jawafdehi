import React, { useMemo } from 'react';

interface ResponsiveTableProps {
  html: string;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ html }) => {
  const { textContent, tableContent } = useMemo(() => {
    // Split HTML into text before table and table content
    const tableMatch = html.match(/(<table[\s\S]*?<\/table>)/i);
    
    if (!tableMatch) {
      return { textContent: html, tableContent: null };
    }

    const table = tableMatch[0];
    const text = html.replace(table, '').trim();
    
    return { textContent: text, tableContent: table };
  }, [html]);

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
      {textContent && (
        <div
          className="text-muted-foreground leading-relaxed mb-4 [&_a]:underline [&_p]:-mb-4 [&_p:last-child]:mb-0 [&_ul]:space-y-2 [&_ul]:my-4 [&_li]:ml-6 [&_li]:pl-2"
          dangerouslySetInnerHTML={{ __html: textContent }}
        />
      )}

      {/* Responsive table wrapper */}
      {tableContent && (
        <div
          className="table-scroll-wrapper overflow-x-auto -mx-4 px-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            className="[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_th]:bg-gradient-to-b [&_th]:from-muted [&_th]:to-muted/80 [&_th]:font-semibold [&_th]:text-xs [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-xs [&_tr:nth-child(even)]:bg-muted/40 [&_tr:hover]:bg-muted/60 [&_tr]:transition-colors [&_caption]:text-sm [&_caption]:font-semibold [&_caption]:mb-3 [&_caption]:text-foreground [&_p]:mb-0 [&_p]:text-sm sm:[&_th]:px-3 sm:[&_th]:py-3 sm:[&_th]:text-sm sm:[&_td]:px-3 sm:[&_td]:py-2.5 sm:[&_td]:text-sm"
            dangerouslySetInnerHTML={{ __html: tableContent }}
          />
        </div>
      )}
    </div>
  );
};
