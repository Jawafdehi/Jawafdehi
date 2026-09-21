import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// A case runs through its forums in sequence, so on screen the stages form
// a horizontal row of connected stage markers rather than a stack of rows.
//
// Two things make that rail work, and jsdom computes no layout to check either
// of them, so they are guarded at the source level here:
//
//  1. The scroll container is capped by its grid column (the width the Related
//     Court Cases panel spans) while the track inside it is free to run wider.
//     Miss the second half and the track is capped too: the nodes compress
//     until a seven-forum case is seven unreadable slivers, and nothing ever
//     scrolls.
//  2. The rail stays OUT of `.case-dossier-facts`, whose
//     `grid-template-columns: 190px minmax(0, 1fr)` would squeeze the whole
//     timeline into the 190px label track. That is the shape the previous
//     stacked-row layout was fighting, and it is one careless move away.
//
// The DOM half of (2) is asserted against a real render in
// case-detail-banner.test.tsx.

const SRC = resolve(process.cwd(), 'src');
const css = readFileSync(resolve(SRC, 'components/case-detail/case-dossier.css'), 'utf8');
const component = readFileSync(resolve(SRC, 'components/case-detail/case-stage-dates.tsx'), 'utf8');
const banner = readFileSync(resolve(SRC, 'components/case-detail/case-detail-banner.tsx'), 'utf8');

// Whitespace-tolerant so reformatting the stylesheet doesn't fail these.
const rule = (selector: string) =>
  new RegExp(`${selector.replace(/[.>*[\]="-]/g, '\\$&')}\\s*\\{([^}]*)\\}`);

describe('case dossier stage timeline', () => {
  it('scrolls the rail sideways instead of letting it widen the page', () => {
    const match = css.match(rule('.case-stage-timeline'));

    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/overflow-x:\s*auto/);
    // Without this a grid item refuses to shrink below its content, so the
    // rail would stretch the whole dossier column and scroll the PAGE.
    expect(match![1]).toMatch(/min-width:\s*0/);
  });

  it('keeps one stage compact and lets longer histories scroll', () => {
    const match = css.match(rule('.case-stage-track'));

    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/display:\s*flex/);
    expect(match![1]).toMatch(/width:\s*max-content/);
    expect(css.match(rule('.case-stage-node'))![1]).toMatch(/flex:\s*0 0 270px/);
    expect(component).toContain('data-single');
    expect(css.match(rule('.case-stage-timeline-wrap[data-single="true"] .case-stage-track'))![1])
      .toMatch(/width:\s*min\(100%,\s*22rem\)/);
    expect(css.match(rule('.case-stage-timeline-wrap[data-single="true"] .case-stage-node'))![1])
      .toMatch(/flex:\s*1 0 0/);
  });

  it('does not route the timeline back through the fact-row template', () => {
    // `.case-dossier-facts > div` is `190px minmax(0, 1fr)`. Any descendant
    // selector putting the rail back under that grid re-creates the squeeze.
    expect(css).not.toMatch(/\.case-dossier-facts\s*>\s*\.case-stage-timeline/);
    expect(banner).toMatch(/case-dossier-facts/);
    // The rail is emitted after the facts grid has closed, as its own block.
    const facts = banner.indexOf('case-dossier-facts');
    const timeline = banner.indexOf('<CaseStageDates');
    expect(facts).toBeGreaterThan(-1);
    expect(timeline).toBeGreaterThan(facts);
  });

  it('starts steps at the left with horizontal connectors but no vertical rule or top divider', () => {
    expect(component).toContain('StageStepMarker');
    expect(component).toContain('case-stage-connector');
    expect(css).not.toContain('case-stage-rail');
    expect(css.match(rule('.case-stage-timeline'))![1]).not.toMatch(/border-top/);
    expect(css.match(rule('.case-stage-node'))![1]).not.toMatch(/border-left/);
    expect(css.match(rule('.case-stage-node'))![1]).toMatch(/text-align:\s*left/);
  });

  it('marks a pending stage differently from a concluded one', () => {
    expect(css).toMatch(/\.case-stage-node\[data-pending="true"\] \.case-stage-dot,\s*\.case-stage-node\[data-pending="true"\] \.case-stage-connector\s*\{[^}]*background:/);
    expect(component).toContain('data-pending');
  });

  it('keeps the scrolling region reachable by keyboard', () => {
    expect(component).toMatch(/tabIndex=\{views\.length > 1 \? 0 : undefined\}/);
    // A focusable div with no visible focus ring is a trap for sighted
    // keyboard users, who cannot tell where they are.
    expect(css).toMatch(/\.case-stage-timeline:focus-visible\s*\{[^}]*outline:/);
  });

  it('keeps the print variant on stacked rows, not a rail that cannot scroll', () => {
    expect(component).toContain('case-stage-rows');
    expect(component).toMatch(/variant === "compact"/);
  });

  it('keeps the date prominent within the banner type scale', () => {
    const eyebrow = css.match(rule('.case-stage-eyebrow'));
    const date = css.match(rule('.case-stage-date'));

    expect(eyebrow).not.toBeNull();
    expect(date).not.toBeNull();

    expect(date![1]).toMatch(/color:\s*hsl\(var\(--primary\)\)/);
    expect(eyebrow![1]).toMatch(/color:\s*hsl\(var\(--muted-foreground\)\)/);
  });

  it('uses the stage label in its natural capitalization', () => {
    expect(css.match(rule('.case-stage-eyebrow'))![1]).not.toMatch(/text-transform|letter-spacing/);
  });

  it('names the timeline for screen readers without a visible title', () => {
    expect(banner).not.toContain('caseDetail.caseTimeline');
    expect(component).toContain('caseDetail.caseTimeline');
    expect(component).not.toContain('case-stage-heading');
    expect(component).toMatch(/aria-label=/);
  });

  it('fades whichever edge still has rail behind it', () => {
    // Overlay scrollbars (macOS, every touch device) are invisible until you
    // are already scrolling, so a clipped eight-stage rail read as a complete
    // five-stage one. The fades are the only thing saying otherwise.
    expect(css).toMatch(
      /\.case-stage-timeline-wrap\[data-overflow-start="true"\]::before\s*\{[^}]*opacity:\s*1/,
    );
    expect(css).toMatch(
      /\.case-stage-timeline-wrap\[data-overflow-end="true"\]::after\s*\{[^}]*opacity:\s*1/,
    );
    // Default hidden, so a case whose stages all fit advertises no scroll.
    const base = css.match(
      /\.case-stage-timeline-wrap::before,\s*\.case-stage-timeline-wrap::after\s*\{([^}]*)\}/,
    );
    expect(base).not.toBeNull();
    expect(base![1]).toMatch(/opacity:\s*0/);
    // A fade over the content must never eat the pointer.
    expect(base![1]).toMatch(/pointer-events:\s*none/);
  });

  it('hangs the fades on a wrapper, not on the scroller itself', () => {
    // A pseudo-element on the scroll container is positioned against the
    // scrolled content and slides away with it instead of staying pinned.
    expect(css).toMatch(/\.case-stage-timeline-wrap\s*\{[^}]*position:\s*relative/);
    expect(component).toContain('case-stage-timeline-wrap');
    expect(component).toContain('data-overflow-end');
    // The ref must be on the SCROLLER — measuring the wrapper would report no
    // overflow, because the wrapper is the element the scroller fits inside.
    expect(component).toMatch(/className="case-stage-timeline"[\s\S]{0,200}?ref=\{ref\}/);
  });

  it('puts the embezzled amount above the stage timeline in the banner', () => {
    const amount = banner.indexOf('caseDetail.embezzledAmount');
    const stages = banner.indexOf('<CaseStageDates');

    expect(amount).toBeGreaterThan(-1);
    expect(stages).toBeGreaterThan(-1);
    expect(amount).toBeLessThan(stages);
  });
});
