import { Seo } from "@/components/Seo";
import { SITE_URL } from "@/utils/seo";

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Jawafdehi Initiative Privacy Policy"
        description="Jawafdehi's privacy policy — how we handle data, cookies, analytics, and user information on Nepal's open corruption accountability platform."
        canonicalUrl={`${SITE_URL}/privacy/`}
      />

      <main id="main-content" className="flex-1">
        <section id="privacy-hero" className="bg-gradient-to-br from-primary-surface via-navy-dark to-foreground py-16 md:py-20">
          <div className="layout-container">
            <div className="max-w-3xl">
              <h1 className="font-page-title font-page-title-inverse mb-4">
                Jawafdehi Initiative Privacy Policy
              </h1>
              <p className="font-page-lede font-page-lede-inverse">
                Last updated: November 8, 2026
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="layout-container">
            <div className="font-paragraph content-prose max-w-3xl mx-auto">
              <h2 id="overview">1. Overview</h2>
              <p>
                This Privacy Policy explains how Jawafdehi Initiative Inc., a Michigan public benefit nonprofit corporation ("Jawafdehi", "we", "our", or "us"), collects, uses, shares, and protects information when you use the jawafdehi.org website, any public website or service we run on a subdomain of jawafdehi.org, and related services (together, the "Platform"). We believe in minimal data collection and maximum transparency — consistent with our mission as Nepal's open corruption accountability platform.
              </p>
              <p>
                This policy covers jawafdehi.org and all of its public subdomains, including:
              </p>
              <ul>
                <li><strong>jawafdehi.org</strong>: the public case archive, search, and our forms.</li>
                <li><strong>research.jawafdehi.org</strong>: our research on how corruption cases move through investigation, prosecution, the courts, and appeals.</li>
                <li><strong>justice.jawafdehi.org</strong>: a summary of the work of the justices of the Supreme Court of Nepal.</li>
                <li><strong>give.jawafdehi.org</strong>: information about supporting our work.</li>
                <li><strong>auth.jawafdehi.org</strong>, <strong>chat.jawafdehi.org</strong>, and our MCP connector at <strong>api.jawafdehi.org/mcp</strong>: sign-in and the services that use it (see Section 2.7).</li>
                <li>Any other public site we run under jawafdehi.org, now or later.</li>
              </ul>
              <p>
                Wherever we say "the Platform" in this policy, we mean all of these. Our internal tools for staff and volunteers are not part of the Platform; they are covered by a separate staff notice.
              </p>
              <p>
                We are the data controller for personal information processed through the Platform. If you have questions or wish to exercise your privacy rights, contact us at <a href="mailto:privacy@jawafdehi.org" className="text-primary hover:underline">privacy@jawafdehi.org</a>.
              </p>

              <h2 id="information-we-collect">2. Information We Collect</h2>

              <h3 id="information-you-provide">2.1 Information You Provide</h3>
              <p>
                When you submit feedback, report an allegation, or volunteer through our Platform, you may provide:
              </p>
              <ul>
                <li>Your name (optional)</li>
                <li>Email address (optional)</li>
                <li>Your WhatsApp number, if you sign up for an event and choose to give it</li>
                <li>Any information you choose to include in your submission</li>
              </ul>
              <p>
                All submissions are voluntary. You may submit feedback or allegation reports anonymously.
              </p>

              <h3 id="automatically-collected-information">2.2 Automatically Collected Information</h3>
              <p>
                When you visit any site on the Platform, our infrastructure automatically collects standard server logs that may include:
              </p>
              <ul>
                <li>IP address (temporarily logged for security and debugging)</li>
                <li>Browser type and version</li>
                <li>Pages visited and time spent</li>
                <li>Referring URL</li>
              </ul>
              <p>
                Our servers also keep a record of what is searched for and viewed about the people and organisations in our archive (see Section 2.9).
              </p>

              <h3 id="analytics-data">2.3 Analytics Data</h3>
              <p>
                <strong>Cloudflare Web Analytics (all sites).</strong> Every site on the Platform uses Cloudflare Web Analytics to count visits. It does not set cookies, does not store anything on your device, and does not build a profile of you or follow you across other websites. It records things like the page you viewed, how long the page took to load, the referring site, and your browser, device type, and country. We see only totals. Because it uses no cookies, it runs without asking for consent, and it is not affected by your choice in the cookie banner.
              </p>
              <p>
                <strong>Google Analytics (jawafdehi.org only, with your consent).</strong> With your consent, we use Google Analytics 4 to understand how visitors use jawafdehi.org — for example, which pages are viewed and what visitors search for in the public archive. When you run a search, the words you type into the archive search box are recorded as part of an analytics event, together with the number of results returned. Because our archive concerns public corruption records, a search may include a person's name; if you are concerned about your safety, avoid entering identifying details (see Section 7). Declining analytics turns off Google Analytics, but our servers still keep the records described in Section 2.9. Google Analytics sets cookies and processes usage data. Google Analytics 4 does not log or store full IP addresses, and we do not use Google Analytics for advertising or cross-context behavioral tracking. Google Analytics does not load and no analytics cookies are set unless you opt in through our cookie banner. You can decline it at any time without affecting your use of the Platform (see Section 4). Our other sites do not use Google Analytics.
              </p>

              <h3 id="error-monitoring">2.4 Error Monitoring</h3>
              <p>
                We use Sentry to detect and diagnose technical errors so we can keep the Platform working. Sentry captures error and diagnostic data when something goes wrong. We have configured Sentry to minimize personal data: we do not send IP addresses or other personal identifiers by default, text is masked, and media is blocked in any captured diagnostics. We rely on this strictly for reliability and security (our legitimate interest) and do not use it to profile or track you.
              </p>

              <h3 id="social-media-integration">2.5 Social Media Account Integration</h3>
              <p>
                To publish Jawafdehi Initiative's own content, we connect our organization's own social media accounts (including TikTok) to a self-hosted social media scheduling tool. Through a platform's official API, and only for accounts we ourselves own and connect, we may access basic profile information (such as account ID, display name, and avatar), account statistics (such as follower, like, and video counts), and the list of our own published videos, and we may upload videos we create as drafts for further editing and publishing on the platform. We do not access, collect, or store information belonging to any other users of those platforms. Information obtained through these integrations is used solely to manage our own accounts and is also subject to the terms and privacy policies of the relevant platform, including those of TikTok.
              </p>

              <h3 id="research-and-data-sites">2.6 Our Research and Data Sites</h3>
              <p>
                research.jawafdehi.org, justice.jawafdehi.org, and give.jawafdehi.org are read-only websites. They have no accounts, no sign-in, and no forms, and they set no cookies. What they collect from you is limited to the server logs in Section 2.2 and the cookieless analytics in Section 2.3; justice.jawafdehi.org also has your browser send Sentry (Section 2.4) a report when it blocks content that breaks the site's security policy. The report holds the page address, the blocked address and the rule that was broken; because your browser sends it directly, Sentry also receives your IP address and browser type with it. research.jawafdehi.org remembers your language choice (English or Nepali) in your own browser; that setting is not sent to us. research.jawafdehi.org and give.jawafdehi.org load fonts from Google Fonts, so your browser connects to Google, which receives your IP address when the page loads.
              </p>
              <p>
                The information these sites publish is about public life, not about visitors. It comes from public records: court records and decisions, records of the Commission for the Investigation of Abuse of Authority (CIAA) and other government bodies, and official biographies. It names public officials, including judges and people accused in corruption cases, in connection with their public roles. Much of what we show is aggregate statistics, such as how many cases a court or a justice has decided and how long cases take.
              </p>
              <p>
                If you believe something on these sites is wrong, or you want to respond to what they say about you, contact us using the details in Section 14.
              </p>

              <h3 id="accounts-and-sign-in">2.7 Accounts and Sign-In</h3>
              <p>
                Most of the Platform needs no account. You need one only to use services that require sign-in: Jawafdehi Chat (chat.jawafdehi.org) and the signed-in tools of our MCP connector (api.jawafdehi.org/mcp, which lets AI assistants such as Claude or ChatGPT read the archive). Sign-in is handled by our own sign-in service at auth.jawafdehi.org. Our team also uses it to reach internal tools such as the caseworker portal; the staff notice covers those.
              </p>
              <p>
                When you create an account, we collect your name, email address, and password (stored in a scrambled form we cannot read), and, if you turn it on, two-factor authentication details. If you sign in with Google instead, Google tells us your name, email address, and profile picture. We also keep a record of sign-ins (time, IP address, and browser) for security. We use this information only to let you sign in, decide what you are allowed to do, keep accounts secure, and contact you about your account.
              </p>
              <p>
                You can use the MCP connector without an account, in which case you get read-only access to the same public data that is on our websites. When you are signed in, what you ask the connector to do is linked to your account (see Section 2.9).
              </p>

              <h3 id="contacting-us">2.8 When You Contact Us</h3>
              <p>
                If you email us (for example at <a href="mailto:inquiry@jawafdehi.org" className="text-primary hover:underline">inquiry@jawafdehi.org</a>, <a href="mailto:privacy@jawafdehi.org" className="text-primary hover:underline">privacy@jawafdehi.org</a>, or <a href="mailto:report@jawafdehi.org" className="text-primary hover:underline">report@jawafdehi.org</a>), we receive your email address, your name if you include it, and whatever you write. These addresses all reach the same small team.
              </p>
              <p>
                If you message us on WhatsApp, we see your phone number, your WhatsApp profile name and picture, and your messages. WhatsApp is run by Meta, and your use of it is governed by WhatsApp's own terms and privacy policy, not ours. If you are concerned about your safety, consider whether WhatsApp is the right channel for you (see Section 7).
              </p>
              <p>
                We use what you send us only to reply to you and to deal with what you raised.
              </p>

              <h3 id="keeping-people-safe">2.9 Keeping the People in Our Archive Safe</h3>
              <p>
                Jawafdehi is about real people and organisations. To help keep them safe, our servers may record what is searched for or viewed about them, and who the request came from: your IP address, and your account when you're signed in. This applies everywhere on the Platform, including jawafdehi.org, our public API and our MCP connector. These records are kept on our servers, not in cookies, so your cookie-banner choice doesn't change them.
              </p>
              <p>
                We may also count how much data you use, for subscriptions. Any charge would be based only on the amount and type of data, never on what you searched.
              </p>
              <p>
                We use these records only to protect the people in our archive, to stop misuse, and to improve our search. We never use them for advertising, and we don't sell or share them. Only a small number of Jawafdehi staff can see them. We keep IP addresses for up to a year and everything else for up to 13 months.
              </p>

              <h2 id="cookies">3. Cookies</h2>
              <p>
                The Platform uses the following cookies and similar technologies:
              </p>
              <ul>
                <li><strong>Essential cookies and browser storage</strong>: On jawafdehi.org and research.jawafdehi.org, your language preference (English or Nepali) is saved in your browser. jawafdehi.org also saves your cookie-banner choice and whether you have dismissed the newsletter prompt. If you sign in (Section 2.7), the sign-in service and the service you are using keep you signed in with a cookie or browser storage. On some services, Cloudflare sets a load-balancing cookie (<code>__cflb</code>) so that your visit stays on one server. These are necessary for the site to function and are not used for tracking.</li>
                <li><strong>Analytics cookies (optional)</strong>: Set by Google Analytics on jawafdehi.org only after you opt in. These help us understand site usage. They are never set if you decline. Cloudflare Web Analytics (Section 2.3) sets no cookies.</li>
              </ul>
              <p>
                We do not use advertising cookies or third-party advertising networks.
              </p>

              <h2 id="consent">4. Your Consent Choices</h2>
              <p>
                When you first visit jawafdehi.org, we ask whether you consent to analytics cookies. You may accept or decline, and declining does not limit your access to the Platform. You can change your decision later by clearing your browser storage for jawafdehi.org, which will prompt the consent banner again. Essential cookies do not require consent because the site cannot function without them. Our other sites set no optional cookies, so they do not show a banner.
              </p>

              <h2 id="how-we-use-information">5. How We Use Information and Legal Bases</h2>
              <p>We use collected information to:</p>
              <ul>
                <li>Process feedback, allegation reports, and volunteer submissions, and respond to inquiries</li>
                <li>Provide and secure accounts for services that need sign-in</li>
                <li>Operate, maintain, and improve the Platform</li>
                <li>Monitor security and prevent abuse</li>
                <li>Protect the people in our archive, stop misuse, and improve our search, using the records described in Section 2.9</li>
                <li>Publish and maintain the public corruption case archive and our research</li>
                <li>Understand site usage: cookieless, aggregate counts on all sites, and Google Analytics on jawafdehi.org where you have consented</li>
              </ul>
              <p>
                For visitors in the European Economic Area, United Kingdom, and other regions with similar laws, our legal bases for processing are: your <strong>consent</strong> (analytics cookies); our <strong>legitimate interests</strong> (operating and securing the Platform and the accounts you ask us to create, error monitoring, preventing abuse, protecting the people in our archive from misuse and improving our search (Section 2.9), and responding to submissions and messages you send us); and the performance of tasks carried out in the <strong>public interest</strong> (documenting, archiving, and analysing publicly available corruption and court records).
              </p>
              <p>
                We never sell, rent, or share personal information with third parties for commercial purposes.
              </p>

              <h2 id="ai-processing">6. Automated and AI Processing</h2>
              <p>
                To document and summarize corruption cases drawn from public records, we use third-party large language model services, including Anthropic's Claude. Published case data on the Platform is compiled from publicly available records and may be processed in this way.
              </p>
              <p>
                We may also use AI services to help process and triage <strong>allegation reports</strong> that you submit. We do <strong>not</strong> send the content of general <strong>feedback submissions</strong> to AI services. Where we use Anthropic's Claude, submitted content is processed under Anthropic's commercial terms and is <strong>not used to train their models</strong>. Decisions that materially affect individuals are reviewed by humans; we do not rely solely on automated processing for such decisions.
              </p>

              <h2 id="source-protection">7. Source and Whistleblower Protection</h2>
              <p>
                We recognize that people who report corruption may face risk. You may submit allegation reports anonymously, and we do not require you to provide your name or email. We minimize the personal data we collect, limit access to submissions to authorized personnel, and do not publish the identity of a source without their informed consent. Server logs that may contain IP addresses are retained only briefly for security purposes (see Section 10). If you are concerned about your safety, we encourage you to avoid including identifying details in your submission and to use privacy-protective tools (such as the Tor Browser) when accessing the Platform.
              </p>

              <h2 id="data-storage-and-security">8. Data Storage, Security, and International Transfers</h2>
              <p>
                The Platform runs on self-hosted infrastructure operated across multiple cloud providers (see Section 9), located primarily in the United States, with error-monitoring data processed in the European Union. We take reasonable technical and organizational measures to protect data against unauthorized access, alteration, or destruction.
              </p>
              <p>
                Because we and our service providers operate internationally, your information may be transferred to and processed in countries other than your own, including the United States. Where required, such transfers are carried out under appropriate safeguards, such as the European Commission's Standard Contractual Clauses.
              </p>

              <h2 id="third-party-services">9. Service Providers and Sub-Processors</h2>
              <p>
                We rely on the following service providers, which may process limited data on our behalf:
              </p>
              <ul>
                <li><strong>Cloudflare</strong>: DNS, CDN, DDoS protection, object storage, hosting of our research and data sites, and cookieless web analytics.</li>
                <li><strong>Oracle Cloud Infrastructure</strong> and <strong>Monal Cloud</strong>: compute hosting for the Platform.</li>
                <li><strong>Amazon Web Services (AWS)</strong>: transactional and newsletter email delivery.</li>
                <li><strong>Google Workspace</strong>: our email, including messages you send to our addresses.</li>
                <li><strong>Google Cloud</strong>: supporting infrastructure services.</li>
                <li><strong>Google Analytics</strong>: usage analytics on jawafdehi.org (only with your consent).</li>
                <li><strong>Google Fonts</strong>: web fonts on research.jawafdehi.org and give.jawafdehi.org.</li>
                <li><strong>Google Sign-In</strong>: only if you choose to sign in with your Google account.</li>
                <li><strong>WhatsApp (Meta)</strong>: only if you choose to message us on WhatsApp.</li>
                <li><strong>Sentry</strong>: error and performance monitoring (EU region).</li>
                <li><strong>Anthropic</strong>: AI processing of public case data and, where applicable, allegation reports (not used to train models).</li>
                <li><strong>UptimeRobot</strong>: external uptime monitoring.</li>
              </ul>
              <p>
                Links to external websites (e.g., GitHub, social media) are governed by their respective privacy policies.
              </p>

              <h2 id="data-retention">10. Data Retention</h2>
              <p>We retain information only as long as needed for the purposes described above:</p>
              <ul>
                <li><strong>Edge and access logs</strong>: up to 30 days.</li>
                <li><strong>Application and security logs</strong>: up to 90 days.</li>
                <li><strong>Error-monitoring (Sentry) events</strong>: up to 90 days.</li>
                <li><strong>Records of what is searched for and viewed (Section 2.9)</strong>: IP addresses kept for up to 1 year; the rest for up to 13 months.</li>
                <li><strong>Analytics data</strong>: up to 14 months.</li>
                <li><strong>Feedback submissions</strong>: up to 24 months, then deleted unless tied to a published case.</li>
                <li><strong>Allegation reports</strong>: retained for the life of any resulting public record; otherwise purged when closed without action.</li>
                <li><strong>Volunteer applications</strong>: until no longer needed or upon your request to withdraw.</li>
                <li><strong>Accounts</strong>: deleted 1 year after you close your account, or after 1 year without use, unless we need to keep them longer for legal, accounting, or safety reasons. You can ask us to delete your account sooner at any time.</li>
                <li><strong>Emails and WhatsApp messages to us</strong>: kept for 1 year, then deleted, unless we need to keep them longer for legal, accounting, or safety reasons (for example, records of donations, which we keep as long as tax law requires).</li>
                <li><strong>Published case data</strong>: retained indefinitely as part of the permanent public-interest archive.</li>
                <li><strong>Backups</strong>: deletions propagate as backups cycle out, within approximately 90 days.</li>
              </ul>

              <h2 id="your-rights">11. Your Privacy Rights</h2>
              <p>
                Depending on where you live, you may have some or all of the following rights regarding your personal information:
              </p>
              <ul>
                <li><strong>Access / know</strong>: the categories and specific pieces of personal information we hold about you and how we use it.</li>
                <li><strong>Deletion</strong>: request that we delete your personal information.</li>
                <li><strong>Correction</strong>: request that we correct inaccurate personal information.</li>
                <li><strong>Portability</strong>: receive a copy of certain information in a portable format.</li>
                <li><strong>Restriction / objection</strong>: restrict or object to certain processing.</li>
                <li><strong>Withdraw consent</strong>: withdraw analytics consent at any time.</li>
                <li><strong>Non-discrimination</strong>: we will not discriminate against you for exercising your rights.</li>
              </ul>
              <p>
                <strong>California residents (CCPA/CPRA)</strong>: As a nonprofit organization, we are generally not subject to the CCPA/CPRA, but we voluntarily extend these protections to California residents. We do not sell your personal information and do not share it for cross-context behavioral advertising. You may exercise the rights above, and you may use an authorized agent to do so.
              </p>
              <p>
                <strong>EEA / UK residents (GDPR)</strong>: In addition to the rights above, you have the right to lodge a complaint with your local data protection supervisory authority.
              </p>
              <p>
                To exercise any of these rights, email <a href="mailto:privacy@jawafdehi.org" className="text-primary hover:underline">privacy@jawafdehi.org</a> or use our <a href="/feedback" className="text-primary hover:underline">Feedback page</a>. We will verify your request and respond within the timeframes required by applicable law.
              </p>

              <h2 id="childrens-privacy">12. Children's Privacy</h2>
              <p>
                The Platform is not directed at children under 16, and we do not knowingly collect personal information from them. If you believe a child has provided us with personal data, please contact us at <a href="mailto:privacy@jawafdehi.org" className="text-primary hover:underline">privacy@jawafdehi.org</a> and we will delete it.
              </p>

              <h2 id="policy-changes">13. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. We encourage you to review this policy periodically.
              </p>

              <h2 id="contact">14. Contact</h2>
              <p>
                For questions about this Privacy Policy or to exercise your rights, contact us at <a href="mailto:privacy@jawafdehi.org" className="text-primary hover:underline">privacy@jawafdehi.org</a> or through our <a href="/feedback" className="text-primary hover:underline">Feedback page</a>. For anything else, including our research and data sites, write to <a href="mailto:inquiry@jawafdehi.org" className="text-primary hover:underline">inquiry@jawafdehi.org</a> or message us on <a href="https://api.whatsapp.com/send?phone=9779768630501" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WhatsApp at +977 976-8630501</a> (see Section 2.8).
              </p>
            </div>
          </div>
        </section>
      </main>    </div>
  );
};

export default Privacy;
