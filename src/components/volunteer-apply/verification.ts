const KEY = "jawafdehi.volunteer-apply.verified";
const TTL_MS = 60 * 60_000;

export type Verification = { phone: string; token: string };

export function saveVerification(v: Verification) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...v, at: Date.now() }));
  } catch {
    return;
  }
}

export function readVerification(): Verification | null {
  if (typeof window === "undefined") return null;
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (!raw || typeof raw !== "object") return null;
    const { phone, token, at } = raw as Record<string, unknown>;
    if (typeof phone !== "string" || !/^9[678]\d{8}$/.test(phone)) return null;
    if (typeof token !== "string" || token.length > 200) return null;
    if (typeof at !== "number" || Date.now() - at > TTL_MS) return null;
    return { phone, token };
  } catch {
    return null;
  }
}

export function clearVerification() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    return;
  }
}
