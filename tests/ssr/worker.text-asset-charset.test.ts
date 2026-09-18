import { describe, it, expect } from 'vitest';

import worker from '../../worker';

// llms.txt is the file on this site written specifically to be read by a machine,
// and it is 11 KB of mixed English and Devanagari — the organisation's Nepali name,
// the Nepali numeral words. The assets binding serves it as bare `text/plain` with
// no charset (robots.txt happens to get one; llms.txt does not), and `text/plain`
// with no charset is historically ISO-8859-1, so a strict client renders the Nepali
// as mojibake. Leaving the encoding of the machine-readable file to sniffing is the
// wrong trade, so the Worker declares it.

function envServing(contentType: string | null) {
  return {
    ASSETS: {
      fetch: async () =>
        new Response('# Jawafdehi — जवाफदेही इनिशिएटिभ\n', {
          status: 200,
          headers: contentType ? { 'content-type': contentType } : {},
        }),
    },
  };
}

describe('text assets declare their encoding', () => {
  it('adds charset=utf-8 to a bare text/plain asset', async () => {
    const res = await worker.fetch(
      new Request('https://jawafdehi.org/llms.txt'),
      envServing('text/plain'),
    );

    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
  });

  it('leaves an already-declared charset alone', async () => {
    const res = await worker.fetch(
      new Request('https://jawafdehi.org/robots.txt'),
      envServing('text/plain; charset=utf-8'),
    );

    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
  });

  it('does not touch a non-text content type', async () => {
    const res = await worker.fetch(
      new Request('https://jawafdehi.org/sitemap.xml'),
      envServing('application/xml'),
    );

    expect(res.headers.get('Content-Type')).toBe('application/xml');
  });

  it('still applies the security headers to the asset', async () => {
    const res = await worker.fetch(
      new Request('https://jawafdehi.org/llms.txt'),
      envServing('text/plain'),
    );

    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(res.status).toBe(200);
  });

  it('serves the Devanagari back byte-for-byte', async () => {
    const res = await worker.fetch(
      new Request('https://jawafdehi.org/llms.txt'),
      envServing('text/plain'),
    );

    expect(await res.text()).toContain('जवाफदेही इनिशिएटिभ');
  });
});
