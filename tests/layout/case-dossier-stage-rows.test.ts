import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The case dossier lays every fact out as one label-left / value-right row:
// `.case-dossier-facts > div { grid-template-columns: 190px minmax(0, 1fr) }`.
//
// The stages are NOT one fact — they are one fact row per stage, delivered
// under a single wrapper element. That wrapper matched the rule above, so it
// was laid out AS a fact row and its stages became the two column tracks: a
// lone stage was squeezed into the 190px label column with the value column
// left empty, and from two stages up they tiled across, putting `First
// instance` in the label slot and `Appeal` in the value slot so the pair read
// as one field.
//
// jsdom computes no layout, so this guards the two halves of the fix at the
// source level instead: the wrapper must opt out of the fact-row template, and
// each stage must opt into it.

const SRC = resolve(process.cwd(), 'src');
const css = readFileSync(resolve(SRC, 'components/case-detail/case-dossier.css'), 'utf8');
const component = readFileSync(resolve(SRC, 'components/case-detail/case-stage-dates.tsx'), 'utf8');
const banner = readFileSync(resolve(SRC, 'components/case-detail/case-detail-banner.tsx'), 'utf8');

// Whitespace-tolerant so reformatting the stylesheet doesn't fail these.
const rule = (selector: string) =>
  new RegExp(`${selector.replace(/[.>*]/g, '\\$&')}\\s*\\{([^}]*)\\}`);

describe('case dossier stage rows', () => {
  it('hands the stage wrapper a single column, not the fact-row template', () => {
    const match = css.match(rule('.case-dossier-facts > .case-stage-rows'));

    expect(match).not.toBeNull();
    // Declaring `display: grid` alone is the trap: the wrapper would still
    // inherit `190px minmax(0, 1fr)` from the fact-row rule and keep tiling.
    expect(match![1]).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it('gives each stage the same label/value template as a fact row', () => {
    const factRow = css.match(rule('.case-dossier-facts > div'));
    const stageRow = css.match(rule('.case-dossier-facts > .case-stage-rows > div'));

    expect(factRow).not.toBeNull();
    expect(stageRow).not.toBeNull();
    // Pinned against the fact row itself, so the two cannot drift apart if the
    // 190px label column is ever retuned.
    const columns = /grid-template-columns:\s*([^;]+);/;
    expect(stageRow![1].match(columns)?.[1]).toBe(factRow![1].match(columns)?.[1]);
  });

  it('collapses stage rows to one column on narrow screens, like every fact', () => {
    const narrow = css.slice(css.indexOf('@media (max-width: 600px)'));

    expect(narrow).toContain('.case-dossier-facts > .case-stage-rows > div');
  });

  it('emits the class the grid keys on, and no wrapper spacing to fight it', () => {
    expect(component).toContain('"case-stage-rows"');
    // `space-y-3` stacked a 12px margin on top of the grid gap and knocked the
    // rows out of alignment with each other.
    expect(component).not.toContain('space-y-3');
  });

  it('puts the embezzled amount above the stage list in the banner', () => {
    const amount = banner.indexOf('caseDetail.embezzledAmount');
    const stages = banner.indexOf('<CaseStageDates');

    expect(amount).toBeGreaterThan(-1);
    expect(stages).toBeGreaterThan(-1);
    expect(amount).toBeLessThan(stages);
  });
});
