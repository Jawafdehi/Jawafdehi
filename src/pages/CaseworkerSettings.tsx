import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Edit2, Plus, RefreshCw, Trash2, X, Zap } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCaseworkerAuth } from "@/context/CaseworkerAuthContext";
import {
  createLLMProvider,
  createMCPServer,
  createPrompt,
  createPublicChatConfig,
  createSkill,
  deletePrompt,
  deleteSkill,
  listLLMProviders,
  listMCPServers,
  listPrompts,
  listPublicChatConfigs,
  listSkills,
  testLLMConnection,
  testMCPConnection,
  updateLLMProvider,
  updatePrompt,
  updatePublicChatConfig,
  updateSkill,
} from "@/services/caseworker-api";
import type { LLMProvider, MCPServer, Prompt, PublicChatConfig, Skill } from "@/types/caseworker";

type Tab = "prompts" | "skills" | "public-chat" | "llm" | "mcp";

function rows<T>(data: { results?: T[] } | T[]): T[] {
  return Array.isArray(data) ? data : data.results ?? [];
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function PromptsTab({ skills }: { skills: Skill[] }) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Prompt>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    listPrompts().then((data) => setPrompts(rows(data)));
  }, []);

  const blank = (): Partial<Prompt> => ({
    name: "",
    display_name: "",
    description: "",
    prompt: "",
    skills: [],
    model: "claude-opus-4-6",
    temperature: 0.2,
    max_tokens: 1000,
  });

  const save = async () => {
    setError("");
    try {
      if (creating) {
        const created = await createPrompt(form);
        setPrompts((current) => [...current, created]);
      } else if (editing) {
        const updated = await updatePrompt(editing.id, form);
        setPrompts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      }
      setCreating(false);
      setEditing(null);
      setForm({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const remove = async (id: number) => {
    await deletePrompt(id);
    setPrompts((current) => current.filter((item) => item.id !== id));
  };

  const toggleSkill = (id: number) => {
    const selected = form.skills ?? [];
    setForm((current) => ({
      ...current,
      skills: selected.includes(id)
        ? selected.filter((skillId) => skillId !== id)
        : [...selected, id],
    }));
  };

  const isOpen = creating || Boolean(editing);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{prompts.length} prompt{prompts.length !== 1 ? "s" : ""} configured</p>
        <Button size="sm" onClick={() => { setForm(blank()); setCreating(true); setEditing(null); }}>
          <Plus className="mr-1 h-4 w-4" /> New Prompt
        </Button>
      </div>

      {isOpen ? (
        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium">{creating ? "Create Prompt" : "Edit Prompt"}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="skill-name">Name (slug)</Label>
              <Input id="skill-name" value={form.name ?? ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="case-summarizer" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="skill-display-name">Display Name</Label>
              <Input id="skill-display-name" value={form.display_name ?? ""} onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))} placeholder="Case Summarizer" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="skill-description">Description</Label>
              <Input id="skill-description" value={form.description ?? ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="skill-prompt">System Prompt</Label>
              <Textarea
                id="skill-prompt"
                value={form.prompt ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, prompt: e.target.value }))}
                rows={5}
                placeholder="You are a caseworker assistant. Summarize case {case_data} based on: {query}"
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">Use <code className="bg-muted px-0.5 rounded">{"{case_data}"}</code> and <code className="bg-muted px-0.5 rounded">{"{query}"}</code> as placeholders.</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="skill-model">Model</Label>
              <Input id="skill-model" value={form.model ?? ""} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} placeholder="claude-opus-4-6" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="skill-temperature">Temperature</Label>
                <Input id="skill-temperature" type="number" min={0} max={2} step={0.1} value={form.temperature ?? 0.7} onChange={(e) => setForm((p) => ({ ...p, temperature: parseFloat(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="skill-max-tokens">Max Tokens</Label>
                <Input id="skill-max-tokens" type="number" min={100} max={100000} value={form.max_tokens ?? 2000} onChange={(e) => setForm((p) => ({ ...p, max_tokens: parseInt(e.target.value) }))} />
              </div>
            </div>
          </div>
          {skills.length > 0 ? (
            <div className="space-y-2">
              <Label>Loaded Skills</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {skills.map((skill) => (
                  <label key={skill.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <input type="checkbox" checked={(form.skills ?? []).includes(skill.id)} onChange={() => toggleSkill(skill.id)} />
                    {skill.display_name ?? skill.name}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Check className="mr-1 h-4 w-4" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setEditing(null); setForm({}); }}><X className="mr-1 h-4 w-4" /> Cancel</Button>
          </div>
        </div>
      ) : null}

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
                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Edit ${s.display_name ?? s.name}`} onClick={() => startEdit(s)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" aria-label={`Delete ${s.display_name ?? s.name}`} onClick={() => remove(s.id)}>
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

function PublicChatTab({ prompts, providers }: { prompts: Prompt[]; providers: LLMProvider[] }) {
  const [configs, setConfigs] = useState<PublicChatConfig[]>([]);
  const [form, setForm] = useState<Partial<PublicChatConfig>>({});
  const active = configs[0] ?? null;

  useEffect(() => {
    listPublicChatConfigs().then((data) => {
      const loaded = rows(data);
      setConfigs(loaded);
      if (loaded[0]) setForm(loaded[0]);
    });
  }, []);

  const save = async () => {
    const saved = active
      ? await updatePublicChatConfig(active.id, form)
      : await createPublicChatConfig({
          name: "default",
          is_active: true,
          enabled: true,
          quota_scope: "ip_session",
          quota_limit: 10,
          quota_window_seconds: 86400,
          max_question_chars: 1000,
          max_history_turns: 6,
          max_history_chars: 4000,
          max_mcp_results: 5,
          max_tool_calls: 3,
          max_evidence_chars: 8000,
          ...form,
        });
    setConfigs([saved]);
    setForm(saved);
  };

  const numberField = (field: keyof PublicChatConfig, label: string) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type="number" min={1} value={Number(form[field] ?? 1)} onChange={(event) => setForm((current) => ({ ...current, [field]: Number(event.target.value) }))} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Prompt</Label>
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.prompt ?? ""} onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value ? Number(event.target.value) : undefined }))}>
            <option value="">Select prompt</option>
            {prompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{prompt.display_name ?? prompt.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label>LLM Provider</Label>
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.llm_provider ?? ""} onChange={(event) => setForm((current) => ({ ...current, llm_provider: event.target.value ? Number(event.target.value) : null }))}>
            <option value="">Use active provider</option>
            {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.provider_type} - {provider.model}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Quota Scope</Label>
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.quota_scope ?? "ip_session"} onChange={(event) => setForm((current) => ({ ...current, quota_scope: event.target.value as PublicChatConfig["quota_scope"] }))}>
            <option value="ip_session">IP + Session</option>
            <option value="session">Session</option>
            <option value="ip">IP</option>
          </select>
        </div>
        <label className="flex items-center gap-2 pt-7 text-sm">
          <input type="checkbox" checked={form.enabled ?? true} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} />
          Enabled
        </label>
        {numberField("quota_limit", "Quota Limit")}
        {numberField("quota_window_seconds", "Quota Window Seconds")}
        {numberField("max_question_chars", "Max Question Characters")}
        {numberField("max_history_turns", "Max History Turns")}
        {numberField("max_history_chars", "Max History Characters")}
        {numberField("max_mcp_results", "Max MCP Results")}
        {numberField("max_tool_calls", "Max Tool Calls")}
        {numberField("max_evidence_chars", "Max Evidence Characters")}
      </div>
      <Button size="sm" onClick={save}><Check className="mr-1 h-4 w-4" /> Save Public Chat Config</Button>
    </div>
  );
}

function LLMTab() {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LLMProvider | null>(null);
  const [form, setForm] = useState<Partial<LLMProvider> & { api_key?: string }>({});
  const [testing, setTesting] = useState<number | null>(null);
  const [status, setStatus] = useState<Record<number, boolean | null>>({});

  useEffect(() => {
    listLLMProviders().then((data) => setProviders(data.results ?? []));
  }, []);

  const blank = () => ({ provider_type: "anthropic" as const, model: "claude-opus-4-6", temperature: 0.7, max_tokens: 2000, is_active: true, api_key: "" });
  const save = async () => {
    const saved = creating
      ? await createLLMProvider(form as Partial<LLMProvider> & { api_key: string })
      : editing
        ? await updateLLMProvider(editing.id, form)
        : null;
    if (saved) setProviders((current) => creating ? [...current, saved] : current.map((item) => item.id === saved.id ? saved : item));
    setCreating(false);
    setEditing(null);
    setForm({});
  };

  const test = async (id: number) => {
    setTesting(id);
    try {
      const result = await testLLMConnection(id);
      setStatus((current) => ({ ...current, [id]: result.connected }));
    } catch {
      setStatus((current) => ({ ...current, [id]: false }));
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{providers.length} provider{providers.length !== 1 ? "s" : ""} configured</p>
        <Button size="sm" onClick={() => { setForm(blank()); setCreating(true); setEditing(null); }}><Plus className="mr-1 h-4 w-4" /> Add Provider</Button>
      </div>

      {isOpen && (
        <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
          <p className="font-medium text-sm">{creating ? "Add LLM Provider" : "Edit LLM Provider"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="llm-provider-type">Provider</Label>
              <select
                id="llm-provider-type"
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={form.provider_type ?? "anthropic"}
                onChange={(e) => setForm((p) => ({ ...p, provider_type: e.target.value as LLMProvider["provider_type"] }))}
              >
                {providerTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="llm-model">Model</Label>
              <Input id="llm-model" value={form.model ?? ""} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} placeholder="claude-opus-4-6" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="llm-api-key">API Key</Label>
              <Input id="llm-api-key" type="password" value={form.api_key ?? ""} onChange={(e) => setForm((p) => ({ ...p, api_key: e.target.value }))} placeholder={editing ? "Leave blank to keep existing" : "sk-..."} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="llm-temperature">Temperature</Label>
              <Input id="llm-temperature" type="number" min={0} max={2} step={0.1} value={form.temperature ?? 0.7} onChange={(e) => setForm((p) => ({ ...p, temperature: parseFloat(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="llm-max-tokens">Max Tokens</Label>
              <Input id="llm-max-tokens" type="number" min={100} value={form.max_tokens ?? 2000} onChange={(e) => setForm((p) => ({ ...p, max_tokens: parseInt(e.target.value) }))} />
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
                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Edit ${p.provider_type} provider`} onClick={() => startEdit(p)}>
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

function MCPTab() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<MCPServer> & { auth_token?: string }>({});
  const [testing, setTesting] = useState<number | null>(null);
  const [status, setStatus] = useState<Record<number, boolean | null>>({});

  useEffect(() => {
    listMCPServers().then((data) => setServers(data.results ?? []));
  }, []);

  const save = async () => {
    const created = await createMCPServer(form as Partial<MCPServer> & { auth_token: string });
    setServers((current) => [...current, created]);
    setCreating(false);
    setForm({});
  };

  const test = async (id: number) => {
    setTesting(id);
    try {
      const result = await testMCPConnection(id);
      setStatus((current) => ({ ...current, [id]: result.connected }));
    } catch {
      setStatus((current) => ({ ...current, [id]: false }));
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{servers.length} server{servers.length !== 1 ? "s" : ""} configured</p>
        <Button size="sm" onClick={() => { setCreating(true); setForm({ name: "", display_name: "", url: "", auth_type: "bearer", auth_token: "" }); }}><Plus className="mr-1 h-4 w-4" /> Add Server</Button>
      </div>

      {creating && (
        <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
          <p className="font-medium text-sm">Add MCP Server</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="mcp-name">Name</Label>
              <Input id="mcp-name" value={form.name ?? ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="case-system" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mcp-display-name">Display Name</Label>
              <Input id="mcp-display-name" value={form.display_name ?? ""} onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))} placeholder="Case Management System" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="mcp-url">URL</Label>
              <Input id="mcp-url" value={form.url ?? ""} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://api.example.com/mcp" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mcp-auth-type">Auth Type</Label>
              <select
                id="mcp-auth-type"
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                value={form.auth_type ?? "bearer"}
                onChange={(e) => setForm((p) => ({ ...p, auth_type: e.target.value as MCPServer["auth_type"] }))}
              >
                <option value="bearer">Bearer Token</option>
                <option value="api_key">API Key</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mcp-auth-token">Auth Token</Label>
              <Input id="mcp-auth-token" type="password" value={form.auth_token ?? ""} onChange={(e) => setForm((p) => ({ ...p, auth_token: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Check className="h-4 w-4 mr-1" /> Save</Button>
            <Button size="sm" variant="ghost" onClick={cancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          </div>
        </div>
      ) }
      {servers.map((server) => (
        <div key={server.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">{server.display_name ?? server.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{server.url}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => test(server.id)} disabled={testing === server.id}>
            {status[server.id] === true ? <Zap className="mr-1 h-3 w-3" /> : <RefreshCw className={`mr-1 h-3 w-3 ${testing === server.id ? "animate-spin" : ""}`} />}
            Test
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function CaseworkerSettings() {
  const { isAdmin } = useCaseworkerAuth();
  const [tab, setTab] = useState<Tab>("prompts");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [providers, setProviders] = useState<LLMProvider[]>([]);

  useEffect(() => {
    Promise.all([listSkills(), listPrompts(), listLLMProviders()]).then(([skillsData, promptsData, providersData]) => {
      setSkills(rows(skillsData));
      setPrompts(rows(promptsData));
      setProviders(providersData.results ?? []);
    });
  }, []);

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/20">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Access denied. Administrator role required.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "prompts", label: "Prompts" },
    { id: "skills", label: "Skills" },
    { id: "public-chat", label: "Public Chat" },
    { id: "llm", label: "LLM Providers" },
    { id: "mcp", label: "MCP Servers" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <Header />
      <div className="container mx-auto max-w-4xl flex-1 px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/caseworker/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Dashboard</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Configure prompts, skills, public chat limits, LLM providers, and MCP servers</p>
          </div>
        </div>

        <div className="mb-5 flex gap-1 border-b border-border">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
                tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <SectionCard title={tabs.find((item) => item.id === tab)?.label ?? "Settings"}>
          {tab === "prompts" ? <PromptsTab skills={skills} /> : null}
          {tab === "skills" ? <SkillsTab /> : null}
          {tab === "public-chat" ? <PublicChatTab prompts={prompts} providers={providers} /> : null}
          {tab === "llm" ? <LLMTab /> : null}
          {tab === "mcp" ? <MCPTab /> : null}
        </SectionCard>
      </div>
    </div>
  );
}
