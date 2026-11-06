// mta-sts.jawafdehi.org — serves the MTA-STS policy and nothing else.
//
// MTA-STS (RFC 8461) tells a sending mail server that jawafdehi.org accepts
// mail only over authenticated TLS, closing the downgrade attack that
// opportunistic STARTTLS leaves open. The policy must be served over HTTPS from
// this exact hostname, so something has to answer there.
//
// This is a second, separate Worker rather than a branch in the site Worker on
// purpose. The site Worker has a static-assets binding, and Cloudflare serves a
// matching asset *before* invoking the Worker — on every hostname the Worker is
// routed to. Attaching mta-sts to it would have mirrored the entire website at
// mta-sts.jawafdehi.org. This Worker has no assets binding, so it sees every
// request and can refuse everything that is not the policy.

import { POLICY } from './policy';

const POLICY_PATH = '/.well-known/mta-sts.txt';

function notFound(): Response {
  return new Response('Not Found\n', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname !== POLICY_PATH) return notFound();

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed\n', {
        status: 405,
        headers: { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // RFC 8461 §3.2 requires text/plain. Senders re-fetch based on the TXT
    // record's id rather than HTTP caching, so the short TTL here only governs
    // how fast a policy edit reaches the edge.
    return new Response(POLICY, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
        'X-Robots-Tag': 'noindex',
      },
    });
  },
};
