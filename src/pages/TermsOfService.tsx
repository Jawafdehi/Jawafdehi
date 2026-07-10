import { Helmet } from "react-helmet-async";

const TermsOfService = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Jawafdehi Initiative Terms of Service</title>
        <meta name="description" content="Jawafdehi's terms of service — guidelines for using Nepal's open corruption accountability platform and public case archive." />
        <link rel="canonical" href="https://jawafdehi.org/terms" />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/terms" />
        <meta property="og:title" content="Jawafdehi Initiative Terms of Service" />
        <meta property="og:description" content="Jawafdehi's terms of service — guidelines for using Nepal's open corruption accountability platform and public case archive." />
        <meta property="og:image" content="https://jawafdehi.org/assets/social-preview.png" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Jawafdehi Initiative Terms of Service" />
        <meta name="twitter:description" content="Jawafdehi's terms of service — guidelines for using Nepal's open corruption accountability platform and public case archive." />
        <meta name="twitter:image" content="https://jawafdehi.org/assets/social-preview.png" />
      </Helmet>

      <main id="main-content" className="flex-1">
        <section id="terms-hero" className="bg-gradient-to-br from-primary via-navy-dark to-slate-800 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
                Jawafdehi Initiative Terms of Service
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
              <h2 id="acceptance">1. Acceptance of Terms</h2>
              <p>
                By accessing or using jawafdehi.org ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform.
              </p>

              <h2 id="about-jawafdehi">2. About Jawafdehi</h2>
              <p>
                The Platform is operated by Jawafdehi Initiative Inc., a Michigan public benefit nonprofit corporation. Jawafdehi is Nepal's open corruption accountability platform. We document, simplify, and permanently archive CIAA (Commission for the Investigation of Abuse of Authority) corruption cases. All published case data is in the public domain and is provided for public interest, transparency, and accountability purposes.
              </p>
              <p>
                Jawafdehi is an open-source project run with the help of volunteers. We are not a government entity, law firm, or legal authority. We do not provide legal advice.
              </p>

              <h2 id="platform-use">3. Use of the Platform</h2>

              <h3 id="permitted-use">3.1 Permitted Use</h3>
              <p>You may use the Platform to:</p>
              <ul>
                <li>Browse and search public corruption case records</li>
                <li>Submit feedback through our designated forms</li>
                <li>Report allegations through our designated submission forms</li>
                <li>Volunteer and contribute to the project</li>
                <li>Share and reference public case information with proper attribution</li>
              </ul>

              <h3 id="prohibited-conduct">3.2 Prohibited Conduct</h3>
              <p>You agree not to:</p>
              <ul>
                <li>Submit false, misleading, or fraudulent information through any Platform form</li>
                <li>Use the Platform to harass, defame, or threaten any individual or entity</li>
                <li>Attempt to gain unauthorized access to any part of the Platform or its systems</li>
                <li>Use automated tools to scrape, crawl, or overload the Platform in a way that degrades service for other users</li>
                <li>Impersonate any person or entity, or misrepresent your affiliation</li>
                <li>Use the Platform for any unlawful purpose</li>
              </ul>

              <h3 id="connected-social-accounts">3.3 Connected Social Media Accounts</h3>
              <p>
                We use third-party tools to manage and publish content to social media accounts that we operate (including TikTok). Our use of those accounts and the platforms' developer interfaces is additionally subject to the terms of service and policies of each platform, including those of TikTok. Information accessed through these integrations is described in our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
              </p>

              <h2 id="public-domain-data">4. Public Domain Data</h2>
              <p>
                All published case records, summaries, and related data on the Platform are in the public domain. You may freely use, share, and reference this information. We encourage attribution to Jawafdehi.org when using our data, but it is not required.
              </p>
              <p>
                User-submitted information (feedback, allegations, volunteer applications) is handled according to our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
              </p>

              <h2 id="content-accuracy">5. Content Accuracy</h2>
              <p>
                We strive for accuracy through rigorous sourcing from official documents and human review. However:
              </p>
              <ul>
                <li>Case information is based on publicly available records and may not reflect the most current legal status</li>
                <li>We do not guarantee the completeness or accuracy of all content</li>
                <li>Information on the Platform should not be treated as legal fact or used as the sole basis for legal decisions</li>
              </ul>
              <p>
                If you believe any information is inaccurate, please use our <a href="/feedback" className="text-primary hover:underline">Feedback page</a>.
              </p>

              <h2 id="intellectual-property">6. Intellectual Property</h2>
              <p>
                The Jawafdehi platform codebase is open source and available on <a href="https://github.com/Jawafdehi" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub</a>. The Jawafdehi name, logo, and branding are property of the Jawafdehi project. Case data published on the platform is in the public domain.
              </p>

              <h2 id="disclaimer">7. Disclaimer of Warranties</h2>
              <p>
                The Platform is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the Platform will be uninterrupted, error-free, or free of harmful components.
              </p>

              <h2 id="liability">8. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by applicable law, Jawafdehi, its volunteers, and contributors shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of or inability to use the Platform.
              </p>

              <h2 id="indemnification">9. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless Jawafdehi, its volunteers, and contributors from any claims, damages, or expenses arising from your use of the Platform or violation of these Terms.
              </p>

              <h2 id="third-party-links">10. Third-Party Links</h2>
              <p>
                The Platform may contain links to third-party websites (e.g., CIAA, Nepali government portals, GitHub, social media). We are not responsible for the content or practices of these external sites.
              </p>

              <h2 id="terms-changes">11. Modifications to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. Changes will be posted on this page with an updated "Last updated" date. Continued use of the Platform after changes constitutes acceptance of the modified Terms.
              </p>

              <h2 id="governing-law">12. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the State of Michigan, United States, without regard to its conflict-of-laws principles. Any disputes arising from these Terms shall be subject to the jurisdiction of the state and federal courts located in Michigan.
              </p>

              <h2 id="contact">13. Contact</h2>
              <p>
                For questions about these Terms, please use our <a href="/feedback" className="text-primary hover:underline">Feedback page</a>.
              </p>
            </div>
          </div>
        </section>
      </main>    </div>
  );
};

export default TermsOfService;
