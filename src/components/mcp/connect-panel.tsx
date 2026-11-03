// "Set it up": how to connect each assistant, one tab per client, following
// the pilot flyer's tested steps. Each panel is a quickstart-style stepper —
// numbered markers, the one thing to copy (server address, commands
// or config) inside the step that uses it, and a closing "try it" step — with
// where it runs and what plan it needs in a quiet side column.
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { chipVariants } from "@/components/ui/chip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyBlock, CopyPill } from "@/components/copy-snippet";
import { cn } from "@/lib/utils";

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
              className={chipVariants()}
            >
              {t(`mcp.connect.clients.${key}.name`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {CLIENTS.map(({ key, copy, copyAtStep }) => {
          const base = `mcp.connect.clients.${key}`;
          const steps = t(`${base}.steps`, { returnObjects: true }) as string[];
          const platforms = t(`${base}.platforms`, { returnObjects: true }) as string[];
          const hasAfter = i18n.exists(`${base}.after`);
          const plan = [
            i18n.exists(`${base}.requirement`) ? t(`${base}.requirement`) : null,
            i18n.exists(`${base}.plan`) ? t(`${base}.plan`) : null,
          ].filter(Boolean);
          return (
            <TabsContent key={key} value={key} className="mt-10 focus-visible:ring-offset-0">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-16">
                <ol className="relative">
                  {Array.isArray(steps) &&
                    steps.map((step, i) => (
                      <Step key={step} marker={i + 1}>
                        <p className="text-lg leading-8 text-foreground">{step}</p>
                        {i === copyAtStep ? <CopyTarget copy={copy} /> : null}
                        {i === steps.length - 1 && i18n.exists(`${base}.important`) ? (
                          <p className="mt-4 border-l-2 border-accent pl-4 text-base leading-7 text-foreground/80">
                            <span className="font-medium text-accent">{t("mcp.connect.importantLabel")}</span>{" "}
                            {t(`${base}.important`)}
                          </p>
                        ) : null}
                      </Step>
                    ))}
                  {hasAfter ? (
                    <Step marker="done">
                      <p className="text-lg leading-8 text-foreground">{t(`${base}.after`)}</p>
                    </Step>
                  ) : null}
                </ol>

                <aside className="space-y-6 text-base leading-7">
                  <div>
                    <h3 className="text-sm text-muted-foreground">{t("mcp.connect.worksIn")}</h3>
                    <p className="mt-1 text-foreground">{Array.isArray(platforms) ? platforms.join(" · ") : null}</p>
                  </div>
                  {plan.length > 0 ? (
                    <div>
                      <h3 className="text-sm text-muted-foreground">{t("mcp.connect.planLabel")}</h3>
                      {plan.map((line) => (
                        <p key={line} className="mt-1 text-foreground/80">{line}</p>
                      ))}
                    </div>
                  ) : null}
                </aside>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </>
  );
}

/** One step of the setup: a numbered marker beside the instruction,
 * docs-quickstart style. The closing step ("try it") gets a check in place of
 * a number. */
function Step({
  marker,
  children,
}: Readonly<{ marker: number | "done"; children: React.ReactNode }>) {
  return (
    <li className="flex gap-5 pb-9 last:pb-0">
      <span
        aria-hidden="true"
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm tabular-nums",
          marker === "done" ? "bg-primary-surface text-primary-foreground" : "border border-border bg-background text-primary",
        )}
      >
        {marker === "done" ? <Check className="h-4 w-4" /> : marker}
      </span>
      <div className="min-w-0 flex-1 pt-px">{children}</div>
    </li>
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
