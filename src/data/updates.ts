export interface Update {
    id: string;
    title: string;
    date: string;
    content: string;
    thumbnail?: string;
    pdfs?: {
        name: string;
        path: string;
    }[];
}

export const updates: Update[] = [
    {
        id: "2026-01-26-job-postings",
        title: "We're Hiring! Case Documentation Intern and Software Engineer Interns",
        date: "January 26, 2026 (२०८२ माघ १२)",
        content: `
We're expanding our team to strengthen Nepal's accountability infrastructure. Both positions are fully remote with flexible salary based on experience and match. We particularly encourage applications from candidates outside Kathmandu Valley and those from underrepresented backgrounds. A bachelor's degree (or currently pursuing) in relevant fields is preferred.

See example cases:
- Rabi Lamichhane cooperative fraud: [https://jawafdehi.org/case/207](https://jawafdehi.org/case/207)
- Giri Bandhu land swap scandal: [https://jawafdehi.org/case/175](https://jawafdehi.org/case/175)

**Case Documentation Intern** - We're looking for a detail-oriented researcher to help build a comprehensive corruption case database. You'll investigate corruption allegations from news sources, court documents, and public records, then structure this information into timelines with verified evidence. This role involves working with different tools to extract data from documents, cross-referencing sources for accuracy, and contributing to [Nepal Entity Service](https://nes.jawafdehi.org) and [Nepal Government Modernization](https://github.com/Jawafdehi/ngm) judicial data projects. You'll play a crucial role in documenting corruption and building Nepal's institutional memory against misconduct.

**Software Engineer (Intern/Junior)** - Join us in building the civic technology infrastructure that makes government data accessible to citizens. You'll work on open-source projects including [Jawafdehi.org](https://jawafdehi.org), [Nepal Entity Service (NES)](https://nes.jawafdehi.org), and [Nepal Government Modernization (NGM)](https://github.com/Jawafdehi/ngm), developing both frontend (React, TypeScript) and backend systems (Python, Django, FastAPI). The role emphasizes AI-assisted development methodologies, implementing OCR pipelines for Nepali documents, and collaborating with experienced engineers in a distributed team. This is an opportunity to contribute to real-world projects with direct social impact.

## How to Apply

**Email:** [inquiry@jawafdehi.org](mailto:inquiry@jawafdehi.org)

Include your resume, a brief introduction, and why you're interested in accountability work or civic technology.

For detailed job descriptions and requirements, see the attached flyers below.
`,
        pdfs: [
            {
                name: "Case Documentation Intern Position",
                path: "/assets/updates/2026-01-26-job-postings/case-documentation-intern-flyer.pdf",
            },
            {
                name: "Software Engineer Position",
                path: "/assets/updates/2026-01-26-job-postings/software-engineer-intern-flyer.pdf",
            }
        ]
    },
    {
        id: "2026-01-04-second-national-strategy-feedback",
        title: "Jawafdehi Submits Feedback on Nepal's Second National Anti-Corruption Strategy",
        date: "January 4, 2026 (२०८२ पुष २०)",
        content: `
We received an invitation from the Office of the Prime Minister and Council of Ministers to participate in a stakeholder consultation meeting for finalizing Nepal's Second National Strategy and Action Plan Against Corruption, 2082 (भ्रष्टाचार विरुद्धको दोस्रो राष्ट्रिय रणनीति तथा कार्ययोजना, २०८२).

We reviewed the draft strategy document and submitted our feedback at the meeting held in Singha Durbar, coordinated by the Chief Secretary.

In summary, we called for:

- Independent expert groups (legal experts, academics, journalists, civil society) in coordination mechanisms
- Clear rationale and measurable outcomes for proposed legal amendments
- Incorporation of the GenZ movement's demands, including a high-level asset investigation commission
- Digital infrastructure upgrades — high-bandwidth government websites, document digitization, and online court records
- Government funding for civic accountability initiatives to reduce foreign dependency

![Jawafdehi at the consultation meeting](/assets/updates/2026-01-04-meeting/2026-01-04-second-national-strategy-feedback.jpeg)
*Rohan representing Jawafdehi at the stakeholder consultation in Singha Durbar*

Moving forward, we remain committed to supporting the implementation of this strategy and will continue engaging with the government on anti-corruption efforts.
`,
        thumbnail: "/assets/updates/2026-01-04-meeting/2026-01-04-second-national-strategy-feedback.jpeg",
        pdfs: [
            {
                name: "Our Feedback Letter",
                path: "/assets/updates/2026-01-04-meeting/our-feedback.pdf",
            },
            {
                name: "Government Strategy Document (भ्रष्टाचार विरुद्धको दोस्रो राष्ट्रिय रणनीति तथा कार्ययोजना, २०८२)",
                path: "/assets/updates/2026-01-04-meeting/भ्रष्टाचार विरुद्धको दोस्रो राष्ट्रिय रणनीति तथा कार्ययोजना, २०८२.pdf",
            }
        ]
    }
];
