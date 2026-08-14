import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// The navbar (Navbar.tsx), the footer and both heroes lay their contents out
// with `.layout-container` (src/styles/typography.css) — `container mx-auto`
// plus a responsive `px-4 sm:px-6 md:px-8`. Pages that reach for Tailwind's
// `container mx-auto px-4` directly get the same max-width but a flat 1rem of
// padding, so their content edge sits ~1rem outside the header's at md and up.
//
// That drift is invisible in review — one pasted class string re-breaks the
// alignment — so this guards it at the source level.

const SRC = resolve(process.cwd(), 'src');

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(full);
    return entry.isFile() && full.endsWith('.tsx') ? [full] : [];
  });
}

describe('page container alignment', () => {
  it('has no raw `container mx-auto` left in src — use `layout-container`', () => {
    const offenders = tsxFiles(SRC)
      .filter((file) => readFileSync(file, 'utf8').includes('container mx-auto'))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it('keeps `.layout-container` padding in step with the navbar', () => {
    const css = readFileSync(resolve(SRC, 'styles/typography.css'), 'utf8');
    const navbar = readFileSync(resolve(SRC, 'components/Navbar.tsx'), 'utf8');

    // The navbar is the reference edge every page is aligned to.
    expect(navbar).toContain('layout-container');
    // Whitespace-tolerant so reformatting the stylesheet doesn't fail this.
    expect(css).toMatch(
      /\.layout-container\s*\{\s*@apply\s+container\s+mx-auto\s+px-4\s+sm:px-6\s+md:px-8;/,
    );
  });
});
