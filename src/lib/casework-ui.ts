// Shared presentational helpers for the Casework Review portal.
import type { CategoryScore, Disposition, ReviewStatus } from "@/types/casework";

// Escape text interpolated into raw SVG/HTML markup (this module builds SVG
// strings rendered via dangerouslySetInnerHTML). A category like
// "Sourcing & References" or one containing < would otherwise produce invalid
// markup / an injection sink.
function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function scoreBand(score: number | null | undefined): string {
  // CSS custom properties, not hex: this value is interpolated into inline SVG
  // and inline styles, both of which resolve var() against the document.
  if (score == null) return "hsl(var(--muted-foreground))";
  if (score >= 80) return "hsl(var(--success))";
  if (score >= 60) return "hsl(var(--alert))";
  return "hsl(var(--danger))";
}

export function dispositionColor(d: Disposition | null | undefined): string {
  switch (d) {
    case "PASS":
      return "bg-success-strong/10 text-success-strong border-success-strong/25";
    case "REVISE":
      return "bg-alert-strong/10 text-alert-strong border-alert-strong/25";
    case "REJECT":
      return "bg-danger/10 text-danger border-danger/25";
    default:
      return "bg-muted text-foreground border-border";
  }
}

// Stable color per rule category, so the same category reads the same hue
// across the Rules page and review breakdowns. Falls back to a hash for any
// category not explicitly mapped.
const CATEGORY_COLORS: Record<string, string> = {
  Completeness: "bg-tone-sky/10 text-tone-sky border-tone-sky/25",
  Description: "bg-tone-indigo/10 text-tone-indigo border-tone-indigo/25",
  Tone: "bg-tone-violet/10 text-tone-violet border-tone-violet/25",
  Sourcing: "bg-tone-teal/10 text-tone-teal border-tone-teal/25",
  Timeline: "bg-tone-cyan/10 text-tone-cyan border-tone-cyan/25",
  Entities: "bg-tone-emerald/10 text-tone-emerald border-tone-emerald/25",
  Ethics: "bg-tone-rose/10 text-tone-rose border-tone-rose/25",
  Integrity: "bg-tone-amber/10 text-tone-amber border-tone-amber/25",
};

const CATEGORY_FALLBACKS = [
  "bg-muted text-foreground border-border",
  "bg-tone-fuchsia/10 text-tone-fuchsia border-tone-fuchsia/25",
  "bg-tone-lime/10 text-tone-lime border-tone-lime/25",
  "bg-tone-orange/10 text-tone-orange border-tone-orange/25",
];

export function categoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) >>> 0;
  return CATEGORY_FALLBACKS[h % CATEGORY_FALLBACKS.length];
}

// Color for a rule's kind: deterministic (exact check) vs llm (judge).
export function kindColor(kind: "deterministic" | "llm" | string): string {
  return kind === "llm"
    ? "bg-tone-blue/10 text-tone-blue border-tone-blue/25"
    : "bg-muted text-foreground border-border";
}

export function statusColor(s: ReviewStatus): string {
  switch (s) {
    case "done":
      return "bg-success-strong/10 text-success-strong border-success-strong/25";
    case "running":
    case "pending":
      return "bg-info/10 text-info border-info/25";
    case "failed":
      return "bg-danger/10 text-danger border-danger/25";
    default:
      return "bg-muted text-foreground border-border";
  }
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function fmtDur(seconds: number | null | undefined): string {
  if (seconds == null) return "";
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

// Minimal markdown -> HTML (headings, bold, lists, paragraphs). No deps.
export function mdToHtml(md: string): string {
  if (!md) return "";
  const esc = (t: string) =>
    t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#{1,6}\s/.test(line)) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      const level = line.match(/^#+/)![0].length;
      const text = esc(line.replace(/^#+\s/, ""));
      out.push(`<h${level} class="font-semibold mt-2">${text}</h${level}>`);
    } else if (/^[-*]\s/.test(line)) {
      if (!inList) {
        out.push('<ul class="list-disc pl-5 space-y-0.5">');
        inList = true;
      }
      out.push(`<li>${inline(esc(line.replace(/^[-*]\s/, "")))}</li>`);
    } else if (line === "") {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<p>${inline(esc(line))}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

function inline(t: string): string {
  return t
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="px-1 bg-muted rounded">$1</code>');
}

// Pure inline-SVG radar/spider chart of per-category scores (no chart lib).
// Returns an SVG string; render via dangerouslySetInnerHTML. Only meaningful
// with >= 3 dimensions.
export function radarChartSvg(categories: CategoryScore[], size = 320): string {
  const dims = categories.filter((c) => c.category);
  if (dims.length < 3) return "";
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 56;
  const n = dims.length;
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, radius: number) => [
    cx + radius * Math.cos(ang(i)),
    cy + radius * Math.sin(ang(i)),
  ];

  const rings = [0.25, 0.5, 0.75, 1].map((f) => {
    const pts = dims
      .map((_, i) => pt(i, r * f))
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");
    return `<polygon points="${pts}" fill="none" stroke="hsl(var(--border))" stroke-width="1"/>`;
  });

  const spokes = dims
    .map((_, i) => {
      const [x, y] = pt(i, r);
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="hsl(var(--border))" stroke-width="1"/>`;
    })
    .join("");

  const dataPts = dims.map((c, i) => pt(i, (r * Math.max(0, Math.min(100, c.score))) / 100));
  const dataPoly = dataPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  const dots = dataPts
    .map(([x, y], i) => {
      const col = scoreBand(dims[i].score);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${col}"/>`;
    })
    .join("");

  const labels = dims
    .map((c, i) => {
      const [x, y] = pt(i, r + 22);
      const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="11" fill="hsl(var(--muted-foreground))" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(c.category)} <tspan font-weight="700" fill="${scoreBand(c.score)}">${c.score}</tspan></text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${size} ${size}" width="100%" height="${size}" role="img" aria-label="Per-category scores radar chart">
    ${rings.join("")}
    ${spokes}
    <polygon points="${dataPoly}" fill="hsl(var(--chart-1) / 0.18)" stroke="hsl(var(--chart-1))" stroke-width="2"/>
    ${dots}
    ${labels}
  </svg>`;
}
