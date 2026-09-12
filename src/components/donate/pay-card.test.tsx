// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import { PayCard } from '@/components/donate/pay-card';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

// Which rail comes first on the "from abroad" panel is an org decision, not a
// styling detail: Zeffy is the primary international route and PayPal Giving
// Fund the familiar secondary one. Nothing else about the panel enforces the
// order, and a reordering reads as harmless in a diff.
describe('the /donate abroad panel offers Zeffy first, PayPal second', () => {
  it('renders the two outbound rails in that order', () => {
    const { container } = render(<PayCard />);
    // Both panels stay mounted (the inactive one is `hidden`), so the abroad
    // rails are queryable while the Nepal tab is the active one.
    const outbound = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('a[href^="https://"]'),
    ).map((a) => a.getAttribute('href') ?? '');

    const zeffy = outbound.findIndex((href) => href.includes('zeffy'));
    const paypal = outbound.findIndex((href) => href.includes('paypal'));

    expect(zeffy, 'no Zeffy rail rendered').toBeGreaterThanOrEqual(0);
    expect(paypal, 'no PayPal rail rendered').toBeGreaterThanOrEqual(0);
    expect(
      zeffy,
      'PayPal now renders above Zeffy. Zeffy is the primary rail from abroad ' +
        '— it is 0% fee and the donation lands with the org directly, so we ' +
        'hold the donor record and issue our own 501(c)(3) receipt.',
    ).toBeLessThan(paypal);
  });

  it('opens each rail in a new tab without leaking the referrer window', () => {
    const { container } = render(<PayCard />);
    const rails = Array.from(
      container.querySelectorAll<HTMLAnchorElement>('a[href^="https://"]'),
    ).filter((a) => /zeffy|paypal/.test(a.getAttribute('href') ?? ''));

    expect(rails).toHaveLength(2);
    for (const rail of rails) {
      expect(rail.getAttribute('target')).toBe('_blank');
      expect(rail.getAttribute('rel')).toContain('noopener');
    }
  });
});
