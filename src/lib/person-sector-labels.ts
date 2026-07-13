/**
 * The `nes.persons_by_sector` values from /api/statistics/ are snake_case sector
 * tokens ("civil_service", "local_gov", "not_recorded"). This maps each to a
 * stable i18n key suffix and provides a client-side rollup to a coarse
 * public / private / other view — mirroring how entity-type-labels rolls raw
 * tokens into human groups. No extra backend call: the backend returns the
 * detailed sectors and the coarse view is derived here.
 */

export type CoarseSector = "public" | "private" | "other";

/** Detailed sector token -> coarse bucket. */
export const COARSE_SECTOR: Record<string, CoarseSector> = {
  politicians: "public",
  legislators: "public",
  civil_service: "public",
  local_gov: "public",
  judiciary: "public",
  security: "public",
  business: "private",
  other: "other",
  not_recorded: "other",
};

/** i18n key suffix under dataQuality.entities.sector.* (snake_case -> camelCase). */
export function personSectorKey(sector: string): string {
  return sector.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Roll detailed sectors up into public / private / other, summing counts,
 * ordered public → private → other with empty buckets dropped.
 */
export function rollupToCoarse(
  items: { sector: string; count: number }[],
): { sector: CoarseSector; count: number }[] {
  const totals = new Map<CoarseSector, number>();
  for (const { sector, count } of items) {
    const coarse = COARSE_SECTOR[sector] ?? "other";
    totals.set(coarse, (totals.get(coarse) ?? 0) + count);
  }
  const order: CoarseSector[] = ["public", "private", "other"];
  return order
    .filter((s) => totals.has(s))
    .map((s) => ({ sector: s, count: totals.get(s) as number }));
}
