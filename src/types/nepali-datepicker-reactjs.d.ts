// Type shim for @sbmdkl/nepali-datepicker-reactjs (ships no bundled types).
// Covers the props we use; see the package README for the full prop table.
declare module "@sbmdkl/nepali-datepicker-reactjs" {
  import { CSSProperties, ComponentType } from "react";

  export interface NepaliDate {
    // Bikram Sambat date, "YYYY-MM-DD", English numerals.
    bsDate: string;
    // Gregorian equivalent, "YYYY-MM-DD".
    adDate: string;
  }

  export interface CalendarProps {
    className?: string;
    // Starting/selected BS date, "YYYY-MM-DD", English numerals.
    defaultDate?: string;
    dateFormat?: string;
    language?: "en" | "ne";
    // Min/max BS dates, "YYYY-MM-DD", English numerals.
    minDate?: string;
    maxDate?: string;
    onChange?: (value: NepaliDate) => void;
    style?: CSSProperties;
    theme?: "red" | "blue" | "green" | "dark" | "deepdark" | "default";
    hideDefaultValue?: boolean;
    placeholder?: string;
  }

  const Calendar: ComponentType<CalendarProps>;
  export default Calendar;
}

declare module "@sbmdkl/nepali-datepicker-reactjs/dist/index.css";
