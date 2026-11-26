/**
 * Case series API client: `GET /api/series/<slug>/`.
 *
 * A series that is not public (draft, or fewer than two published members)
 * answers 404, which this resolves to `null` so the page can show its
 * not-found state rather than an error. Any other failure throws.
 */
import { http } from "./http";

import type { SeriesDetail } from "@/types/series";

function httpStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

export async function getSeries(slug: string): Promise<SeriesDetail | null> {
  try {
    const response = await http.get<SeriesDetail>(
      `/api/series/${encodeURIComponent(slug)}/`,
      { timeout: 10000 },
    );
    return response.data;
  } catch (error) {
    if (httpStatus(error) === 404) return null;
    throw error;
  }
}
