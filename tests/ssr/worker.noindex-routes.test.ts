import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import worker from '../../worker';

// Two halves of the same policy, which is why they are tested together.
//
// robots.txt stops a crawler FETCHING the operator surfaces; X-Robots-Tag stops
// anything that is already indexed from staying indexed, and covers the embed
// widget, which has to stay fetchable and so cannot be disallowed. Googlebot
// was spending 442 of ~630 weekly fetches of jawafdehi.org on /admin.

const INDEX_HTML =
  '<!doctype html><html><head><title>Jawafdehi</title></head><body></body></html>';

function makeEnv() {
  return {
    ASSETS: {
      // Nothing here is a pre-rendered asset, so only the "/" shell resolves.
      fetch: async (req: Request) => {
        const path = new URL(req.url).pathname;
        if (path === '/') {
          return new Response(INDEX_HTML, {
            status: 200,
            headers: { 'content-type': 'text/html' },
          });
        }
        return new Response('not found', { status: 404 });
      },
    },
  };
}

function robotsHeader(path: string) {
  return worker
    .fetch(new Request(`https://jawafdehi.org${path}`), makeEnv())
    .then((res: Response) => res.headers.get('X-Robots-Tag'));
}

describe('worker: X-Robots-Tag on non-public routes', () => {
  // /admin matches the `/admin/*` pattern with an empty splat, so the bare path
  // has to be covered as well as pages beneath it.
  it.each([
    '/admin',
    '/admin/login',
    '/admin/jawafdehi/cases/some-case',
    '/portal',
    '/document-viewer',
    '/moderation',
  ])('marks %s noindex', async (path) => {
    expect(await robotsHeader(path)).toBe('noindex, nofollow');
  });

  it('marks the embed widget noindex while leaving it framable', async () => {
    const res = await worker.fetch(
      new Request('https://jawafdehi.org/embed/case/1'),
      makeEnv(),
    );
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    // Still embeddable: the whole point of not disallowing it in robots.txt.
    expect(res.headers.get('X-Frame-Options')).toBeNull();
  });

  it.each(['/', '/cases', '/search', '/about'])(
    'leaves the public route %s indexable',
    async (path) => {
      expect(await robotsHeader(path)).toBeNull();
    },
  );
});

// A crawler obeys exactly one group — its most specific User-agent match — and
// ignores every other group including `*`. So a Disallow added only to the `*`
// group does nothing to Googlebot, which has a group of its own. This test is
// here because that failure is completely silent: the file looks correct and
// the rule is simply never applied.
describe('robots.txt: every group carries the non-public Disallows', () => {
  // vitest runs with the repo root as cwd; import.meta.url is not a file: URL
  // under this config, so resolving relative to the module does not work here.
  const robots = readFileSync(join(process.cwd(), 'public/robots.txt'), 'utf8');

  // Groups are separated by blank lines; a group is its User-agent lines plus
  // the rules that follow them.
  const groups = robots
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split('\n')
        .filter((line) => line.trim() && !line.trim().startsWith('#')),
    )
    .filter((lines) => lines.some((line) => /^User-agent:/i.test(line)));

  const allowedGroups = groups.filter((lines) =>
    lines.some((line) => /^Allow:\s*\/\s*$/i.test(line)),
  );

  it('finds the three allow-groups to check', () => {
    expect(allowedGroups).toHaveLength(3);
  });

  it.each(['/admin', '/portal', '/document-viewer', '/moderation'])(
    'disallows %s in every group that allows crawling',
    (path) => {
      for (const lines of allowedGroups) {
        const agents = lines
          .filter((line) => /^User-agent:/i.test(line))
          .join(', ');
        expect(
          lines.some(
            (line) => line.trim().toLowerCase() === `disallow: ${path}`,
          ),
          `group [${agents}] is missing "Disallow: ${path}"`,
        ).toBe(true);
      }
    },
  );

  // Google resolves a conflict by the LONGEST matching rule, so `Allow: /` with
  // `Disallow: /admin` after it still blocks /admin. Plenty of other parsers —
  // including Python's urllib.robotparser, which is what a lot of smaller
  // crawlers are built on — resolve it by FIRST match in file order instead,
  // and read `Allow: /` as permitting everything below it. Writing the
  // Disallows first is the only ordering both agree on, and getting it wrong is
  // invisible: the file still parses and Google still behaves.
  it.each([0, 1, 2])('puts Disallow before Allow in group %i', (index) => {
    const lines = allowedGroups[index];
    const firstDisallow = lines.findIndex((line) => /^Disallow:/i.test(line));
    const allowRoot = lines.findIndex((line) => /^Allow:\s*\/\s*$/i.test(line));
    expect(firstDisallow).toBeGreaterThanOrEqual(0);
    expect(firstDisallow).toBeLessThan(allowRoot);
  });

  it('leaves the embed widget crawlable', () => {
    expect(robots).not.toMatch(/^Disallow:\s*\/embed/im);
  });

  it('still allows meta-externalagent, which publishing depends on', () => {
    const metaGroup = allowedGroups.find((lines) =>
      lines.some((line) => /^User-agent:\s*meta-externalagent/i.test(line)),
    );
    expect(metaGroup).toBeDefined();
  });
});
