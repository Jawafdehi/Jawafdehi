import { useState } from "react";
import { FieldError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

interface Props {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  help?: string;
  // Optional per-item validator; an invalid entry is refused on add.
  validate?: (value: string) => boolean;
  invalidHint?: string;
  // Optional normalizer applied on add (e.g. trim/lowercase).
  normalize?: (value: string) => string;
  className?: string;
}

// F6 — a generic chip/tag list editor. Used for `tags` and `court_cases`.
// De-dupes and (optionally) validates on add.
export default function ChipListEditor({
  label,
  items,
  onChange,
  placeholder,
  help,
  validate,
  invalidHint,
  normalize,
  className,
}: Props) {
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const add = () => {
    const value = (normalize ? normalize(draft) : draft.trim());
    if (value === "") return;
    if (validate && !validate(value)) {
      setErr(invalidHint ?? "Invalid entry.");
      return;
    }
    if (items.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...items, value]);
    setDraft("");
    setErr(null);
  };

  const remove = (value: string) => onChange(items.filter((i) => i !== value));

  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label>{label}</Label>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setErr(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={add} disabled={draft.trim() === ""}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <FieldError message={err} />
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 font-normal">
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                className="ml-0.5 rounded-full hover:text-red-600"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
