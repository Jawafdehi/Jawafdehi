/**
 * Formats a Nepali Rupee (NPR) bigo (embezzled/irregular) amount
 * into a human-readable string using Nepali currency units.
 *
 * Units:
 *   - Crore: 1 crore = 10,000,000 (10 million)
 *   - Lakh:  1 lakh  =    100,000
 *   - K:     thousands (for smaller amounts)
 *
 * @param amount - Amount in NPR (whole number)
 * @returns Formatted string, e.g. "NRS 4.3 Crore", "NRS 5.0 Lakh", "NRS 50K"
 */
export function formatBigo(amount: number): string {
  const crores = amount / 10_000_000;
  if (crores >= 1) {
    return `NRS ${crores.toFixed(1)} Crore`;
  }

  const lakhs = amount / 100_000;
  if (lakhs >= 1) {
    return `NRS ${lakhs.toFixed(1)} Lakh`;
  }

  return `NRS ${(amount / 1_000).toFixed(0)}K`;
}
