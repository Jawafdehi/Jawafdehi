import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCaseworkerAuth } from "@/context/CaseworkerAuthContext";
import { listPrompts, listDrafts, generateSummary } from "@/services/caseworker-api";
import type { Prompt, Draft, ChatMessage, ChatTab } from "@/types/caseworker";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizonal, Plus, X, Settings, LogOut } from "lucide-react";

const CaseworkerDashboard = () => {
  const { user, isAdmin, logout } = useCaseworkerAuth();
  const navigate = useNavigate();

  const [allPrompts, setAllPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [recentDrafts, setRecentDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [userInput, setUserInput] = useState("");

  const [chatTabs, setChatTabs] = useState<ChatTab[]>([{ id: 1, name: "Chat 1", messages: [] }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [nextTabId, setNextTabId] = useState(2);
  const [renamingTabId, setRenamingTabId] = useState<number | null>(null);
  const [newTabName, setNewTabName] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentMessages = useMemo(() => {
    return chatTabs.find((t) => t.id === activeTabId)?.messages ?? [];
  }, [chatTabs, activeTabId]);

  // ── helpers ──────────────────────────────────────────────────────────────

  const extractCaseNumber = (text: string) => {
    const m = text.match(/(\d{3}-\d{3}-\d{4}|\d{3}-CR-\d{4})/i);
    return m ? m[1] : null;
  };

  const extractPromptName = (text: string) => {
    const m = text.match(/^\/(\w+(?:-\w+)*)/i);
    return m ? m[1] : null;
  };

  const findPromptByName = (name: string) =>
    allPrompts.find(
      (s) =>
        s.name.toLowerCase() === name.toLowerCase() ||
        (s.display_name && s.display_name.toLowerCase() === name.toLowerCase())
    ) ?? null;

  const addMessage = (type: ChatMessage["type"], message: string, isUser = false) => {
    const entry: ChatMessage = {
      id: Date.now() + Math.random(),
      type,
      message,
      timestamp: new Date().toLocaleTimeString(),
      isUser,
    };
    setChatTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, messages: [...t.messages, entry] } : t))
    );
  };

  // ── data loading ─────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const [promptsData, draftsData] = await Promise.all([listPrompts(), listDrafts()]);
        const prompts = Array.isArray(promptsData) ? promptsData : promptsData.results ?? [];
        const drafts = draftsData.results ?? [];
        setAllPrompts(prompts);
        setRecentDrafts(drafts.slice(0, 5));
      } catch (e: unknown) {
        addMessage("error", (e as Error).message ?? "Failed to load data");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // ── tab management ────────────────────────────────────────────────────────

  const createTab = () => {
    setChatTabs((prev) => [...prev, { id: nextTabId, name: `Chat ${nextTabId}`, messages: [] }]);
    setActiveTabId(nextTabId);
    setNextTabId((n) => n + 1);
  };

  const closeTab = (id: number) => {
    if (chatTabs.length === 1) return;
    setChatTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) setActiveTabId(next[0].id);
      return next;
    });
  };

  const saveTabName = (id: number) => {
    if (newTabName.trim()) {
      setChatTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name: newTabName } : t)));
    }
    setRenamingTabId(null);
  };

  // ── submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || loading) return;

    setLoading(true);
    const input = userInput.trim();
    setUserInput("");
    addMessage("user", input, true);

    try {
      const promptName = extractPromptName(input);

      if (promptName) {
        const prompt = findPromptByName(promptName);
        if (!prompt) {
          addMessage(
            "error",
            `Prompt "${promptName}" not found. Available: ${allPrompts.map((s) => s.name).join(", ") || "none"}`
          );
          return;
        }
        setSelectedPrompt(prompt);
        addMessage("info", `Using prompt: ${prompt.display_name ?? prompt.name}`);

        const rest = input.replace(/^\/\w+(?:-\w+)*\s*/, "").trim();
        const caseNumber = extractCaseNumber(rest) ?? "general";
        addMessage("info", `Processing${caseNumber !== "general" ? ` case ${caseNumber}` : ""}…`);

        const summary = await generateSummary(caseNumber, prompt.id, rest);
        addMessage("assistant", summary.content);
      } else {
        const generalPrompt = allPrompts.find((s) => s.name === "general" || s.name === "general-qa");
        if (generalPrompt) {
          addMessage("info", "Processing your message…");
          const summary = await generateSummary("general", generalPrompt.id, input);
          addMessage("assistant", summary.content);
        } else {
          addMessage(
            "info",
            allPrompts.length > 0
              ? `Use /${allPrompts[0].name} to invoke a prompt, or configure a "general" prompt in Settings.`
              : "No prompts configured. Visit Settings to add one."
          );
        }
      }
    } catch (e: unknown) {
      addMessage("error", (e as Error).message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {/* top bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Caseworker Agent</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium">{user?.username}</span>
              {isAdmin && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Admin</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/caseworker/settings">
                  <Settings className="h-4 w-4 mr-1" /> Settings
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                navigate("/caseworker/login");
              }}
            >
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat panel */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-border flex flex-col" style={{ minHeight: "600px" }}>
            {/* tabs */}
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-border overflow-x-auto" role="tablist" aria-label="Caseworker chats">
              {chatTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg cursor-pointer text-sm transition select-none ${
                    activeTabId === tab.id
                      ? "bg-primary/10 border-b-2 border-primary text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {renamingTabId === tab.id ? (
                    <input
                      className="px-1 py-0.5 border rounded text-xs w-24"
                      value={newTabName}
                      onChange={(e) => setNewTabName(e.target.value)}
                      onBlur={() => saveTabName(tab.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTabName(tab.id);
                        if (e.key === "Escape") setRenamingTabId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTabId === tab.id}
                      className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={() => setActiveTabId(tab.id)}
                      onDoubleClick={() => { setRenamingTabId(tab.id); setNewTabName(tab.name); }}
                    >
                      {tab.name}
                    </button>
                  )}
                  {chatTabs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => closeTab(tab.id)}
                      aria-label={`Close ${tab.name}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={createTab}
                aria-label="Create new chat"
                className="px-2 py-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {currentMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 space-y-2">
                  <p className="text-base font-medium">Start a conversation</p>
                  <p className="text-sm">
                    Use <code className="bg-muted px-1 rounded">/prompt-name</code> to invoke a prompt,
                    or just type freely.
                  </p>
                  {allPrompts.length > 0 && (
                    <div className="mt-4 space-y-1">
                      {allPrompts.map((s) => (
                        <div key={s.id} className="text-xs text-muted-foreground">
                          <span className="font-mono text-primary">/{s.name}</span> — {s.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                currentMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                        msg.isUser
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : msg.type === "error"
                          ? "bg-red-50 text-red-800 border border-red-200 rounded-tl-sm"
                          : msg.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-tl-sm"
                          : msg.type === "info"
                          ? "bg-blue-50 text-blue-800 border border-blue-200 rounded-tl-sm"
                          : "bg-muted text-foreground rounded-tl-sm"
                      }`}
                    >
                      {msg.message}
                      <div className="text-xs opacity-50 mt-1">{msg.timestamp}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* input */}
            <form onSubmit={handleSubmit} className="border-t border-border p-4 flex gap-3 items-end">
              <label htmlFor="caseworker-message" className="sr-only">
                Message
              </label>
              <Textarea
                id="caseworker-message"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                rows={2}
                disabled={loading}
                className="resize-none flex-1"
              />
              <Button type="submit" size="icon" aria-label="Send message" disabled={loading || !userInput.trim()}>
                <SendHorizonal className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* selected prompt */}
            {selectedPrompt && (
              <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Active Prompt</p>
                <p className="font-medium text-sm">{selectedPrompt.display_name ?? selectedPrompt.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedPrompt.description}</p>
              </div>
            )}

            {/* recent drafts */}
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Drafts</p>
              {recentDrafts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No drafts yet</p>
              ) : (
                <div className="space-y-1.5">
                  {recentDrafts.map((d) => (
                    <div key={d.id} className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-foreground">{d.case_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(d.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseworkerDashboard;
