import { useRef } from "react";
import { type TimelineEventRow } from "@/lib/jawafdehi-forms";
import DatePairInput from "@/components/admin/DatePairInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

interface Props {
  rows: TimelineEventRow[];
  onChange: (rows: TimelineEventRow[]) => void;
}

const BLANK_ROW: TimelineEventRow = { date: "", date_bs: "", title: "", description: "" };

// An insert affordance rendered between (and around) events: a hairline with a
// centered "+" button, so an event can be added at any position in the
// timeline (this replaces the old append-only "Add event" button).
function InsertPoint({ onInsert, label }: { onInsert: () => void; label: string }) {
  return (
    <div className="flex items-center gap-2" role="presentation">
      <div className="h-px flex-1 bg-border" />
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-6 w-6 rounded-full"
        onClick={onInsert}
        title={label}
        aria-label={label}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// F4 — timeline editor. Add (at any position) / edit / reorder / delete events;
// the parent diffs into a replace op on /timeline (§3). AD date is required; BS
// date optional.
export default function TimelineEditor({ rows, onChange }: Props) {
  // Stable per-row keys. Rows are plain data owned by the parent, so identity
  // lives here: ids move with their row through insert/remove/move. Keying by
  // array index would re-associate every input below an insertion point —
  // including the uncontrolled BS date picker's internal state.
  const idsRef = useRef<number[]>([]);
  const nextIdRef = useRef(0);
  while (idsRef.current.length < rows.length) idsRef.current.push(nextIdRef.current++);
  if (idsRef.current.length > rows.length) idsRef.current.length = rows.length;

  const update = (i: number, patch: Partial<TimelineEventRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const remove = (i: number) => {
    idsRef.current.splice(i, 1);
    onChange(rows.filter((_, idx) => idx !== i));
  };

  const insertAt = (i: number) => {
    idsRef.current.splice(i, 0, nextIdRef.current++);
    onChange([...rows.slice(0, i), { ...BLANK_ROW }, ...rows.slice(i)]);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const ids = idsRef.current;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3 rounded-md border bg-white p-4">
      <Label className="text-sm font-semibold">Timeline</Label>

      {rows.length === 0 ? (
        <>
          <p className="text-sm text-muted-foreground">No timeline events yet.</p>
          <InsertPoint onInsert={() => insertAt(0)} label="Add event" />
        </>
      ) : (
        <div className="space-y-2">
          <InsertPoint onInsert={() => insertAt(0)} label="Insert event at the start" />
          {rows.map((r, i) => {
            return (
              <div key={idsRef.current[i]} className="space-y-2">
                <div className="space-y-2 rounded border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Event {i + 1}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => move(i, 1)}
                        disabled={i === rows.length - 1}
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(i)}
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <DatePairInput
                    label="Date"
                    idBase={`tl-${i}`}
                    adValue={r.date}
                    bsValue={r.date_bs}
                    onChange={({ ad, bs }) => update(i, { date: ad, date_bs: bs })}
                  />
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={r.title}
                      onChange={(e) => update(i, { title: e.target.value })}
                      placeholder="What happened"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={r.description}
                      onChange={(e) => update(i, { description: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
                <InsertPoint
                  onInsert={() => insertAt(i + 1)}
                  label={`Insert event after event ${i + 1}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
