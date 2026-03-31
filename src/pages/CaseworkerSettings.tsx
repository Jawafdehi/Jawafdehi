import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCaseworkerAuth } from "@/context/CaseworkerAuthContext";
import {
  listSkills, createSkill, updateSkill, deleteSkill,
  listLLMProviders, createLLMProvider, updateLLMProvider, testLLMConnection,
  listMCPServers, createMCPServer, testMCPConnection,
} from "@/services/caseworker-api";
import type { Skill, LLMProvider, MCPServer } from "@/types/caseworker";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Plus, Trash2, Edit2, Check, X, RefreshCw, Zap,
} from "lucide-react";

// ── small helpers ─────────────────────────────────────────────────────────────

type Tab = "skills" | "llm" | "mcp";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Skills tab ────────────────────────────────────────────────────────────────

function SkillsTab() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Skill>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    listSkills().then((d) => setSkills(Array.isArray(d) ? d : d.results ?? []));
  }, []);

  const blank = (): Partial<Skill> => ({
    name: "", display_name: "", description: "", prompt: "",
    model: "claude-opus-4-6", temperature: 0.7, max_tokens: 2000,
  });

  const startCreate = () => { setForm(blank()); setCreating(true); setEditing(null); };
  const startEdit = (s: Skill) => { setForm(s); setEditing(s); setCreating(false); };
  const cancel = () => { setCreating(false); setEditing(null); setForm({}); setError(""); };

  const save = async () => {
    setError("");
    try {
      if (creating) {
        const created = await createSkill(form);
        setSkills((p) => [...p, created]);
      } else if (editing) {
        const updated = await updateSkill(editing.id, form);
        setSkills((p) => p.map((s) => (s.id === updated.id ? updated : s)));
      }
      cancel();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Save failed");
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteSkill(id);
      setSkills((p) => p.filter((s) => s.id !== id));
    } catch (e: unknown) {
      setError((e as Error).message ?? "Delete failed");
    }
  };

  const isOpen = creating || !!editing;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{skills.length} skill{skills.length !== 1 ? "s" : ""} configured</p>
        <Button size="sm" onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> New Skill</Button>
      </div>

      {isOpen && (
        <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
          <p className="font-medium text-sm">{creating ? "Create Skill" : "Edit Skill"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Name (slug)</Label>
              <Input value={form.name ?? ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="case-summarizer" />
            </div>
            <div className="space-y-1">
              <Label>Display Name</Label>
              <Input value={form.display_name ?? ""} onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))} placeholder="Case Summarizer" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Description</Label>
              <Input value={form.description ?? ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>System Prompt</Label>
              <Textarea
                value={form.prompt ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, prompt: e.target.value }))}
                rows={5}
                placeholder="You are a caseworker assistant. Summarize case {case_data} based on: {query}"
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">Use <code className="bg-muted px-0.5 rounded">{"{case_data}"}</code> and <code className="bg-muted px-0.5 rounded">{"{query}"}</code> as placeholders.</p>
            </div>
            <div className="space-y-1">
              <Label>Model</Label>
              <Input value={form.model ?? ""} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} placeholder="claude-opus-4-6" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Temperature</Label>
                <Input type="number" min={0} max={2} step={0.1} value={form.temperature ?? 0.7} onChange={(e) => setForm((p) => ({ ...p, temperature: parseFloat(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Max Tokens</Label>
                <Input type="number" min={100} max={100000} value={form.max_tokens ?? 2000} onChange={(e) => setForm((p) => ({ ...p, max_tokens: parseInt(e.target.value) }))} />
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Check className="h-4 w-4 mr-1" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={cancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          </div>
        </div>
      )}

      {skills.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No skills yet. Create one to get started.</p>
      ) : (
        <div className="space-y-2">
          {skills.map((s) => (
            <div key={s.id} className="flex items-start justify-between gap-2 p-3 border border-border rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{s.display_name ?? s.name}</p>
                <p className="text-xs text-muted-foreground font-mono">/{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.description}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(s)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LLM Providers tab ─────────────────────────────────────────────────────────

function LLMTab() {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LLMProvider | null>(null);
  const [form, setForm] = useState<Partial<LLMProvider> & { api_key?: string }>({});
  const [testing, setTesting] = useState<number | null>(null);
  const [status, setStatus] = useState<Record<number, boolean | null>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    listLLMProviders().then((d) => setProviders(d.results ?? []));
  }, []);

  const blank = () => ({
    provider_type: "anthropic" as const,
    model: "claude-opus-4-6",
    temperature: 0.7,
    max_tokens: 2000,
    is_active: true,
    api_key: "",
  });

  const startCreate = () => { setForm(blank()); setCreating(true); setEditing(null); };
  const startEdit = (p: LLMProvider) => { setForm({ ...p, api_key: "" }); setEditing(p); setCreating(false); };
  const cancel = () => { setCreating(false); setEditing(null); setForm({}); setError(""); };

  const save = async () => {
    setError("");
    try {
      if (creating) {
        const created = await createLLMProvider(form as Partial<LLMProvider> & { api_key: string });
        setProviders((p) => [...p, created]);
      } else if (editing) {
        const updated = await updateLLMProvider(editing.id, form as Partial<LLMProvider>);
        setProviders((p) => p.map((x) => (x.id === updated.id ? updated : x)));
      }
      cancel();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Save failed");
    }
  };

  const test = async (id: number) => {
    setTesting(id);
    try {
      const { connected } = await testLLMConnection(id);
      setStatus((p) => ({ ...p, [id]: connected }));
    } catch {
      setStatus((p) => ({ ...p, [id]: false }));
    } finally {
      setTesting(null);
    }
  };

  const providerTypes = ["anthropic", "openai", "google", "ollama", "azure", "custom"] as const;
  const isOpen = creating || !!editing;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{providers.length} provider{providers.length !== 1 ? "s" : ""} configured</p>
        <Button size="sm" onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> Add Provider</Button>
      </div>

      {isOpen && (
        <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
          <p className="font-medium text-sm">{creating ? "Add LLM Provider" : "Edit LLM Provider"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Provider</Label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={form.provider_type ?? "anthropic"}
                onChange={(e) => setForm((p) => ({ ...p, provider_type: e.target.value as LLMProvider["provider_type"] }))}
              >
                {providerTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Model</Label>
              <Input value={form.model ?? ""} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} placeholder="claude-opus-4-6" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>API Key</Label>
              <Input type="password" value={form.api_key ?? ""} onChange={(e) => setForm((p) => ({ ...p, api_key: e.target.value }))} placeholder={editing ? "Leave blank to keep existing" : "sk-..."} />
            </div>
            <div className="space-y-1">
              <Label>Temperature</Label>
              <Input type="number" min={0} max={2} step={0.1} value={form.temperature ?? 0.7} onChange={(e) => setForm((p) => ({ ...p, temperature: parseFloat(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Max Tokens</Label>
              <Input type="number" min={100} value={form.max_tokens ?? 2000} onChange={(e) => setForm((p) => ({ ...p, max_tokens: parseInt(e.target.value) }))} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Check className="h-4 w-4 mr-1" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={cancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          </div>
        </div>
      )}

      {providers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No LLM providers configured.</p>
      ) : (
        <div className="space-y-2">
          {providers.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 p-3 border border-border rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm capitalize">{p.provider_type}</p>
                  {p.is_active && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Active</span>}
                  {status[p.id] === true && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Zap className="h-3 w-3" /> Connected</span>}
                  {status[p.id] === false && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Failed</span>}
                </div>
                <p className="text-xs text-muted-foreground font-mono">{p.model}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => test(p.id)} disabled={testing === p.id}>
                  <RefreshCw className={`h-3 w-3 mr-1 ${testing === p.id ? "animate-spin" : ""}`} /> Test
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(p)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MCP Servers tab ───────────────────────────────────────────────────────────

function MCPTab() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<MCPServer> & { auth_token?: string }>({});
  const [testing, setTesting] = useState<number | null>(null);
  const [status, setStatus] = useState<Record<number, boolean | null>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    listMCPServers().then((d) => setServers(d.results ?? []));
  }, []);

  const blank = () => ({ name: "", display_name: "", url: "", auth_type: "bearer" as const, auth_token: "" });
  const cancel = () => { setCreating(false); setForm({}); setError(""); };

  const save = async () => {
    setError("");
    try {
      const created = await createMCPServer(form as Partial<MCPServer> & { auth_token: string });
      setServers((p) => [...p, created]);
      cancel();
    } catch (e: unknown) {
      setError((e as Error).message ?? "Save failed");
    }
  };

  const test = async (id: number) => {
    setTesting(id);
    try {
      const { connected } = await testMCPConnection(id);
      setStatus((p) => ({ ...p, [id]: connected }));
    } catch {
      setStatus((p) => ({ ...p, [id]: false }));
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{servers.length} server{servers.length !== 1 ? "s" : ""} configured</p>
        <Button size="sm" onClick={() => { setForm(blank()); setCreating(true); }}><Plus className="h-4 w-4 mr-1" /> Add Server</Button>
      </div>

      {creating && (
        <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
          <p className="font-medium text-sm">Add MCP Server</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={form.name ?? ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="case-system" />
            </div>
            <div className="space-y-1">
              <Label>Display Name</Label>
              <Input value={form.display_name ?? ""} onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))} placeholder="Case Management System" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>URL</Label>
              <Input value={form.url ?? ""} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://api.example.com/mcp" />
            </div>
            <div className="space-y-1">
              <Label>Auth Type</Label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={form.auth_type ?? "bearer"}
                onChange={(e) => setForm((p) => ({ ...p, auth_type: e.target.value as MCPServer["auth_type"] }))}
              >
                <option value="bearer">Bearer Token</option>
                <option value="api_key">API Key</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Auth Token</Label>
              <Input type="password" value={form.auth_token ?? ""} onChange={(e) => setForm((p) => ({ ...p, auth_token: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Check className="h-4 w-4 mr-1" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={cancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          </div>
        </div>
      )}

      {servers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No MCP servers configured.</p>
      ) : (
        <div className="space-y-2">
          {servers.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 p-3 border border-border rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{s.display_name ?? s.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    s.status === "connected" ? "bg-emerald-100 text-emerald-700"
                    : s.status === "error" ? "bg-red-100 text-red-700"
                    : "bg-muted text-muted-foreground"
                  }`}>{s.status}</span>
                  {status[s.id] === true && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Zap className="h-3 w-3" /> OK</span>}
                  {status[s.id] === false && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Failed</span>}
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate">{s.url}</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => test(s.id)} disabled={testing === s.id}>
                <RefreshCw className={`h-3 w-3 mr-1 ${testing === s.id ? "animate-spin" : ""}`} /> Test
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const CaseworkerSettings = () => {
  const { isAdmin } = useCaseworkerAuth();
  const [tab, setTab] = useState<Tab>("skills");

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Access denied. Administrator role required.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "skills", label: "Skills" },
    { id: "llm", label: "LLM Providers" },
    { id: "mcp", label: "MCP Servers" },
  ];

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/caseworker/dashboard"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Configure skills, LLM providers, and MCP servers</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <SectionCard title={tabs.find((t) => t.id === tab)!.label}>
          {tab === "skills" && <SkillsTab />}
          {tab === "llm" && <LLMTab />}
          {tab === "mcp" && <MCPTab />}
        </SectionCard>
      </div>
    </div>
  );
};

export default CaseworkerSettings;
