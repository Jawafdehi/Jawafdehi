import { Label } from "@/components/ui/label";
import ADDatePicker from "@/components/admin/ADDatePicker";
import BSDatePicker from "@/components/admin/BSDatePicker";
import { adStringToBSString } from "@/utils/bs-calendar";

// A Bikram Sambat (BS) + Gregorian (AD) date pair — the shape every admin form
// with dates repeats. Both are real calendar pickers: AD via the shadcn
// Calendar, BS via @sbmdkl/nepali-datepicker-reactjs. Picking in one calendar
// auto-fills the other; the caller still owns both string values.
//
// One user action emits ONE onChange carrying the whole {ad, bs} pair. (The
// previous per-field callback API fired twice per pick; a consumer that
// recomputed derived state from props on each call — the timeline editor — had
// the second call overwrite the first, silently dropping half the pair.)
interface DatePairInputProps {
  label: string;
  idBase: string;
  adValue: string; // AD "YYYY-MM-DD" or ""
  bsValue: string; // BS "YYYY-MM-DD" or ""
  onChange: (pair: { ad: string; bs: string }) => void;
  disabled?: boolean;
}

export default function DatePairInput({
  label,
  idBase,
  adValue,
  bsValue,
  onChange,
  disabled,
}: DatePairInputProps) {
  // Pick AD → set AD, and derive BS (if the AD value is out of the BS table's
  // range, keep whatever BS the user had). Clearing AD clears BS too.
  const handleAd = (value: string) => {
    if (value === "") {
      onChange({ ad: "", bs: "" });
      return;
    }
    const bs = adStringToBSString(value);
    onChange({ ad: value, bs: bs ?? bsValue });
  };

  // Pick BS → set BS, and mirror the paired Gregorian date the picker already
  // computed. Propagate an empty adDate too (clearing BS clears AD) so the pair
  // can't be left mismatched.
  const handleBs = ({ bsDate, adDate }: { bsDate: string; adDate: string }) => {
    onChange({ ad: adDate || "", bs: bsDate });
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
