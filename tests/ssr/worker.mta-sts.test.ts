import { describe, it, expect } from 'vitest';

import worker from '../../workers/mta-sts/worker';
import { POLICY } from '../../workers/mta-sts/policy';

// RFC 8461 is unforgiving: a policy served at the wrong path, with the wrong
// content type, or with a field a sender cannot parse is treated as no policy
// at all — and once mode is enforce, an MX that the file does not list means
// refused mail. These assertions are about the wire format, not preferences.

const POLICY_URL = 'https://mta-sts.jawafdehi.org/.well-known/mta-sts.txt';

describe('MTA-STS policy document', () => {
  it('starts with version, as the RFC requires of the first line', () => {
    expect(POLICY.split('\n')[0]).toBe('version: STSv1');
  });

  it('lists every Google MX name, modern and legacy', () => {
    const mx = POLICY.split('\n').filter((line) => line.startsWith('mx:'));
    expect(mx).toEqual(['mx: smtp.google.com', 'mx: aspmx.l.google.com', 'mx: *.aspmx.l.google.com']);
  });

  it('is in testing mode with a max_age inside the accepted range', () => {
    expect(POLICY).toContain('mode: testing');

    const maxAge = Number(RegExp(/^max_age:\s*(\d+)$/m).exec(POLICY)?.[1]);
    // Google requires at least 86400; RFC 8461 caps it at 31557600.
    expect(maxAge).toBeGreaterThanOrEqual(86400);
    expect(maxAge).toBeLessThanOrEqual(31557600);
  });

  it('is nothing but key: value lines, newline-terminated', () => {
    for (const line of POLICY.split('\n').filter(Boolean)) {
      expect(line).toMatch(/^[a-z_]+: \S.*$/);
    }
    expect(POLICY.endsWith('\n')).toBe(true);
  });
});

describe('MTA-STS worker', () => {
  it('serves the policy as text/plain', async () => {
    const res = await worker.fetch(new Request(POLICY_URL));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(await res.text()).toBe(POLICY);
  });

  it('404s every other path, so the host exposes exactly one file', async () => {
    for (const path of ['/', '/mta-sts.txt', '/cases', '/.well-known/', '/.well-known/mta-sts.txt/extra']) {
      const res = await worker.fetch(new Request(`https://mta-sts.jawafdehi.org${path}`));
      expect({ path, status: res.status }).toEqual({ path, status: 404 });
    }
  });

  it('rejects writes', async () => {
    const res = await worker.fetch(new Request(POLICY_URL, { method: 'POST' }));

    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('GET, HEAD');
  });

  it('ignores the query string rather than treating it as a different path', async () => {
    const res = await worker.fetch(new Request(`${POLICY_URL}?v=2`));
    expect(res.status).toBe(200);
  });
});
