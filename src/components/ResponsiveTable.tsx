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

function convertMarkdownToHtml(markdown: string): string {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const escapeAttribute = (value: string) =>
    escapeHtml(value)
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  const getSafeLinkHref = (value: string) => {
    const trimmed = value.trim();
    const isSafeHref = /^(https?:\/\/|\/(?!\/)|\.{1,2}\/|#)/i.test(trimmed);

    return isSafeHref ? escapeAttribute(trimmed) : '#';
  };

  const renderInline = (value: string) =>
    escapeHtml(value)
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, (_, text: string, url: string) => {
        const href = getSafeLinkHref(url);
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      })
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  const isCustomMarkerLine = (line: string) =>
    /^\s*([A-Za-z]|[०-९0-9]+|[क-ह])[.)]+\s+/.test(line);

  const renderCustomMarkerLine = (line: string) => {
    const match = line.match(/^\s*((?:[A-Za-z]|[०-९0-9]+|[क-ह])[.)]+)\s+(.+)$/);
    if (!match) return '';

    return (
      '<div class="custom-marker-list-item">' +
      `<span class="custom-marker-list-marker">${renderInline(match[1])}</span>` +
      `<span class="custom-marker-list-content">${renderInline(match[2])}</span>` +
      '</div>'
    );
  };

  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];

  for (let i = 0; i < lines.length;) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      blocks.push(`<h${heading[1].length}>${renderInline(heading[2])}</h${heading[1].length}>`);
      i += 1;
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^\s*-\s+/, ''))}</li>`);
        i += 1;
      }
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`);
        i += 1;
      }
      blocks.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    if (isCustomMarkerLine(line)) {
      const items: string[] = [];
      while (i < lines.length && isCustomMarkerLine(lines[i])) {
        items.push(renderCustomMarkerLine(lines[i]));
        i += 1;
      }
      blocks.push(`<div class="custom-marker-list">${items.join('')}</div>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(renderInline(lines[i].replace(/^>\s?/, '')));
        i += 1;
      }
      blocks.push(`<blockquote>${quoteLines.join('<br>')}</blockquote>`);
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*-\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !isCustomMarkerLine(lines[i]) &&
      !/^>\s?/.test(lines[i])
    ) {
      paragraphLines.push(renderInline(lines[i]));
      i += 1;
    }
    blocks.push(`<p>${paragraphLines.join('<br>')}</p>`);
  }

  return blocks.join('');
}

function isHtmlContent(content: string): boolean {
  return /<\s*[a-zA-Z][a-zA-Z0-9]*[\s>]/.test(content);
}

function prepareHtml(content: string): string {
  if (!content) return '';

  if (isHtmlContent(content)) {
    return content;
  }

  return convertMarkdownToHtml(content);
}

const PROSE_BASE = 'prose prose-sm sm:prose-base max-w-none text-base md:text-lg font-normal leading-[1.7] text-primary/75 prose-p:text-primary/75 prose-p:leading-[1.7] prose-li:text-primary/75 prose-li:leading-[1.7] prose-headings:text-primary';

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ html }) => {
  const processedHtml = useMemo(() => prepareHtml(html), [html]);

  const { before, table, after } = useMemo(
    () => parseHtmlContent(processedHtml),
    [processedHtml]
  );

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
        .custom-marker-list {
          display: grid;
          gap: 0.45rem;
          margin: 0.75rem 0;
        }
        .custom-marker-list-item {
          display: grid;
          grid-template-columns: max-content minmax(0, 1fr);
          column-gap: 0.45rem;
          align-items: start;
        }
        .custom-marker-list-marker {
          color: hsl(var(--primary) / 0.75);
          font-weight: 500;
        }
        .custom-marker-list-content {
          min-width: 0;
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

      {before && (
        <div
          className={`${PROSE_BASE} mb-4`}
          dangerouslySetInnerHTML={{ __html: before }}
        />
      )}

      {table && (
        <div
          className="table-scroll-wrapper overflow-x-auto -mx-4 px-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            className="[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_th]:bg-gradient-to-b [&_th]:from-muted [&_th]:to-muted/80 [&_th]:font-semibold [&_th]:text-xs [&_th]:text-foreground [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-base md:[&_td]:text-lg [&_td]:font-normal [&_td]:leading-[1.7] [&_td]:text-primary/75 [&_tr:nth-child(even)]:bg-muted/40 [&_tr:hover]:bg-muted/60 [&_tr]:transition-colors [&_caption]:text-sm [&_caption]:font-semibold [&_caption]:mb-3 [&_caption]:text-foreground sm:[&_th]:px-3 sm:[&_th]:py-3 sm:[&_th]:text-sm"
            dangerouslySetInnerHTML={{ __html: table }}
          />
        </div>
      )}

      {after && (
        <div
          className={`${PROSE_BASE} mt-4`}
          dangerouslySetInnerHTML={{ __html: after }}
        />
      )}
    </div>
  );
};
