/**
 * Legacy numeric case IDs → canonical slug map.
 *
 * Source of truth for redirecting old shareable URLs (e.g. /case/238) to the
 * current slug-based URL (/case/case-081-cr-0060-…). Used by:
 *   - worker.ts (Cloudflare edge 301 in production)
 *   - CaseDetail page (client-side replace navigation in dev / on direct hit)
 *
 * Cases not in this map fall through and get the slug-only API's 404 response.
 */
export const LEGACY_CASE_MAP: Record<string, string> = {
  '438': 'case-081-cr-0090-389ad1',
  '240': 'case-081-cr-0127-b807df',
  '238': 'case-081-cr-0060-681d9859',
  '237': 'case-081-cr-0107-patanjali',
  '233': 'case-081-cr-0121-aurahi-gaupalika-hospital',
  '232': 'case-081-cr-0123-081-cr-0123-d7e9a3',
  '231': 'case-081-cr-0122-fd3f2cd9',
  '230': 'case-081-cr-0022-ec3412bb',
  '229': 'case-081-cr-0044-a72c082d',
  '228': 'case-081-cr-0104-6653add6',
  '227': 'teramocs-081-cr-0095-32c84510',
  '225': 'bara-hulak-081-CR-0091',
  '224': 'case-081-cr-0097-d8f6d5b2',
  '221': 'case-081-cr-0046-240817ce',
  '220': 'ntc-081-cr-0111-82b9028f',
  '219': 'case-081-cr-0129-50904188',
  '216': 'case-081-cr-0082-0070ab5b',
  '214': 'madhesh-pathology-lab-081-CR-0081',
  '213': 'case-080-cr-0158-sunil-paudel-illegal-assets',
  '212': 'case-081-cr-0080-82b7d966',
  '211': 'case-081-cr-0079-539b729d',
  '210': 'high-compute-infrastructure-08-d53cf7',
  '209': 'risc-hci-081-cr-0098-ad208a',
  '208': 'nitc-081-cr-0058-12d94f',
  '207': 'rabi-lamichhane-cooperative-fr-11ccd7',
  '188': 'budhigandaki-hydropower-projec-77f597',
  '175': 'giribandhu-tea-estate-land-swap',
  '111': 'maoist-combatant-cantonment-co-9095fa',
};

/**
 * Resolve a legacy numeric case identifier to its canonical slug. Returns
 * null if the identifier isn't numeric or isn't in the map.
 */
export function resolveLegacyCaseSlug(identifier: string | undefined): string | null {
  if (!identifier) return null;
  if (!/^\d+$/.test(identifier)) return null;
  return LEGACY_CASE_MAP[identifier] ?? null;
}
