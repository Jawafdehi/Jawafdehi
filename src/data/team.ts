export type ContactType = "email" | "facebook" | "linkedin" | "github" | "website";

export interface Contact {
  type: ContactType;
  value: string;
}

export interface TeamMember {
  displayName: { en: string; ne: string };
  thumb?: string;
  description: string;
  contacts: Contact[];
}

export const teamMembers: TeamMember[] = [
  {
    displayName: { en: "Damodar Dahal", ne: "दामोदर दाहाल" },
    thumb: "https://s3.jawafdehi.org/team/damodar.jpeg",
    description: "Founder, Jawafdehi.org; Master's in International Relations, Harvard University Extension School; Software Engineer @ Amazon Web Services",
    contacts: [
      { type: "email", value: "damo94761@gmail.com" },
      { type: "linkedin", value: "https://www.linkedin.com/in/damo-da/" },
      { type: "github", value: "https://github.com/damo-da" },
    ],
  },
  {
    displayName: { en: "Nischal Dahal", ne: "निश्चल दाहाल" },
    thumb: "https://jawafdehi.org/assets/teammembers/nischal.png",
    description: "Volunteer, Jawafdehi.org and Let's Build Nepal",
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/nischaldahal/" },
    ],
  },
  {
    displayName: { en: "Shishir Bashyal", ne: "शिशिर बस्याल" },
    thumb: "https://s3.jawafdehi.org/team/shishir.jpeg",
    description: "CEO, Proma.ai; Volunteer, Let's Build Nepal",
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/sbashyal/" },
    ],
  },
  {
    displayName: { en: "Medha Sharma", ne: "मेधा शर्मा" },
    thumb: "https://s3.jawafdehi.org/team/medha2.jpeg",
    description: "President, Visible Impact; Volunteer, Let's Build Nepal",
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/shmedha/" },
      { type: "email", value: "shmedha@gmail.com" },
    ],
  },
  {
    displayName: { en: "Bishwas Gautam", ne: "बिश्वास गौतम" },
    thumb: "https://jawafdehi.org/assets/teammembers/bishwas.png",
    description: "Volunteer, Jawafdehi.org",
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/gbishwas/" },
      { type: "github", value: "https://github.com/bishwasgautam" },
    ],
  },
  {
    displayName: { en: "Jenish Khanal", ne: "जेनिस खनाल" },
    thumb: "https://s3.jawafdehi.org/team/jenish.jpeg",
    description: "Volunteer, Let's Build Nepal",
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/jenish-khanal-709458201/" },
    ],
  },
  {
    displayName: { en: "Rohan Raj Gautam", ne: "रोहन राज गौतम" },
    thumb: "https://s3.jawafdehi.org/team/rohan2.jpg",
    description: "Software Engineer; Volunteer, Let's Build Nepal",
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/rohanrajgautam/" },
    ],
  },
  {
    displayName: { en: "Shikshita Bhandari", ne: "शिक्षिता भण्डारी" },
    thumb: "https://s3.jawafdehi.org/team/shikshita.jpeg",
    description: "PhD Student in Earth Systems Science, Stanford University",
    contacts: [
      { type: "linkedin", value: "https://www.linkedin.com/in/shikshitab" },
    ],
  },
  {
    displayName: { en: "Raghu Sharma", ne: "रघु शर्मा" },
    thumb: "https://avatars.githubusercontent.com/Srmaraghu",
    description: "Software Engineer Intern, Jawafdehi.org",
    contacts: [
      { type: "github", value: "https://github.com/Srmaraghu" },
    ],
  },
  {
    displayName: { en: "Ashwini Subedi", ne: "अश्विनी सुवेदी" },
    thumb: "https://avatars.githubusercontent.com/notashwinii",
    description: "Software Engineer Intern, Jawafdehi.org",
    contacts: [
      { type: "github", value: "https://github.com/notashwinii" },
    ],
  },
  {
    displayName: { en: "Niroj Aryal", ne: "निरोज अर्याल" },
    thumb: undefined,
    description: "Case Documentation Intern, Jawafdehi.org",
    contacts: [],
  },
  {
    displayName: { en: "Rujit Kafle", ne: "रुजित काफ्ले" },
    thumb: undefined,
    description: "Case Documentation Intern, Jawafdehi.org",
    contacts: [],
  },
  {
    displayName: { en: "Gaurav Karki", ne: "गौरव कार्की" },
    thumb: "https://avatars.githubusercontent.com/gaurav-karki",
    description: "Software Engineer Intern, Jawafdehi.org",
    contacts: [
      { type: "github", value: "https://github.com/gaurav-karki" },
    ],
  },
  {
    displayName: { en: "Deep Chaulagain", ne: "दीप चौलागाईं" },
    thumb: "https://avatars.githubusercontent.com/deepgeek101",
    description: "Software Engineer Intern, Jawafdehi.org",
    contacts: [
      { type: "github", value: "https://github.com/deepgeek101" },
    ],
  },
  {
    displayName: { en: "Aakash Poudel", ne: "आकाश पौडेल" },
    thumb: "https://avatars.githubusercontent.com/aakash2060",
    description: "Software Engineer Intern, Jawafdehi.org",
    contacts: [
      { type: "github", value: "https://github.com/aakash2060" },
    ],
  },
  {
    displayName: { en: "Kushal KC", ne: "कुशल केसी" },
    thumb: "https://avatars.githubusercontent.com/kushal-kc15",
    description: "Software Engineer Intern, Jawafdehi.org",
    contacts: [
      { type: "github", value: "https://github.com/kushal-kc15" },
    ],
  },
  {
    displayName: { en: "Samyam Jung Thapa", ne: "सम्याम जंग थापा" },
    thumb: "https://avatars.githubusercontent.com/sjungthapa",
    description: "Software Engineer Intern, Jawafdehi.org",
    contacts: [
      { type: "github", value: "https://github.com/sjungthapa" },
    ],
  },
];
