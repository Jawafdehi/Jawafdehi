import { http } from "./http";

import type {
  ArchiveSearchParams,
  ArchiveSearchResponse,
} from "@/types/search";

export async function searchArchive(
  params: ArchiveSearchParams,
): Promise<ArchiveSearchResponse> {
  const query = new URLSearchParams();
  // Auto language: always request both scripts; the UI renders English-then-Nepali
  // and there is no language toggle.
  query.set("lang", "both");
  Object.entries(params).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(name, item));
    } else if (value !== undefined) {
      query.set(name, String(value));
    }
  });
  const suffix = query.toString();
  const url = suffix ? `/api/search/?${suffix}` : `/api/search/`;
  const response = await http.get<ArchiveSearchResponse>(url);
  return response.data;
}
