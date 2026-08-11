// Drives the public /report page: safety guidance, live contact channels, and
// the corruption-case form actually posting a `case_report` to the API.
// Usage: node tests/e2e/report-page.mjs   (exit 0 = all checks pass)
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE_URL || "http://127.0.0.1:40115";
const SHOTS = process.env.E2E_SHOTS_DIR || "/tmp/e2e-shots";

const failures = [];
function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures.push(name);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

// Pre-answer the cookie banner so it never covers the submit button.
await page.addInitScript(() => {
  localStorage.setItem("jawafdehi_analytics_consent", "denied");
});

// Capture the outgoing submission so we can assert the wire shape.
let posted = null;
page.on("request", (req) => {
  if (req.method() === "POST" && req.url().includes("/api/feedback/")) {
    try {
      posted = JSON.parse(req.postData() || "null");
    } catch {
      posted = { unparsed: req.postData() };
    }
  }
});

console.log(`\n[report-page] ${BASE}/report`);
await page.goto(`${BASE}/report`, { waitUntil: "networkidle" });

const body = await page.locator("body").innerText();

console.log("\nPage content");
check("safety section renders", (await page.locator("#report-safety-heading").count()) === 1);
check("four safety points", (await page.locator("#report-safety-heading ~ ul li").count()) === 4);
check("channels section renders", (await page.locator("#report-channels-heading").count()) === 1);
check("report@ mailto present", (await page.locator('a[href="mailto:report@jawafdehi.org"]').count()) === 1);
check("whatsapp link present", (await page.locator('a[href*="api.whatsapp.com"]').count()) >= 1);
check("linktree listed", (await page.locator('a[href*="linktr.ee"]').count()) >= 1);
// Every channel the org runs, because the page's whole job is "here is how to
// reach us" and a silently missing one is indistinguishable from not having it.
// Instagram, TikTok and Discord were all absent from the shared socials
// constant until 2026-08-11, so the footer was short three channels too.
for (const [name, needle] of [
  ["facebook", "facebook.com/jawafdehi"],
  ["x", "x.com/jawafdehi"],
  ["instagram", "instagram.com/jawafdehi"],
  ["tiktok", "tiktok.com/@jawafdehi"],
  ["youtube", "youtube.com/@Jawafdehi"],
  ["linkedin", "linkedin.com/company/jawafdehi"],
  ["discord", "discord.gg/"],
]) {
  check(`${name} listed`, (await page.locator(`a[href*="${needle}"]`).count()) >= 1);
}
// The dead handle returns HTTP 200, so only an exact-string check catches it.
check("no dead tiktok handle", (await page.locator('a[href*="jawafdehi_initiative"]').count()) === 0);
check("docx template link", (await page.locator('a[href$="case-entry-template.docx"]').count()) === 1);
check("no untranslated keys", !/report\.page\.|report\.submitted\./.test(body), body.match(/report\.[a-zA-Z.]+/)?.[0]);

console.log("\nAnonymous submission");
await page.fill("#subject", "E2E test — road contract irregularity");
await page.fill("#description", "A district road contract was awarded without a tender notice.");
await page.fill("#location", "Kaski");
await page.check("#anonymous");
await page.check("#terms");
await page.click('button[type="submit"]');
await page.waitForSelector("text=/reference number|सन्दर्भ नम्बर/i", { timeout: 10000 });

check("posted something", posted !== null);
check("feedbackType is case_report", posted?.feedbackType === "case_report", JSON.stringify(posted?.feedbackType));
check("subject passed through", posted?.subject === "E2E test — road contract irregularity");
check("description carries the labelled body", /What happened:/.test(posted?.description || ""));
check("location folded into the body", /Location:\nKaski/.test(posted?.description || ""));
check("allegation type is English in the body", /Allegation type:\nCorruption/.test(posted?.description || ""));
check("anonymous sends no contactInfo", posted?.contactInfo === undefined, JSON.stringify(posted?.contactInfo));
check("acknowledgement shows the reference", (await page.locator("body").innerText()).includes("#4242"));

await page.screenshot({ path: `${SHOTS}/report-submitted.png`, fullPage: true });

console.log("\nNamed submission");
posted = null;
await page.click("text=/Submit another report|अर्को रिपोर्ट/i");
await page.fill("#subject", "E2E test — named reporter");
await page.fill("#description", "Second submission, this time with contact details.");
await page.fill("#contributorName", "Test Reporter");
await page.fill("#contactValue", "reporter@example.com");
await page.check("#terms");
await page.click('button[type="submit"]');
await page.waitForSelector("text=/reference number|सन्दर्भ नम्बर/i", { timeout: 10000 });

check("contactInfo carries the name", posted?.contactInfo?.name === "Test Reporter", JSON.stringify(posted?.contactInfo));
check(
  "contactInfo carries one email method",
  posted?.contactInfo?.contactMethods?.[0]?.type === "email" &&
    posted?.contactInfo?.contactMethods?.[0]?.value === "reporter@example.com",
  JSON.stringify(posted?.contactInfo?.contactMethods),
);

console.log("\nHome CTA");
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const cta = page.locator('a[href="/report"]');
check("home CTA links to /report", (await cta.count()) >= 1);

check("no page errors", pageErrors.length === 0, pageErrors.join(" | "));

await browser.close();

console.log(`\n${failures.length === 0 ? "PASS" : `FAIL (${failures.length}): ${failures.join(", ")}`}`);
process.exit(failures.length === 0 ? 0 : 1);
