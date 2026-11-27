import { adToBS } from "@/utils/bs-calendar";
import {
  AGREEMENT_VERSION,
  CLAUSES,
  CODE_OF_CONDUCT_URL,
  ORGANISATION_PARTY,
  VOLUNTEER_RULES,
  VOLUNTEER_SIGNING_STATEMENT,
} from "@/components/volunteer-apply/agreement-text";

export const VOLUNTEER_AGREEMENT_URL = "/documents/jawafdehi-volunteer-agreement-2083.pdf";

export type AgreementParty = {
  fullName: string;
  idLabel: string;
  idNumber: string;
  address: string;
  phone: string;
  email: string;
  role: string;
  hours: string;
  startDate: string;
};

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string,
  );

const adDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const bsDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  try {
    const bs = adToBS(y, m, d);
    return `${bs.year}/${bs.month}/${bs.date}`;
  } catch {
    return "";
  }
};

const bothDates = (iso: string) => `${adDate(iso)} (AD) / ${bsDate(iso)} (BS)`;
const BLANK = '<span class="blank"></span>';

export function agreementHtml({
  origin,
  party,
  signature,
  reference,
}: {
  origin: string;
  party?: AgreementParty;
  signature?: string;
  reference?: string;
}): string {
  const today = new Date().toISOString().slice(0, 10);
  const date = party ? bothDates(today) : `${BLANK} (AD) / ${BLANK} (BS)`;
  const fill = (text: string) =>
    esc(text)
      .replace("{{role}}", party ? esc(party.role) : "as set out in Annex A")
      .replace("{{startDate}}", party?.startDate ? bothDates(party.startDate) : "the date in Annex A");

  const field = (label: string, value?: string) => `<b>${label}</b> ${value ? esc(value) : BLANK}`;
  const clauses = CLAUSES.map(
    (cl) =>
      `<h2>${cl.n}. ${esc(cl.title)}</h2>` +
      cl.body
        .map((p) =>
          "list" in p
            ? `<ol type="a">${p.list.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`
            : `<p>${p.lead ? `<b>${esc(p.lead)}</b> ` : ""}${fill(p.text)}</p>`,
        )
        .join(""),
  ).join("");

  const drawn = signature && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) ? signature : null;
  const sig = signature?.startsWith("typed:")
    ? `<p class="typed-sig">${esc(signature.slice(6))}</p>`
    : drawn
      ? `<img src="${esc(drawn)}" class="drawn-sig" alt="Signature"/>`
      : `<p class="sign-line"></p>`;

  const annexA = [
    ["Role title", party?.role],
    ["Expected time commitment", party?.hours ? `About ${party.hours} hours a week` : undefined],
    ["Start date", party?.startDate ? bothDates(party.startDate) : undefined],
    ["Supervisor", party ? "Assigned on approval" : undefined],
  ]
    .map(([k, v]) => `<tr><th>${k}</th><td>${v ? esc(v) : BLANK}</td></tr>`)
    .join("");

  const font = (family: string, path: string) =>
    `@font-face{font-family:'${family}';src:url('${origin}${path}') format('woff2');font-weight:100 900;font-display:block}`;
  const fileName = party
    ? `Jawafdehi Volunteer Agreement - ${party.fullName.trim() || "Volunteer"}`.replace(/[\\/:*?"<>|]/g, "")
    : "Jawafdehi Volunteer Agreement";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(fileName)}</title>
<style>
${font("Inter", "/font/Inter/Inter-latin-wght.woff2")}
${font("Noto Sans Devanagari", "/font/Noto_Sans_Devanagari/NotoSansDevanagari-wght.woff2")}
@page{size:A4;margin:18mm 18mm 20mm}
*{box-sizing:border-box}
body{margin:0;font:10.5pt/1.6 Inter,'Noto Sans Devanagari',sans-serif;color:#14213d}
h1{font-size:20pt;font-weight:600;letter-spacing:-0.02em;margin:0 0 2pt}
h2{font-size:11.5pt;font-weight:600;margin:16pt 0 4pt;break-after:avoid}
p,li{margin:0 0 6pt}
ol,ul{padding-left:16pt;margin:0 0 6pt}
a{color:inherit}
.org{font-weight:500;margin-bottom:14pt}
.box{background:#f4f4f6;border-radius:6pt;padding:8pt 10pt;margin:6pt 0;line-height:1.9}
.box b{display:inline-block;min-width:70pt}
.blank{display:inline-block;min-width:150pt;border-bottom:0.6pt solid #98a2b3;height:1em;vertical-align:-2pt}
table{border-collapse:collapse;width:100%;margin:4pt 0 6pt}
th,td{border-bottom:0.5pt solid #d0d5dd;padding:5pt 0;text-align:left;vertical-align:top}
th{width:38%;font-weight:600;padding-right:10pt}
.annex{break-before:page}
.signatures{break-inside:avoid;margin-top:20pt}
.typed-sig{font:italic 22pt/1.2 Inter,sans-serif;margin:8pt 0 2pt}
.drawn-sig{height:60pt;margin:6pt 0 0}
.sign-line{border-bottom:0.6pt solid #98a2b3;width:220pt;height:34pt;margin:0 0 4pt}
.audit{font-size:8pt;color:#667085;border-top:0.5pt solid #d0d5dd;margin-top:24pt;padding-top:6pt}
</style></head><body>
<h1>Volunteer Agreement</h1>
<p class="org">जवाफदेही इनिशिएटिभ (Jawafdehi Initiative), Nepal</p>
<p>This Agreement is made on ${date} between ${esc(ORGANISATION_PARTY)}; and</p>
<div class="box">${field("Name", party?.fullName)}<br>${field(party ? `${esc(party.idLabel)} no.` : "Citizenship / ID no.", party?.idNumber)}<br>${field("Address", party?.address)}<br>${field("Phone", party ? `+977 ${party.phone}` : undefined)}<br>${field("Email", party?.email)}</div>
<p>("the Volunteer"). The Organisation and the Volunteer are referred to together as "the Parties".</p>
${clauses}
<div class="signatures">
<h2>Signatures</h2>
<p><b>The Volunteer.</b> ${esc(VOLUNTEER_SIGNING_STATEMENT)}</p>
${sig}
<p>${party ? esc(party.fullName) : `Name ${BLANK}`} · Date ${date}</p>
<p style="margin-top:14pt"><b>For जवाफदेही इनिशिएटिभ.</b> ${party ? "Awaiting countersignature" : `Signature ${BLANK}`}</p>
</div>
<section class="annex">
<h2>Annex A. Role description</h2>
<table>${annexA}</table>
<p>This role is unpaid, and expenses are not reimbursed except under clause 4.</p>
<h2>Annex B. Policies given to the Volunteer</h2>
<ul>
<li><a href="${CODE_OF_CONDUCT_URL}">Code of Conduct</a> (2083): ${esc(CODE_OF_CONDUCT_URL)}</li>
<li><a href="https://jawafdehi.org/privacy/">Privacy Policy</a>: https://jawafdehi.org/privacy/</li>
<li><a href="https://jawafdehi.org/terms/">Terms of Service</a>: https://jawafdehi.org/terms/</li>
</ul>
<h2>Annex C. Rules for volunteers</h2>
<ol>${VOLUNTEER_RULES.map((r) => `<li>${esc(r.en)}</li>`).join("")}</ol>
</section>
<p class="audit">${reference ? `Application ${esc(reference)} · ` : ""}${AGREEMENT_VERSION}${party ? ` · signed ${new Date().toISOString()} · phone verified on WhatsApp` : ""}</p>
</body></html>`;
}

export function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden";
  frame.srcdoc = html;
  frame.onload = async () => {
    const win = frame.contentWindow;
    if (!win) return;
    await win.document.fonts.ready.catch(() => undefined);
    win.addEventListener("afterprint", () => setTimeout(() => frame.remove(), 500));
    win.focus();
    win.print();
  };
  document.body.appendChild(frame);
}
