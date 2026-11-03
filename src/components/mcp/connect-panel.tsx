// "Set it up": how to connect each assistant, one tab per client, following
// the pilot flyer's tested steps. Each panel is a short numbered list; the one
// thing to copy — the server address, the commands, or the config — sits in
// the step that uses it. Steps are numbered like the key allegations on a case
// page ("1." in the accent). Where it runs and what plan it needs sit at the top
// of each panel, and the plan note at the bottom, inside the client it is about.
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

// The canonical MCP endpoint, pinned rather than derived from API_BASE_URL:
// that resolves to "" during pre-render and to the SPA's own origin in the
// browser, and this is the string a reader copies off the page.
const MCP_URL = "https://api.jawafdehi.org/mcp";

// The client id Claude Code registers with; the same one the team's own
// setup notes use (docs/2026-08-11-mcp-canonical-url.md in the meta-repo).
// Shown over several lines with shell continuations, as in the flyer; the
// copied text is the same, runnable as pasted.
const CLAUDE_CODE_LINES = [
  { text: "claude mcp add --transport http jawafdehi \\", prompt: true },
  { text: `    ${MCP_URL} \\` },
  { text: "    --client-id 380811001584419184 -s user" },
  { text: "claude mcp login jawafdehi", prompt: true },
];
const CODEX_CONFIG = `[mcp_servers.jawafdehi]\nurl = "${MCP_URL}"`;

type Copyable =
  | { kind: "url" }
  | { kind: "commands"; lines: ReadonlyArray<{ text: string; prompt?: boolean }> }
  | { kind: "config"; text: string; comment: string };

/** Per client: what to copy, and which numbered step carries it. */
const CLIENTS: ReadonlyArray<{ key: string; copy: Copyable; copyAtStep: number }> = [
  { key: "claude", copy: { kind: "url" }, copyAtStep: 1 },
  { key: "chatgpt", copy: { kind: "url" }, copyAtStep: 1 },
  { key: "claudeCode", copy: { kind: "commands", lines: CLAUDE_CODE_LINES }, copyAtStep: 0 },
  { key: "codex", copy: { kind: "config", text: CODEX_CONFIG, comment: "# ~/.codex/config.toml" }, copyAtStep: 0 },
];

export function ConnectPanel() {
  const { t, i18n } = useTranslation();

  return (
    <>
      <Tabs defaultValue={CLIENTS[0].key} className="mt-8">
        <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
          {CLIENTS.map(({ key }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="rounded-full border border-border px-4 py-2 text-base font-normal text-foreground/75 hover:border-primary-surface/40 hover:text-foreground data-[state=active]:border-primary-surface data-[state=active]:bg-primary-surface data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              {t(`mcp.connect.clients.${key}.name`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {CLIENTS.map(({ key, copy, copyAtStep }) => {
          const base = `mcp.connect.clients.${key}`;
          const steps = t(`${base}.steps`, { returnObjects: true }) as string[];
          return (
            <TabsContent key={key} value={key} className="mt-8 focus-visible:ring-offset-0">
              <ul aria-label={t("mcp.connect.worksIn")} className="flex flex-wrap gap-2">
                {(t(`${base}.platforms`, { returnObjects: true }) as string[]).map((platform) => (
                  <li key={platform} className="rounded-full bg-muted px-3 py-1 text-sm text-foreground/75">
                    {platform}
                  </li>
                ))}
                {i18n.exists(`${base}.requirement`) ? (
                  <li className="rounded-full bg-accent/10 px-3 py-1 text-sm text-accent">{t(`${base}.requirement`)}</li>
                ) : null}
              </ul>
              <ol className="mt-6 max-w-3xl space-y-7">
                {Array.isArray(steps) &&
                  steps.map((step, i) => (
                    <li key={step} className="flex items-start gap-4">
                      <span aria-hidden="true" className="mt-px shrink-0 text-lg font-medium leading-8 text-accent">
                        {i + 1}.
                      </span>
                      <div className="min-w-0">
                        <p className="text-lg leading-8 text-foreground">{step}</p>
                        {i === copyAtStep ? <CopyTarget copy={copy} /> : null}
                      </div>
                    </li>
                  ))}
              </ol>
              {i18n.exists(`${base}.important`) ? (
                <p className="mt-7 max-w-3xl rounded-2xl bg-accent/5 px-5 py-4 text-base leading-7 text-foreground">
                  <span className="font-medium text-accent">{t("mcp.connect.importantLabel")}</span> {t(`${base}.important`)}
                </p>
              ) : null}
              {i18n.exists(`${base}.after`) ? (
                <p className="mt-6 max-w-3xl text-lg leading-8 text-foreground/75">{t(`${base}.after`)}</p>
              ) : null}
              {i18n.exists(`${base}.plan`) ? (
                <p className="mt-8 max-w-3xl border-t border-border pt-6 text-base leading-7 text-foreground/65">{t(`${base}.plan`)}</p>
              ) : null}
            </TabsContent>
          );
        })}
      </Tabs>

    </>
  );
}

function CopyTarget({ copy }: Readonly<{ copy: Copyable }>) {
  const { t } = useTranslation();
  if (copy.kind === "url") {
    return <CopyPill value={MCP_URL} label={t("mcp.connect.copyAddress")} />;
  }
  if (copy.kind === "commands") {
    return (
      <CopyBlock
        value={copy.lines.map((line) => line.text).join("\n")}
        label={t("mcp.connect.copyCommand")}
        lines={copy.lines}
      />
    );
  }
  return (
    <CopyBlock
      value={copy.text}
      label={t("mcp.connect.copyConfig")}
      lines={[{ text: copy.comment, muted: true }, ...copy.text.split("\n").map((text) => ({ text }))]}
    />
  );
}

function CopyButton({ value, label }: Readonly<{ value: string; label: string }>) {
  const { t } = useTranslation();
  const { status, copy } = useCopyToClipboard(value);
  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {status === "copied" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        {status === "copied" ? t("mcp.copied") : t("mcp.connect.copy")}
      </button>
      <span aria-live="polite" className="sr-only">
        {status === "copied" ? t("mcp.copied") : ""}
        {status === "failed" ? t("mcp.copyFailed") : ""}
      </span>
    </>
  );
}

/** The address, as a rounded pill as wide as its text. */
function CopyPill({ value, label }: Readonly<{ value: string; label: string }>) {
  return (
    <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-muted py-1 pl-5 pr-1">
      <code className="min-w-0 overflow-x-auto whitespace-nowrap py-1.5 text-[15px] font-normal text-foreground [font-family:Inter,var(--font-family-app)]">
        {value}
      </code>
      <CopyButton value={value} label={label} />
    </div>
  );
}

/** Commands or a config file: several lines in the mono face they are typed
 * in, as wide as the longest line, scrolling sideways on narrow screens. */
function CopyBlock({
  value,
  label,
  lines,
}: Readonly<{ value: string; label: string; lines: ReadonlyArray<{ text: string; prompt?: boolean; muted?: boolean }> }>) {
  return (
    <div className="mt-3 inline-flex max-w-full items-start gap-3 rounded-3xl border border-border bg-muted py-3 pl-5 pr-2">
      <pre className="min-w-0 overflow-x-auto whitespace-pre py-1 font-mono text-sm leading-7 text-foreground">
        {lines.map(({ text, prompt, muted }) => (
          <span key={text} className={muted ? "block text-muted-foreground" : "block"}>
            {prompt ? (
              <span aria-hidden="true" className="select-none text-accent">
                ${" "}
              </span>
            ) : null}
            {text}
          </span>
        ))}
      </pre>
      <CopyButton value={value} label={label} />
    </div>
  );
}
