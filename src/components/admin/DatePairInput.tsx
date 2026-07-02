import { Label } from "@/components/ui/label";
import ADDatePicker from "@/components/admin/ADDatePicker";
import BSDatePicker from "@/components/admin/BSDatePicker";
import { adStringToBSString } from "@/utils/bs-calendar";

// A Bikram Sambat (BS) + Gregorian (AD) date pair — the shape every admin form
// with dates repeats. Both are real calendar pickers: AD via the shadcn
// Calendar, BS via @sbmdkl/nepali-datepicker-reactjs. Picking in one calendar
// auto-fills the other; the caller still owns both string values.
interface DatePairInputProps {
  label: string;
  idBase: string;
  adValue: string; // AD "YYYY-MM-DD" or ""
  bsValue: string; // BS "YYYY-MM-DD" or ""
  onAdChange: (value: string) => void;
  onBsChange: (value: string) => void;
  disabled?: boolean;
}

export default function DatePairInput({
  label,
  idBase,
  adValue,
  bsValue,
  onAdChange,
  onBsChange,
  disabled,
}: DatePairInputProps) {
  // Pick AD → set AD, and derive BS (skip if the AD value is out of the BS
  // table's range, leaving whatever BS the user had).
  const handleAd = (value: string) => {
    onAdChange(value);
    if (value === "") {
      onBsChange("");
      return;
    }
    const bs = adStringToBSString(value);
    if (bs) onBsChange(bs);
  };

  // Pick BS → set BS, and mirror the paired Gregorian date the picker already
  // computed. Propagate an empty adDate too (clearing BS clears AD) so the pair
  // can't be left mismatched.
  const handleBs = ({ bsDate, adDate }: { bsDate: string; adDate: string }) => {
    onBsChange(bsDate);
    onAdChange(adDate || "");
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor={`${idBase}-bs`} className="text-xs">
          {label} (BS · बि.सं.)
        </Label>
        <BSDatePicker
          id={`${idBase}-bs`}
          value={bsValue}
          onChange={handleBs}
          disabled={disabled}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idBase}-ad`} className="text-xs">
          {label} (AD)
        </Label>
        <ADDatePicker
          id={`${idBase}-ad`}
          value={adValue}
          onChange={handleAd}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
