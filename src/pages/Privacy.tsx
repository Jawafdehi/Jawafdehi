import { Helmet } from "react-helmet-async";

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Jawafdehi Initiative Privacy Policy</title>
        <meta name="description" content="Jawafdehi's privacy policy — how we handle data, cookies, analytics, and user information on Nepal's open corruption accountability platform." />
        <link rel="canonical" href="https://jawafdehi.org/privacy" />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/privacy" />
        <meta property="og:title" content="Jawafdehi Initiative Privacy Policy" />
        <meta property="og:description" content="Jawafdehi's privacy policy — how we handle data, cookies, analytics, and user information on Nepal's open corruption accountability platform." />
        <meta property="og:image" content="https://jawafdehi.org/og-favicon.png" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Jawafdehi Initiative Privacy Policy" />
        <meta name="twitter:description" content="Jawafdehi's privacy policy — how we handle data, cookies, analytics, and user information on Nepal's open corruption accountability platform." />
        <meta name="twitter:image" content="https://jawafdehi.org/og-favicon.png" />
      </Helmet>

      <main id="main-content" className="flex-1">
        <section id="privacy-hero" className="bg-gradient-to-br from-primary via-navy-dark to-slate-800 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
                Jawafdehi Initiative Privacy Policy
              </h1>
              <p className="text-xl text-primary-foreground/80 leading-relaxed">
                Last updated: June 23, 2026
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
              {/*
                NOTE FOR COUNSEL REVIEW (remove before publish):
                - Confirm registered Michigan mailing address for CCPA/GDPR contact.
                - Confirm whether an EU/UK Article 27 representative is required.
                - Confirm CCPA applicability thresholds for a nonprofit.
              */}

              <h2 id="overview">1. Overview</h2>
              <p>
                This Privacy Policy explains how Jawafdehi Initiative Inc., a Michigan public benefit nonprofit corporation ("Jawafdehi", "we", "our", or "us"), collects, uses, shares, and protects information when you use the jawafdehi.org website and related services (the "Platform"). We believe in minimal data collection and maximum transparency — consistent with our mission as Nepal's open corruption accountability platform.
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
                <li>Any information you choose to include in your submission</li>
              </ul>
              <p>
                All submissions are voluntary. You may submit feedback or allegation reports anonymously.
              </p>

              <h3 id="automatically-collected-information">2.2 Automatically Collected Information</h3>
              <p>
                When you visit jawafdehi.org, our infrastructure automatically collects standard server logs that may include:
              </p>
              <ul>
                <li>IP address (temporarily logged for security and debugging)</li>
                <li>Browser type and version</li>
                <li>Pages visited and time spent</li>
                <li>Referring URL</li>
              </ul>

              <h3 id="analytics-data">2.3 Analytics Data</h3>
              <p>
                With your consent, we use Google Analytics 4 to understand how visitors use the Platform (for example, which pages are viewed). Google Analytics sets cookies and processes usage data. Google Analytics 4 does not log or store full IP addresses, and we do not use Google Analytics for advertising or cross-context behavioral tracking. Analytics do not load and no analytics cookies are set unless you opt in through our cookie banner. You can decline analytics at any time without affecting your use of the Platform (see Section 4).
              </p>

              <h3 id="error-monitoring">2.4 Error Monitoring</h3>
              <p>
                We use Sentry to detect and diagnose technical errors so we can keep the Platform working. Sentry captures error and diagnostic data when something goes wrong. We have configured Sentry to minimize personal data: we do not send IP addresses or other personal identifiers by default, text is masked, and media is blocked in any captured diagnostics. We rely on this strictly for reliability and security (our legitimate interest) and do not use it to profile or track you.
              </p>

              <h3 id="social-media-integration">2.5 Social Media Account Integration</h3>
              <p>
                To publish Jawafdehi Initiative's own content, we connect our organization's own social media accounts (including TikTok) to a self-hosted social media scheduling tool. Through a platform's official API, and only for accounts we ourselves own and connect, we may access basic profile information (such as account ID, display name, and avatar), account statistics (such as follower, like, and video counts), and the list of our own published videos, and we may upload videos we create as drafts for further editing and publishing on the platform. We do not access, collect, or store information belonging to any other users of those platforms. Information obtained through these integrations is used solely to manage our own accounts and is also subject to the terms and privacy policies of the relevant platform, including those of TikTok.
              </p>

              <h2 id="cookies">3. Cookies</h2>
              <p>
                Jawafdehi.org uses the following cookies and similar technologies:
              </p>
              <ul>
                <li><strong>Essential cookies</strong>: A language preference cookie (English or Nepali) and, if you access the caseworker portal, a session cookie for authentication. These are necessary for the site to function and are not used for tracking.</li>
                <li><strong>Analytics cookies (optional)</strong>: Set by Google Analytics only after you opt in. These help us understand site usage. They are never set if you decline.</li>
              </ul>
              <p>
                We do not use advertising cookies or third-party advertising networks.
              </p>

              <h2 id="consent">4. Your Consent Choices</h2>
              <p>
                When you first visit the Platform, we ask whether you consent to analytics cookies. You may accept or decline, and declining does not limit your access to the Platform. You can change your decision later by clearing your browser storage for jawafdehi.org, which will prompt the consent banner again. Essential cookies do not require consent because the site cannot function without them.
              </p>

              <h2 id="how-we-use-information">5. How We Use Information and Legal Bases</h2>
              <p>We use collected information to:</p>
              <ul>
                <li>Process feedback, allegation reports, and volunteer submissions, and respond to inquiries</li>
                <li>Operate, maintain, and improve the Platform</li>
                <li>Monitor security and prevent abuse</li>
                <li>Publish and maintain the public corruption case archive</li>
                <li>Understand site usage (analytics), where you have consented</li>
              </ul>
              <p>
                For visitors in the European Economic Area, United Kingdom, and other regions with similar laws, our legal bases for processing are: your <strong>consent</strong> (analytics cookies); our <strong>legitimate interests</strong> (operating and securing the Platform, error monitoring, preventing abuse, and responding to submissions you send us); and the performance of tasks carried out in the <strong>public interest</strong> (documenting and archiving public-domain corruption records).
              </p>
              <p>
                We never sell, rent, or share personal information with third parties for commercial purposes.
              </p>

              <h2 id="ai-processing">6. Automated and AI Processing</h2>
              <p>
                To document and summarize corruption cases drawn from public records, we use third-party large language model services, including Anthropic's Claude. Published case data on the Platform is in the public domain and may be processed in this way.
              </p>
              <p>
                We may also use AI services to help process and triage <strong>allegation reports</strong> that you submit. We do <strong>not</strong> send the content of general <strong>feedback submissions</strong> to AI services. Where we use Anthropic's Claude, submitted content is processed under Anthropic's commercial terms and is <strong>not used to train their models</strong>. Decisions that materially affect individuals are reviewed by humans; we do not rely solely on automated processing for such decisions.
              </p>

              <h2 id="source-protection">7. Source and Whistleblower Protection</h2>
              <p>
                We recognize that people who report corruption may face risk. You may submit allegation reports anonymously, and we do not require you to provide your name or email. We minimize the personal data we collect, limit access to submissions to authorized personnel, and do not publish the identity of a source without their informed consent. Server logs that may contain IP addresses are retained only briefly for security purposes (see Section 9). If you are concerned about your safety, we encourage you to avoid including identifying details in your submission and to use privacy-protective tools (such as the Tor Browser) when accessing the Platform.
              </p>

              <h2 id="data-storage-and-security">8. Data Storage, Security, and International Transfers</h2>
              <p>
                The Platform runs on self-hosted infrastructure operated across multiple cloud providers (see Section 10), located primarily in the United States, with error-monitoring data processed in the European Union. We take reasonable technical and organizational measures to protect data against unauthorized access, alteration, or destruction.
              </p>
              <p>
                Because we and our service providers operate internationally, your information may be transferred to and processed in countries other than your own, including the United States. Where required, such transfers are carried out under appropriate safeguards, such as the European Commission's Standard Contractual Clauses.
              </p>

              <h2 id="third-party-services">9. Service Providers and Sub-Processors</h2>
              <p>
                We rely on the following service providers, which may process limited data on our behalf:
              </p>
              <ul>
                <li><strong>Cloudflare</strong>: DNS, CDN, DDoS protection, and object storage.</li>
                <li><strong>Oracle Cloud Infrastructure</strong> and <strong>Monal Cloud</strong>: compute hosting for the Platform.</li>
                <li><strong>Amazon Web Services (AWS)</strong>: transactional and newsletter email delivery.</li>
                <li><strong>Google Cloud</strong>: supporting infrastructure services.</li>
                <li><strong>Google Analytics</strong>: usage analytics (only with your consent).</li>
                <li><strong>Sentry</strong>: error and performance monitoring (EU region).</li>
                <li><strong>Anthropic</strong>: AI processing of public case data and, where applicable, allegation reports (not used to train models).</li>
                <li><strong>UptimeRobot</strong>: external uptime monitoring.</li>
              </ul>
              <p>
                Links to external websites (e.g., GitHub, social media, Let's Build Nepal) are governed by their respective privacy policies.
              </p>

              <h2 id="data-retention">10. Data Retention</h2>
              <p>We retain information only as long as needed for the purposes described above:</p>
              <ul>
                <li><strong>Edge and access logs</strong>: up to 30 days.</li>
                <li><strong>Application and security logs</strong>: up to 90 days.</li>
                <li><strong>Error-monitoring (Sentry) events</strong>: up to 90 days.</li>
                <li><strong>Analytics data</strong>: up to 14 months.</li>
                <li><strong>Feedback submissions</strong>: up to 24 months, then deleted unless tied to a published case.</li>
                <li><strong>Allegation reports</strong>: retained for the life of any resulting public record; otherwise purged when closed without action.</li>
                <li><strong>Volunteer applications</strong>: until no longer needed or upon your request to withdraw.</li>
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
                For questions about this Privacy Policy or to exercise your rights, contact us at <a href="mailto:privacy@jawafdehi.org" className="text-primary hover:underline">privacy@jawafdehi.org</a> or through our <a href="/feedback" className="text-primary hover:underline">Feedback page</a>.
              </p>
            </div>
          </div>
        </section>
      </main>    </div>
  );
};

export default Privacy;
