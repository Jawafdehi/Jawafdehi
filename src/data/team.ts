export type ContactType = "email" | "facebook" | "linkedin" | "github" | "website" | "instagram";

export interface Contact {
  type: ContactType;
  value: string;
}

export interface TeamMember {
  displayName: { en: string; ne: string };
  thumb?: string;
  description: string;
  tags?: string[];
  contacts: Contact[];
}

export const usBoard: TeamMember[] = [
  {
    displayName: { en: "Bishwas Gautam", ne: "बिश्वास गौतम" },
    thumb: "/assets/teammembers/bishwas.png",
    description: "",
    tags: ["Board Member"],
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/gbishwas/" },
      { type: "github", value: "https://github.com/bishwasgautam" },
    ],
  },
  {
    displayName: { en: "Nischal Dahal", ne: "निश्चल दाहाल" },
    thumb: "/assets/teammembers/nischal.png",
    description: "",
    tags: ["Board Member"],
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/nischaldahal/" },
    ],
  },
  {
    displayName: { en: "Anish Karki", ne: "अनिश कार्की" },
    thumb: "/assets/teammembers/anish.png",
    description: "",
    tags: ["Board Member"],
    contacts: [
      { type: "email", value: "karkianish93@gmail.com" },
    ],
  },
];

export const nepalBoard: TeamMember[] = [
  {
    displayName: { en: "Damodar Dahal", ne: "दामोदर दाहाल" },
    thumb: "https://s3.jawafdehi.org/team/damodar.jpeg",
    description: "Software Engineer @ Amazon Web Services",
    tags: ["Founder", "Board Member"],
    contacts: [
      { type: "email", value: "damo94761@gmail.com" },
      { type: "linkedin", value: "https://www.linkedin.com/in/damo-da/" },
      { type: "github", value: "https://github.com/damo-da" },
    ],
  },
  {
    displayName: { en: "Busan Prasain", ne: "बुसान प्रसाईं" },
    thumb: "/assets/teammembers/busan.jpeg",
    description: "",
    tags: ["Founder"],
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/busanprasain/" },
    ],
  },
  {
    displayName: { en: "Medha Sharma", ne: "मेधा शर्मा" },
    thumb: "https://s3.jawafdehi.org/team/medha2.jpeg",
    description: "President, Visible Impact",
    tags: ["Founder", "Board Member"],
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/shmedha/" },
      { type: "email", value: "shmedha@gmail.com" },
    ],
  },
  {
    displayName: { en: "Rohan Raj Gautam", ne: "रोहन राज गौतम" },
    thumb: "https://s3.jawafdehi.org/team/rohan2.jpg",
    description: "Software Engineer",
    tags: ["Founder", "Board Member"],
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/rohanrajgautam/" },
    ],
  },
  {
    displayName: { en: "Niroj Aryal", ne: "निरोज अर्याल" },
    thumb: "/assets/teammembers/niroj.jpeg",
    description: "",
    tags: ["Founder", "Board Member"],
    contacts: [
      { type: "email", value: "nirojaryal2002@gmail.com" },
    ],
  },
  {
    displayName: { en: "Shikshita Bhandari", ne: "शिक्षिता भण्डारी" },
    thumb: "https://s3.jawafdehi.org/team/shikshita.jpeg",
    description: "PhD Student, Stanford University",
    tags: ["Board Member"],
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/shikshitab" },
    ],
  },
];

export const members: TeamMember[] = [
  {
    displayName: { en: "Raghu Sharma", ne: "रघु शर्मा" },
    thumb: "/assets/teammembers/raghu.png",
    description: "Software Engineer",
    contacts: [
      { type: "github", value: "https://github.com/Srmaraghu" },
    ],
  },
  {
    displayName: { en: "Ashwini Subedi", ne: "अश्विनी सुवेदी" },
    thumb: "/assets/teammembers/ashwini.png",
    description: "Software Engineer",
    contacts: [
      { type: "github", value: "https://github.com/notashwinii" },
    ],
  },
  {
    displayName: { en: "Rujit Kafle", ne: "रुजित काफ्ले" },
    thumb: "https://jawafdehi.org/assets/teammembers/rujit.jpg",
    description: "Caseworker",
    contacts: [
      { type: "email", value: "rujitkafle77@gmail.com" },
    ],
  },
  {
    displayName: { en: "Sambhav Koirala", ne: "सम्भव कोइराला" },
    thumb: "https://jawafdehi.org/assets/teammembers/sambhav.jpeg",
    description: "Caseworker",
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/sambhav-koirala-7a6b47368" },
    ],
  },
  {
    displayName: { en: "Gaurav Karki", ne: "गौरव कार्की" },
    thumb: "/assets/teammembers/gaurav.jpg",
    description: "Software Engineer Volunteer",
    contacts: [
      { type: "github", value: "https://github.com/gaurav-karki" },
    ],
  },
  {
    displayName: { en: "Subodh Kandel", ne: "सुबोध कँडेल" },
    thumb: "https://jawafdehi.org/assets/teammembers/subodh.jpeg",
    description: "Caseworker Volunteer",
    contacts: [
      { type: "email", value: "kandelsubodh46@gmail.com" },
      { type: "instagram", value: "https://www.instagram.com/subodh_kandel" },
    ],
  },
  {
    displayName: { en: "Sujata Pokharel", ne: "सुजाता पोखरेल" },
    thumb: "/assets/teammembers/sujata.png",
    description: "Social Media Volunteer",
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/sujata-pokharel-293348249/" },
    ],
  },
  {
    displayName: { en: "Britika Khanal", ne: "बृतिका खनाल" },
    thumb: "/assets/teammembers/britika.jpg",
    description: "Content & Social Media",
    contacts: [
      { type: "linkedin", value: "https://np.linkedin.com/in/britika-khanal-217b50257" },
    ],
  },
  {
    displayName: { en: "Shishir Bashyal", ne: "शिशिर बस्याल" },
    thumb: "https://s3.jawafdehi.org/team/shishir.jpeg",
    description: "CEO, Proma.ai; Volunteer",
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/sbashyal/" },
    ],
  },
];

export const pastMembers: TeamMember[] = [
  {
    displayName: { en: "Deep Chaulagain", ne: "दीप चौलागाईं" },
    thumb: "https://avatars.githubusercontent.com/deepgeek101",
    description: "Software Engineer Intern",
    contacts: [
      { type: "github", value: "https://github.com/deepgeek101" },
    ],
  },
  {
    displayName: { en: "Aakash Poudel", ne: "आकाश पौडेल" },
    thumb: "https://avatars.githubusercontent.com/aakash2060",
    description: "Software Engineer Intern",
    contacts: [
      { type: "github", value: "https://github.com/aakash2060" },
    ],
  },
  {
    displayName: { en: "Kushal KC", ne: "कुशल केसी" },
    thumb: "https://avatars.githubusercontent.com/kushal-kc15",
    description: "Software Engineer Intern",
    contacts: [
      { type: "github", value: "https://github.com/kushal-kc15" },
    ],
  },
  {
    displayName: { en: "Samyam Jung Thapa", ne: "सम्याम जंग थापा" },
    thumb: "https://avatars.githubusercontent.com/sjungthapa",
    description: "Software Engineer Intern",
    contacts: [
      { type: "github", value: "https://github.com/sjungthapa" },
    ],
  },
];
