import Calendar from "@sbmdkl/nepali-datepicker-reactjs";
import "@sbmdkl/nepali-datepicker-reactjs/dist/index.css";
import "./bs-datepicker.css";
import { normalizeBSDateString } from "@/utils/bs-calendar";

// Nepali (Bikram Sambat) date picker — thin wrapper over the well-maintained
// @sbmdkl/nepali-datepicker-reactjs calendar. Stores/emits the canonical BS
// "YYYY-MM-DD" string (English numerals) the backend stores; the calendar UI is
// rendered in Nepali (language="ne").
//
// The library needs two guard rails, both handled here so callers never see
// them:
//  - With language="ne" it emits Devanagari numerals ("२०८२-०२-२२"), which its
//    own `defaultDate` parser cannot read back (parseInt → NaN → a corrupt
//    "-०-०" value and a calendar that throws on the next click). Every emitted
//    value is therefore normalized to ASCII before leaving this component.
//  - It is uncontrolled and re-fires onChange from componentDidMount whenever a
//    default value is visible. Since we remount it on every value change (the
//    `key` below), that echo would loop value→remount→onChange→value forever.
//    Echoes are suppressed by dropping events that match the current value.
interface BSDatePickerProps {
  value: string; // BS "YYYY-MM-DD" or ""
  // Emits both the BS date and its Gregorian equivalent so the caller can keep
  // an AD field in sync without re-deriving.
  onChange: (value: { bsDate: string; adDate: string }) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}

// BS calendar range the library supports (its bundled data spans ~2000–2090 BS).
const MIN_BS = "2000-01-01";
const MAX_BS = "2089-12-30";

export default function BSDatePicker({
  value,
  onChange,
  id,
  placeholder = "मिति छान्नुहोस्",
  disabled,
}: BSDatePickerProps) {
  // Tolerate a Devanagari or unpadded stored value (data written before the
  // normalization existed): the library can only parse ASCII "YYYY-MM-DD".
  const normalizedValue = normalizeBSDateString(value) ?? "";

  const handleChange = ({ bsDate, adDate }: { bsDate: string; adDate: string }) => {
    const bs = normalizeBSDateString(bsDate);
    // Drop unparseable emissions (the library's NaN artifacts) and mount echoes
    // of the value we already hold — see the component comment.
    if (!bs || bs === normalizedValue) return;
    onChange({ bsDate: bs, adDate });
  };

  return (
    <div id={id} data-disabled={disabled ? "true" : undefined} className="bs-datepicker">
      <Calendar
        // The library is uncontrolled (defaultDate only). Key on the value so an
        // external change (e.g. the paired AD picker converting to BS) remounts
        // it at the new date instead of keeping the stale internal state.
        key={normalizedValue || "empty"}
        className="bs-datepicker-input"
        defaultDate={normalizedValue || undefined}
        language="ne"
        minDate={MIN_BS}
        maxDate={MAX_BS}
        placeholder={placeholder}
        hideDefaultValue={!normalizedValue}
        onChange={handleChange}
      />
    </div>
  );
}
