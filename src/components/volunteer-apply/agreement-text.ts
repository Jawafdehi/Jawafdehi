export const AGREEMENT_VERSION = "volunteer-agreement-np/2026-11";

export type Para = { text: string; lead?: string } | { list: string[] };

export type Clause = { n: number; title: string; body: Para[] };

export const ORGANISATION_PARTY =
  'जवाफदेही इनिशिएटिभ (Jawafdehi Initiative), a profit non-distributing company registered under the Companies Act, 2063, Office of Company Registrar registration no. 393949/82/83, affiliated with the Social Welfare Council under registration no. 59304, PAN 623632659, with its registered office at Biratnagar Metropolitan City Ward 5, Morang ("the Organisation")';

export const CLAUSES: Clause[] = [
  {
    n: 1,
    title: "What this Agreement is",
    body: [
      {
        text: "The Volunteer wishes to give their time and skills to the Organisation's work without payment, and the Organisation wishes to accept that help. This Agreement records the terms on which that happens. It is written down before the work starts so that neither side has to reconstruct it afterwards.",
      },
    ],
  },
  {
    n: 2,
    title: "The role",
    body: [
      { text: "The Volunteer's role is {{role}}." },
      {
        text: "The role is described in the role description at Annex A, which forms part of this Agreement. The role description sets out the purpose of the role, the tasks within it, the expected time commitment, and the person who supervises it.",
      },
      {
        text: "The Volunteer works within that role description. Work outside it is agreed in writing first, and the role description is updated to match. This matters more than it looks: the scope of the role is what bounds the Organisation's responsibility for what the Volunteer does, and it is what protects the Volunteer from being held to account for something nobody asked them to do.",
      },
    ],
  },
  {
    n: 3,
    title: "This is not employment",
    body: [
      { text: "The Parties agree and intend that:" },
      {
        list: [
          "The Volunteer serves voluntarily. No employment relationship, no contract of service, and no agency is created by this Agreement or by anything done under it.",
          "The Labour Act, 2074 and the Labour Rules, 2075 do not apply to this engagement, because there is no employment relation and no remuneration.",
          "The Contribution Based Social Security Act, 2074 does not apply, and the Organisation does not enrol the Volunteer in the Social Security Fund.",
          "There is no entitlement to remuneration, salary, wages, allowance, festival expense, gratuity, provident fund, leave, overtime, insurance, notice period, severance, or any other benefit payable to an employee.",
          "There are no fixed working hours and no obligation on the Volunteer to accept any particular task. The time given is the Volunteer's to offer.",
          "The Volunteer is free to hold other employment, engagements or studies, subject only to clause 11.",
        ],
      },
      {
        text: "The Volunteer confirms that they are not seeking and do not expect payment of any kind, and waives any claim to remuneration for work done under this Agreement.",
      },
    ],
  },
  {
    n: 4,
    title: "Expenses",
    body: [
      {
        text: "The Organisation does not reimburse expenses, and the Volunteer should expect to meet their own costs, including their own computer, internet connection and phone.",
      },
      {
        text: "The single exception: where a task genuinely requires the Volunteer to spend money — travel to a court registry or a government office to collect a document, a statutory copying fee — the cost is approved in writing in advance by the Chairperson, and the Volunteer is then reimbursed on production of the receipt. A reimbursement under this clause repays a cost the Volunteer incurred for the Organisation. It is not payment for their time, and it does not change clause 3.",
      },
      {
        text: "Nothing is reimbursed without the prior written approval. Approval after the fact is not available, which is why the approval has to be asked for before the money is spent.",
      },
    ],
  },
  {
    n: 5,
    title: "Term, and ending the arrangement",
    body: [
      { text: "This Agreement starts on {{startDate}} and continues until either Party ends it." },
      {
        text: "Either Party may end it at any time, for any reason or for none, by telling the other in writing. There is no notice period and no payment on ending, by either side.",
      },
      { text: "When the arrangement ends:" },
      {
        list: [
          "The Organisation confirms in writing that service has ended, and the date.",
          "All access the Volunteer holds to the Organisation's systems and accounts is withdrawn.",
          "The Volunteer hands over anything they are in the middle of, and returns or deletes any Organisation material held outside the Organisation's systems.",
          "Clauses 6, 7, 8 and 15 continue to apply after the end, as stated in those clauses.",
        ],
      },
    ],
  },
  {
    n: 6,
    title: "Intellectual property",
    body: [
      {
        text: "This clause is the reason the Agreement has to be signed before work begins rather than at some convenient later point.",
      },
      {
        lead: "Assignment.",
        text: "The Volunteer hereby assigns to the Organisation, with effect from the moment each work is created, the entire copyright and all other intellectual property rights, worldwide and for the full term of those rights, in everything the Volunteer creates in the course of their role. This is a present assignment, not a promise to assign something later.",
      },
      {
        lead: "What it covers.",
        text: "Written text, case drafts and research notes, translations, photographs, illustrations and designs, audio and video, software code, datasets and compilations, and anything else produced in the role.",
      },
      {
        lead: "Consideration.",
        text: "The Organisation gives the Volunteer access to its systems, tools, data and training, and the opportunity to contribute to its published work. The Parties agree that this is the consideration for the assignment in this clause.",
      },
      {
        lead: "Moral rights.",
        text: "Nepali law treats an author's moral rights as personal to the author, and this Agreement does not purport to take them away. What the Volunteer does agree, so far as the law allows, is that the Organisation may publish, edit, cut, translate, adapt and reuse the work, and may publish it under the Organisation's name, under the Volunteer's name, or without any name, as the Organisation decides. Attribution practice is the Organisation's to set.",
      },
      {
        lead: "Pre-existing and third-party material.",
        text: "Where the Volunteer brings in something they made earlier, or something owned by somebody else, they say so at the time. The Volunteer grants the Organisation a free, irrevocable, worldwide licence to use their own pre-existing material to the extent it is built into work done in the role. The Volunteer confirms that nothing they hand over knowingly infringes anybody else's rights, and that any third-party material is identified so that its licensing can be checked. The image and media reuse policy governs how the Organisation handles third-party images and media.",
      },
      {
        lead: "Further assurance.",
        text: "If a document, registration or signature is later needed to perfect or record the Organisation's ownership, the Volunteer signs it.",
      },
      { lead: "Survival.", text: "This clause survives the end of this Agreement." },
    ],
  },
  {
    n: 7,
    title: "Confidentiality",
    body: [
      {
        lead: "What is confidential.",
        text: "Anything the Volunteer learns or sees through the role that is not already public. In particular:",
      },
      {
        list: [
          "The identity of any source or any person who has submitted an allegation, and anything that could identify them.",
          "Allegations and submissions received by the Organisation.",
          "Unpublished case drafts, unpublished research, and materials marked private or internal.",
          "Internal deliberations, including editorial decisions, board and meeting discussions, and legal advice.",
          "Personal data held by the Organisation, including the contact database and the records of other volunteers, staff and consultants.",
          "Records held in the Organisation's court data systems, which include a large volume of sensitive family and gender-based-violence records that have nothing to do with accountability work and are not ours to spread.",
          "Credentials, security arrangements, and information about how the Organisation's systems are protected.",
        ],
      },
      {
        lead: "The obligation.",
        text: "The Volunteer keeps all of this confidential, uses it only for the role, and does not disclose it to anyone — including family, friends, journalists, or another employer — without written authorisation.",
      },
      {
        lead: "What is not caught.",
        text: "Information that is already public otherwise than through the Volunteer's own breach, information the Volunteer already lawfully held, and disclosure that the law or a court requires. Where a disclosure is being required of the Volunteer by law, they tell the Organisation first if they are permitted to.",
      },
      {
        lead: "Survival.",
        text: "This clause continues to apply without time limit after service ends. Source protection in particular is permanent.",
      },
    ],
  },
  {
    n: 8,
    title: "Personal data",
    body: [
      {
        text: "The Volunteer handles personal data in line with the Individual Privacy Act, 2075 and the Organisation's digital privacy policy.",
      },
      {
        text: "Personal data is not copied out of the Organisation's systems, not sent to personal email or personal messaging accounts, and not kept after the role ends.",
      },
    ],
  },
  {
    n: 9,
    title: "Authority, and speaking publicly",
    body: [
      {
        text: "The Volunteer has no authority to enter into any commitment on the Organisation's behalf, to bind it, or to incur any liability for it.",
      },
      {
        text: 'The Volunteer does not speak for the Organisation publicly. That means no press interviews, no podcasts or public panels as a representative of the Organisation, no posting from its official accounts, and no answering "what is Jawafdehi\'s position on this". Those sit with the Chairperson or with whoever the Chairperson names.',
      },
      { text: "Three things are outside every volunteer role here, and the Volunteer does not take them on:" },
      {
        list: [
          "Contact with sources, or with anyone who has submitted an allegation. This is the one area where a mistake harms a person rather than the Organisation, and there is no supervised version of it for a volunteer.",
          "Soliciting or handling donations, and representing the Organisation to donors.",
          "Any statement about a case that is not yet published.",
        ],
      },
      {
        text: "The Volunteer's own speech in their own name, on their own account, about matters unconnected to the Organisation's unpublished work, is their own business. What this clause asks is that they do not do it in the Organisation's voice.",
      },
    ],
  },
  {
    n: 10,
    title: "Policies the Volunteer agrees to follow",
    body: [
      { text: "The Volunteer confirms they have been given, have read, and will follow:" },
      { list: ["The Code of Conduct.", "The digital privacy policy.", "The image and media reuse policy."] },
      {
        text: "Those three, and any other policy the Organisation gives the Volunteer in writing and asks them to follow. The Volunteer is not bound by internal documents they have not been given — if the Organisation wants a policy to apply, it hands it over.",
      },
      { text: "Annex B lists what was given, with the version and the date." },
    ],
  },
  {
    n: 11,
    title: "Conflicts of interest",
    body: [
      {
        text: "The Organisation publishes about corruption, and a volunteer's outside interests can create a real problem or the appearance of one. Both matter.",
      },
      { text: "The Volunteer tells their supervisor, in writing and as soon as they know, about:" },
      {
        list: [
          "Any holding of public office, or any position in a political party.",
          "Any employment, consultancy or business relationship with a person or institution that is the subject of a Jawafdehi case, or is likely to become one.",
          "Any family or close personal relationship with such a person.",
          "Any other interest that a reasonable person would think could affect the Volunteer's work here.",
        ],
      },
      {
        text: "Disclosing something is not a problem in itself. Not disclosing it is. The usual answer is that the Volunteer steps back from the particular case and carries on with everything else.",
      },
    ],
  },
  {
    n: 12,
    title: "Working remotely, and the Organisation's systems",
    body: [
      { text: "The Volunteer works from their own device. The Organisation issues no hardware." },
      {
        text: "The trade for that is that the work stays inside the Organisation's systems: no local copies of unpublished case material, no exports to personal cloud storage, no case material in personal email or personal messaging. Where a task genuinely needs a local file, it is deleted when the task is finished.",
      },
      {
        text: "Accounts issued to the Volunteer are personal to them. Credentials are not shared and not reused. Access is granted for the role and is withdrawn when the role ends.",
      },
      {
        text: "The Organisation provides access to third-party AI tools for some roles. Anything put into them leaves the Organisation's systems, so unpublished case material, source identities, private materials and court records do not go into them. This is the ordinary application of the digital privacy policy, and it matters most on a personal device.",
      },
    ],
  },
  {
    n: 13,
    title: "No insurance",
    body: [
      {
        text: "The Organisation carries no insurance covering volunteers — no accident cover, no medical cover, no liability cover.",
      },
      {
        text: "The Volunteer is told this before signing rather than discovering it afterwards. The role is desk work done from the Volunteer's own place, which is why this is tenable. Any travel or in-person activity on the Organisation's behalf needs the written approval described in clause 4, and the Volunteer should assume that nothing covers them while doing it.",
      },
    ],
  },
  {
    n: 14,
    title: "Age",
    body: [{ text: "The Volunteer confirms they are 18 years of age or older." }],
  },
  {
    n: 15,
    title: "General",
    body: [
      { lead: "Written changes only.", text: "Any change to this Agreement is in writing and signed by both Parties." },
      {
        lead: "Whole agreement.",
        text: "This Agreement and its Annexes are the whole of what is agreed, and replace anything said or written beforehand.",
      },
      { lead: "Severability.", text: "If any clause turns out to be unenforceable, the rest stands." },
      {
        lead: "No waiver by inaction.",
        text: "If the Organisation does not enforce something on one occasion, that does not mean it has given it up.",
      },
      { lead: "Notices.", text: "Notices go to the email addresses on the first page, and are effective when sent." },
      {
        lead: "Language.",
        text: "This Agreement is made in English. Where it is translated for any purpose, the English text governs.",
      },
      {
        lead: "Governing law.",
        text: "This Agreement is governed by the laws of Nepal. The courts of Morang District have jurisdiction over any dispute arising from it.",
      },
      {
        lead: "Electronic signature.",
        text: "The Parties agree that this Agreement may be signed electronically, and that an electronic signature made through the Organisation's e-signature service has the same effect as a signature in ink, under the Electronic Transactions Act, 2063. It may be signed in counterparts.",
      },
    ],
  },
];

export const VOLUNTEER_SIGNING_STATEMENT =
  "I have read this Agreement, I understand it, and I agree to it. I confirm that I am giving my time voluntarily and that I expect no payment.";

export const CODE_OF_CONDUCT_URL = "https://s3.jawafdehi.org/documents/jawafdehi-code-of-conduct-2083.pdf";

export const DECLARATIONS: { ne: string; en: string }[] = [
  { ne: "म १८ वर्ष वा सोभन्दा माथिको छु।", en: "I am 18 or older." },
  {
    ne: "मैले कुनै भ्रष्टाचार, सम्पत्ति शुद्धीकरण, जबरजस्ती करणी, मानव बेचबिखन तथा ओसारपसार, लागू औषध बिक्री-वितरण, अपहरण सम्बन्धी कसुर, हत्या सम्बन्धी कसुर वा नैतिक पतन देखिने अभियोगमा सजाय पाएको छैन।",
    en: "I have not been convicted of corruption, money laundering, rape, human trafficking, drug trafficking, kidnapping, murder, or any offence involving moral turpitude.",
  },
  {
    ne: "म पूर्ण होशहवासमा, विना कुनै दबाब जवाफदेही इनिशिएटिभसँग आबद्ध भई संस्थाको उद्देश्य, नीति तथा आचारसंहिता (Code of Conduct) को इमान्दारीपूर्वक पालना गर्नेछु।",
    en: "I join freely and will follow the organisation's objectives, policies and Code of Conduct.",
  },
  {
    ne: "मैले जवाफदेहीको गोपनीयता नीति र सेवाका सर्तहरू पढेको छु र म सहमत छु।",
    en: "I have read Jawafdehi's Privacy Policy and Terms of Service, and I agree to them.",
  },
  { ne: "यस फारममा दिएको विवरण साँचो हो।", en: "The information in this form is true." },
];

export const VOLUNTEER_RULES: { ne: string; en: string }[] = [
  { ne: "आवेदक १८ वर्ष वा सोभन्दा माथिको हुनुपर्नेछ।", en: "Applicants must be 18 or older." },
  {
    ne: "स्वयंसेवकको आवेदन सञ्चालक समितिको अध्यक्षले स्वीकृत गर्नुहुनेछ, र स्वयंसेवक सम्झौतामा हस्ताक्षर गरेपछि मात्र काम सुरु गरिनेछ।",
    en: "Volunteer applications are approved by the chair of the board. Volunteers start only after signing the volunteer agreement.",
  },
  {
    ne: "स्वयंसेवक संस्थाको सदस्य हुने छैनन्, मताधिकार रहने छैन, र स्वयंसेवा पारिश्रमिकरहित हुनेछ।",
    en: "Volunteers are not members, do not vote, and are unpaid.",
  },
  {
    ne: "आचारसंहिता उल्लङ्घन गरेमा आचारसंहितामा लेखिएको प्रावधान बमोजिम स्वयंसेवा अन्त्य गर्न सकिनेछ।",
    en: "A breach of the Code of Conduct can end volunteering, as the Code provides.",
  },
  {
    ne: "स्वयंसेवकले जुनसुकै बेला लिखित जानकारी दिई स्वयंसेवा अन्त्य गर्न सक्नेछन्।",
    en: "A volunteer can stop at any time by telling us in writing.",
  },
];
