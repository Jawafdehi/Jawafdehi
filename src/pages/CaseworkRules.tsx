import { useEffect, useState, useCallback } from "react";
import CaseworkLayout from "@/components/CaseworkLayout";
import { listRules, getConfig, updateConfig } from "@/services/casework-api";
import type { CaseworkRule, ReviewConfig } from "@/types/casework";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronDown, Lock, ShieldAlert } from "lucide-react";
import { mdToHtml, categoryColor, kindColor } from "@/lib/casework-ui";
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";

export default function CaseworkRules() {
  // Only moderators/admins may change the global review config (thresholds).
  // The backend enforces this (config_view → 403); mirror it in the UI so a
  // caseworker sees the values read-only instead of editable inputs that fail.
  const { isModerator } = useCaseworkAuth();
  const [rules, setRules] = useState<CaseworkRule[]>([]);
  const [config, setConfig] = useState<ReviewConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([listRules(), getConfig()]);
      setRules(r);
      setConfig(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveConfig = async (patch: Partial<ReviewConfig>) => {
    if (!config) return;
    const c = await updateConfig({ ...config, ...patch });
    setConfig(c);
  };

  if (loading) {
    return (
      <CaseworkLayout>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading rules…
        </div>
      </CaseworkLayout>
    );
  }

  return (
    <CaseworkLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Rules</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Code-enforced rules the review system scores each case against. These
              are defined in code and are read-only here.
            </p>
          </div>
        </div>

        {/* Config — editable by moderators/admins only. */}
        {config && (
          <div className="space-y-2">
            <div className="bg-white border rounded-xl p-4 grid grid-cols-3 gap-4">
              <ConfigField
                label="Pass ≥"
                value={config.pass_threshold}
                onSave={(v) => saveConfig({ pass_threshold: v })}
                disabled={!isModerator}
              />
              <ConfigField
                label="Revise ≥"
                value={config.revise_threshold}
                onSave={(v) => saveConfig({ revise_threshold: v })}
                disabled={!isModerator}
              />
              <ConfigField
                label="LLM samples"
                value={config.llm_samples}
                onSave={(v) => saveConfig({ llm_samples: v })}
                disabled={!isModerator}
              />
            </div>
            {!isModerator && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3 w-3" />
                Only moderators can change these thresholds.
              </p>
            )}
          </div>
        )}

        <div className="space-y-5">
          {[...groupByCategory(rules).entries()].map(([category, catRules]) => (
            <section key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${categoryColor(category)}`}
                >
                  {category}
                </span>
                <span className="text-xs text-slate-400">
                  {catRules.length} rule{catRules.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="space-y-2">
                {catRules.map((r) => (
                  <div
                    key={r.id}
                    className={`bg-white border rounded-lg overflow-hidden ${
                      r.is_gate ? "border-l-4 border-l-purple-400" : ""
                    } ${!r.enabled ? "opacity-60" : ""}`}
                  >
                    <button
                      className="w-full px-4 py-3 flex items-center gap-2.5 text-left hover:bg-slate-50"
                      onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}
                    >
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open[r.id] ? "rotate-180" : ""}`}
                      />
                      <span className="font-medium text-sm truncate">{r.title}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded border ${kindColor(r.kind)}`}
                      >
                        {r.kind === "llm" ? "LLM judge" : "deterministic"}
                      </span>
                      {r.is_gate && (
                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                          <ShieldAlert className="h-3 w-3" /> gate ≥ {r.gate_min}
                        </span>
                      )}
                      {!r.enabled && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200">
                          disabled
                        </span>
                      )}
                      <span className="flex-1" />
                      <span className="text-xs text-slate-400 shrink-0">weight {r.weight}</span>
                    </button>

                    {open[r.id] && (
                      <div className="px-4 pb-3 border-t pt-3 text-sm text-slate-600 space-y-2.5">
                        {r.condition_text && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                              Condition
                            </div>
                            {r.condition_text}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          <span>
                            <span className="text-slate-400">Active for: </span>
                            {(r.applies_to || []).join(", ") || "ALL"}
                          </span>
                          <span>
                            <span className="text-slate-400">Weight: </span>
                            {r.weight}
                          </span>
                          {r.is_gate && (
                            <span className="text-purple-700">
                              <span className="text-slate-400">Gate: </span>
                              ≥ {r.gate_min} (rejects case if score &lt; {r.gate_min})
                            </span>
                          )}
                          {r.detector && (
                            <span>
                              <span className="text-slate-400">Detector: </span>
                              <code className="px-1 bg-slate-100 rounded text-[11px]">{r.detector}</code>
                            </span>
                          )}
                        </div>

                        {r.description && (
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                              Description
                            </div>
                            <div
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: mdToHtml(r.description) }}
                            />
                          </div>
                        )}

                        {r.good_examples && (
                          <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2">
                            <div className="text-xs font-semibold text-green-700 mb-0.5">Good example</div>
                            <div className="text-sm text-green-800">{r.good_examples}</div>
                          </div>
                        )}
                        {r.bad_examples && (
                          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
                            <div className="text-xs font-semibold text-red-700 mb-0.5">Bad example</div>
                            <div className="text-sm text-red-800">{r.bad_examples}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </CaseworkLayout>
  );
}

// Group rules by category, preserving the server's display order.
function groupByCategory(rules: CaseworkRule[]): Map<string, CaseworkRule[]> {
  const g = new Map<string, CaseworkRule[]>();
  for (const r of rules) {
    if (!g.has(r.category)) g.set(r.category, []);
    g.get(r.category)!.push(r);
  }
  return g;
}

function ConfigField({
  label,
  value,
  onSave,
  disabled = false,
}: {
  label: string;
  value: number;
  onSave: (v: number) => void;
  disabled?: boolean;
}) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <Input
        type="number"
        value={v}
        disabled={disabled}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if (disabled) return;
          const n = parseInt(v, 10);
          if (Number.isNaN(n)) {
            // Invalid/blank input: snap back to the current saved value so the
            // field never drifts out of sync with state.
            setV(String(value));
          } else if (n !== value) {
            onSave(n);
          } else {
            setV(String(value));
          }
        }}
      />
    </div>
  );
}
