import Calendar from "@sbmdkl/nepali-datepicker-reactjs";
import "@sbmdkl/nepali-datepicker-reactjs/dist/index.css";
import "./bs-datepicker.css";

// Nepali (Bikram Sambat) date picker — thin wrapper over the well-maintained
// @sbmdkl/nepali-datepicker-reactjs calendar. Stores/emits the canonical BS
// "YYYY-MM-DD" string (English numerals) the backend stores; the calendar UI is
// rendered in Nepali (language="ne").
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
  return (
    <div id={id} data-disabled={disabled ? "true" : undefined} className="bs-datepicker">
      <Calendar
        // The library is uncontrolled (defaultDate only). Key on the value so an
        // external change (e.g. the paired AD picker converting to BS) remounts
        // it at the new date instead of keeping the stale internal state.
        key={value || "empty"}
        className="bs-datepicker-input"
        defaultDate={value || undefined}
        language="ne"
        minDate={MIN_BS}
        maxDate={MAX_BS}
        placeholder={placeholder}
        hideDefaultValue={!value}
        onChange={({ bsDate, adDate }) => onChange({ bsDate, adDate })}
      />
    </div>
  );
}
