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
//
// Two modes:
//  - Default (`deriveBs` unset): BS and AD are BOTH stored by the caller. Picking
//    in either calendar fills the other; `onChange` carries the whole {ad, bs}
//    pair. Used by the datalake forms and the timeline editor, which persist a
//    separate BS column.
//  - `deriveBs`: AD is the single source of truth (the backend stores no BS
//    column). The BS field is DERIVED for display from the AD value via
//    `adStringToBSString` — never stored. Picking a BS date still works: it
//    writes back ONLY to AD (using the Gregorian date the BS picker emits), and
//    the shown BS re-derives from that AD. The caller owns only AD and passes
//    `onAdChange`; `bsValue`/`onChange` are ignored.
interface DatePairInputBaseProps {
  label: string;
  idBase: string;
  adValue: string; // AD "YYYY-MM-DD" or ""
  disabled?: boolean;
}

// A discriminated union on `deriveBs` so the two modes can't be mixed at the
// type level: derive-only mode requires `onAdChange` and forbids the stored-BS
// props, and default mode requires `bsValue`/`onChange` and forbids `onAdChange`.
type DatePairInputProps = DatePairInputBaseProps &
  (
    | {
        // Derive-only mode: BS is computed from AD for display and never stored.
        // The caller owns only the AD value and receives just the AD string back.
        deriveBs: true;
        onAdChange: (ad: string) => void;
        bsValue?: never;
        onChange?: never;
      }
    | {
        // Default mode: BS and AD are BOTH stored by the caller.
        deriveBs?: false;
        bsValue: string; // BS "YYYY-MM-DD" or ""
        onChange: (pair: { ad: string; bs: string }) => void;
        onAdChange?: never;
      }
  );

export default function DatePairInput({
  label,
  idBase,
  adValue,
  bsValue = "",
  onChange,
  deriveBs,
  onAdChange,
  disabled,
}: DatePairInputProps) {
  // In derive-only mode the BS field is a read-through of the AD value (never a
  // stored value). Falls back to "" when AD is empty or out of the BS table.
  const shownBs = deriveBs ? (adStringToBSString(adValue) ?? "") : bsValue;

  // Pick AD → set AD, and (default mode only) derive BS. In derive mode the BS
  // field re-computes from AD on the next render, so we just push the AD string.
  const handleAd = (value: string) => {
    if (deriveBs) {
      onAdChange?.(value);
      return;
    }
    if (value === "") {
      onChange?.({ ad: "", bs: "" });
      return;
    }
    const bs = adStringToBSString(value);
    onChange?.({ ad: value, bs: bs ?? bsValue });
  };

  // Pick BS → in default mode set BS and mirror the paired Gregorian date the
  // picker already computed. In derive mode, the BS selection is used ONLY to
  // set AD (the picker emits the paired adDate); the shown BS re-derives from it.
  // Propagate an empty adDate too (clearing clears AD) so nothing is mismatched.
  const handleBs = ({ bsDate, adDate }: { bsDate: string; adDate: string }) => {
    if (deriveBs) {
      onAdChange?.(adDate || "");
      return;
    }
    onChange?.({ ad: adDate || "", bs: bsDate });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor={`${idBase}-bs`} className="text-xs">
          {label} (BS · बि.सं.)
        </Label>
        <BSDatePicker
          id={`${idBase}-bs`}
          value={shownBs}
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
