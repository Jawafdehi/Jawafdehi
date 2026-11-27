import { Switch } from "@/components/ui/switch";

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const sample = () => ({
  phone: "9841234567",
  fullName: "Sita Kumari Shrestha",
  dob: "1996-04-12",
  nationality: "Nepali",
  gender: "female" as const,
  email: "sita.shrestha@example.com",
  altPhone: "",
  district: "Lalitpur",
  municipality: "Lalitpur Metropolitan City",
  ward: "5",
  tole: "Pulchowk",
  currentAddress: "Pulchowk, Lalitpur",
  idType: "citizenship" as const,
  idNumber: "27-01-75-12345",
  idDistrict: "Lalitpur",
  idCountry: "",
  idIssueDate: "2014-06-01",
  idFront: { id: "dev-front", name: "citizenship-front.jpg", size: 245_000, type: "image/jpeg" },
  idBack: { id: "dev-back", name: "citizenship-back.jpg", size: 238_000, type: "image/jpeg" },
  interests: ["research", "translation"],
  interestOther: "",
  skills: "Court records research and English to Nepali translation.",
  hours: "6",
  startDate: addDays(7),
  why: "I want public records about corruption cases to be easy for anyone in Nepal to find.",
  coi: ["none"],
  affiliations: "",
});

export type DevSample = ReturnType<typeof sample>;

export default function DevPanel({
  skip,
  onSkipChange,
  onFill,
}: Readonly<{ skip: boolean; onSkipChange: (on: boolean) => void; onFill: (s: DevSample) => void }>) {
  return (
    <div
      data-dev-only
      lang="en"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-full bg-primary-surface py-2 pl-4 pr-2 text-xs text-primary-foreground shadow-lg"
    >
      <span className="font-mono font-semibold opacity-60">DEV</span>
      <label className="flex cursor-pointer items-center gap-2">
        <Switch checked={skip} onCheckedChange={onSkipChange} className="data-[state=unchecked]:bg-white/25" />
        Skip checks
      </label>
      <button
        type="button"
        onClick={() => onFill(sample())}
        className="rounded-full bg-white/15 px-3 py-1.5 transition-colors hover:bg-white/25"
      >
        Fill sample
      </button>
    </div>
  );
}
