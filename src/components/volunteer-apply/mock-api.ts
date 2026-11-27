const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let pendingCode: { phone: string; code: string; expires: number; attempts: number } | null = null;

export async function sendWhatsAppCode(phone: string): Promise<{ devCode: string }> {
  await wait(700);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  pendingCode = { phone, code, expires: Date.now() + 10 * 60_000, attempts: 0 };
  return { devCode: code };
}

export async function verifyWhatsAppCode(phone: string, code: string): Promise<{ token: string }> {
  await wait(500);
  if (!pendingCode || pendingCode.phone !== phone) throw new Error("nocode");
  if (Date.now() > pendingCode.expires) throw new Error("expired");
  pendingCode.attempts += 1;
  if (pendingCode.attempts > 5) throw new Error("attempts");
  if (pendingCode.code !== code) throw new Error("mismatch");
  pendingCode = null;
  return { token: `proto-${Date.now()}` };
}

export type UploadReceipt = { id: string; name: string; size: number; type: string };

export async function uploadIdDocument(file: File): Promise<UploadReceipt> {
  await wait(900 + Math.min(file.size / 5000, 1200));
  return { id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type };
}

export const TEAM_INBOX = "inquiry@jawafdehi.org";

export async function submitApplication(
  payload: Record<string, unknown> & { email?: string },
): Promise<{ reference: string }> {
  await wait(1200);
  const n = Math.floor(1000 + Math.random() * 9000);
  const reference = `JV-2083-${n}`;
  console.info(`[volunteer-apply] would email ${TEAM_INBOX}: new volunteer application ${reference}`);
  if (payload.email) console.info(`[volunteer-apply] would send a thank-you to the applicant's email`);
  return { reference };
}
