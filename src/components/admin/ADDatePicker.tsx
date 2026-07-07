import { useMemo, useState } from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

// Gregorian (AD) date picker. Stores/emits the canonical "YYYY-MM-DD" string the
// backend expects; renders a shadcn Calendar in a popover. Empty value = unset.
interface ADDatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
}

// Default year range. Bounded to the Gregorian window the Bikram Sambat
// conversion table covers (BS 2000–2089 ≈ AD 1944–2033), so a date picked here
// can always be converted to a paired BS field — no silent AD/BS mismatch.
const DEFAULT_FROM_YEAR = 1944;
const DEFAULT_TO_YEAR = 2033;

// Parse a "YYYY-MM-DD" string to a Date at local midnight (react-day-picker works
// in local time). Returns undefined for empty/invalid input.
function toDate(value: string): Date | undefined {
  if (!value) return undefined;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

export default function ADDatePicker({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
  disabled,
  fromYear = DEFAULT_FROM_YEAR,
  toYear = DEFAULT_TO_YEAR,
}: ADDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => toDate(value), [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, "yyyy-MM-dd") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => {
            onChange(d ? format(d, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
          captionLayout="dropdown-buttons"
          fromYear={fromYear}
          toYear={toYear}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
