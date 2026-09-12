// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { PayCard } from '@/components/donate/pay-card';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) =>
      typeof fallback === 'string' ? fallback : key,
  }),
}));

// The donate page is pre-rendered, so PayCard's initial state must be
// deterministic: the "nepal" tab. But most diaspora donors can't use QR or a
// Nepali bank transfer, so after hydration the card guesses the region from
// the visitor's timezone — Asia/Kathmandu stays on the local methods, anything
// else flips to the PayPal panel. A manual toggle must always win over the
// guess.

function mockTimezone(timeZone: string) {
  const real = Intl.DateTimeFormat.prototype.resolvedOptions;
  return vi
    .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
    .mockImplementation(function (this: Intl.DateTimeFormat) {
      return { ...real.call(this), timeZone };
    });
}

function pressedTab(): string | null {
  const pressed = screen
    .getAllByRole('button')
    .find((b) => b.getAttribute('aria-pressed') === 'true');
  return pressed?.textContent ?? null;
}

describe('PayCard region auto-detection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stays on the Nepal tab for visitors in Asia/Kathmandu', () => {
    mockTimezone('Asia/Kathmandu');
    render(<PayCard />);
    expect(pressedTab()).toBe('donate.ways.nepali.title');
  });

  it('opens the abroad tab for visitors outside Nepal', () => {
    mockTimezone('Australia/Sydney');
    render(<PayCard />);
    expect(pressedTab()).toBe('donate.ways.us.title');
  });

  it('keeps the Nepal tab when the timezone is unreadable', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(
      () => {
        throw new Error('no tz');
      },
    );
    render(<PayCard />);
    expect(pressedTab()).toBe('donate.ways.nepali.title');
  });

  it('lets a manual toggle override the guess', () => {
    mockTimezone('Australia/Sydney');
    render(<PayCard />);
    expect(pressedTab()).toBe('donate.ways.us.title');

    const nepalTab = screen
      .getAllByRole('button')
      .find((b) => b.textContent === 'donate.ways.nepali.title');
    expect(nepalTab).toBeDefined();
    fireEvent.click(nepalTab!);
    expect(pressedTab()).toBe('donate.ways.nepali.title');
  });
});
