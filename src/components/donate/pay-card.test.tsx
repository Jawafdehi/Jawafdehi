// SPDX-License-Identifier: Hippocratic-3.0
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { PayCard } from '@/components/donate/pay-card';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

// Which rails the "from abroad" panel offers is an org decision, not a styling
// detail. Zeffy is the primary international route — 0% fee, the donation lands
// with the org directly, so we hold the donor record and issue our own
// 501(c)(3) receipt. PayPal Giving Fund was the familiar secondary one and is
// now hidden behind `SHOW_PAYPAL`; a stray render of it reads as harmless in a
// diff, which is why it is pinned here rather than left to review.
describe('the /donate abroad panel offers Zeffy and nothing else', () => {
  it('renders the Zeffy rail and no PayPal rail', () => {
    const { container } = render(<PayCard />);
    // Both panels stay mounted (the inactive one is `hidden`), so the abroad
    // rails are queryable while the Nepal tab is the active one.
    const outbound = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('a[href^="https://"]'),
    ).map((a) => a.getAttribute('href') ?? '');

    expect(
      outbound.filter((href) => href.includes('zeffy')),
      'no Zeffy rail rendered',
    ).not.toHaveLength(0);
    expect(
      outbound.filter((href) => href.includes('paypal')),
      'a PayPal rail is back on the abroad panel. If that is intended, flip ' +
        'SHOW_PAYPAL and restore the ordering assertion — Zeffy must stay above ' +
        'PayPal — plus the PayPal row in the CTA-wrap table in ' +
        'tests/layout/no-horizontal-overflow.test.tsx.',
    ).toHaveLength(0);
  });

  it('opens each rail in a new tab without leaking the referrer window', () => {
    const { container } = render(<PayCard />);
    const rails = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('a[href^="https://"]'),
    ).filter((a) => /zeffy|paypal/.test(a.getAttribute('href') ?? ''));

    expect(rails).toHaveLength(1);
    for (const rail of rails) {
      expect(rail.getAttribute('target')).toBe('_blank');
      expect(rail.getAttribute('rel')).toContain('noopener');
    }
  });
});

// ── the Zeffy dialog ───────────────────────────────────────────────────────────

function zeffyLink(container: HTMLElement) {
  return container.querySelector<HTMLAnchorElement>('a[href*="zeffy"]')!;
}

describe('the Zeffy rail opens the form in a dialog', () => {
  it('mounts no payment iframe until the donor asks for one', () => {
    const { container } = render(<PayCard />);
    // Zeffy's own snippet appends a hidden, eagerly-loading iframe on page load.
    // This one costs a visitor who never donates nothing at all.
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('frames the embeddable form, with the payment permission it needs', () => {
    const { container } = render(<PayCard />);
    fireEvent.click(zeffyLink(container));

    const frame = screen.getByTitle('donate.ways.us.zeffy.dialogTitle');
    expect(frame.tagName).toBe('IFRAME');
    // The `/embed/` form with `modal=true` — NOT the hosted page, which refuses
    // to be framed.
    expect(frame.getAttribute('src')).toContain('/embed/donation-form/');
    expect(frame.getAttribute('src')).toContain('modal=true');
    // Without `allow="payment"` the Payment Request API is blocked in a
    // cross-origin frame and card wallets silently disappear.
    expect(frame.getAttribute('allow')).toContain('payment');
  });

  it('leaves a modified click to the browser, so the link is still a link', () => {
    const { container } = render(<PayCard />);
    const link = zeffyLink(container);

    // ⌘/Ctrl-click means "new tab". Swallowing it would break the one gesture a
    // donor uses to keep this page open while they pay.
    fireEvent.click(link, { metaKey: true });
    expect(screen.queryByTitle('donate.ways.us.zeffy.dialogTitle')).toBeNull();
    expect(link.getAttribute('href')).toMatch(/^https:\/\/www\.zeffy\.com\//);

    fireEvent.click(link);
    expect(screen.getByTitle('donate.ways.us.zeffy.dialogTitle')).toBeTruthy();
  });

  it('is allowed to frame zeffy.com by the worker CSP', () => {
    // The dialog and the header that permits it live in different files, and the
    // failure is invisible in review: the frame is simply blank in production.
    const worker = readFileSync(resolve(process.cwd(), 'worker.ts'), 'utf8');
    const csp = /'Content-Security-Policy':\s*"([^"]+)"/.exec(worker)?.[1] ?? '';

    expect(csp, 'no Content-Security-Policy found in worker.ts').not.toBe('');
    expect(
      csp,
      'the donate dialog frames www.zeffy.com, and CSP has no frame-src — so it ' +
        "falls back to default-src 'self' and the frame is blocked.",
    ).toContain('frame-src');
    expect(/frame-src[^;]*https:\/\/www\.zeffy\.com/.test(csp)).toBe(true);
  });
});
