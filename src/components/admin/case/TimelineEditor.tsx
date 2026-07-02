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

// F4 — timeline editor. Add / edit / reorder / delete events; the parent diffs
// into a replace op on /timeline (§3). AD date is required; BS date optional.
export default function TimelineEditor({ rows, onChange }: Props) {
  const update = (i: number, patch: Partial<TimelineEventRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  const addRow = () =>
    onChange([...rows, { date: "", date_bs: "", title: "", description: "" }]);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3 rounded-md border bg-white p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Timeline</Label>
        <Button type="button" size="sm" variant="outline" onClick={addRow}>
          <Plus className="mr-1 h-4 w-4" /> Add event
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No timeline events yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => {
            return (
              <div key={i} className="space-y-2 rounded border p-3">
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
                  onAdChange={(v) => update(i, { date: v })}
                  onBsChange={(v) => update(i, { date_bs: v })}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
