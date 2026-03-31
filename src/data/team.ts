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
];
