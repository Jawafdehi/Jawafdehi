// "Add it to your AI tool": how to connect each client, one tab per client.
//
// Shaped after the clearest MCP setup pages (Exa's per-client panels with the
// raw address as the fallback, CourtListener's numbered steps): each panel is a
// short numbered list, and the one thing to copy — the server address or the
// CLI command — sits in the step that uses it. "Any other MCP client" covers
// everything that speaks remote MCP. Steps are numbered like the key
// allegations on a case page ("1." in the accent), so the site counts things
// one way.
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

// The canonical MCP endpoint, pinned rather than derived from API_BASE_URL:
// that resolves to "" during pre-render and to the SPA's own origin in the
// browser, and this is the string a reader copies off the page.
const MCP_URL = "https://api.jawafdehi.org/mcp";

type Copyable = { kind: "url" } | { kind: "command"; value: string };

/** Per client: which of its numbered steps carries something to copy. */
const CLIENTS: ReadonlyArray<{ key: string; copy: Copyable; copyAtStep: number }> = [
  { key: "claude", copy: { kind: "url" }, copyAtStep: 2 },
  { key: "claudeCode", copy: { kind: "command", value: `claude mcp add --transport http jawafdehi ${MCP_URL}` }, copyAtStep: 0 },
  { key: "chatgpt", copy: { kind: "url" }, copyAtStep: 2 },
  { key: "codex", copy: { kind: "command", value: `codex mcp add jawafdehi --url ${MCP_URL}` }, copyAtStep: 0 },
  { key: "other", copy: { kind: "url" }, copyAtStep: 0 },
];

export function ConnectPanel() {
  const { t } = useTranslation();

  return (
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
        const steps = t(`mcp.connect.clients.${key}.steps`, { returnObjects: true }) as string[];
        const value = copy.kind === "url" ? MCP_URL : copy.value;
        return (
          <TabsContent key={key} value={key} className="mt-10 focus-visible:ring-offset-0">
            <ol className="max-w-3xl space-y-7">
              {Array.isArray(steps) &&
                steps.map((step, i) => (
                  <li key={step} className="flex items-start gap-4">
                    <span aria-hidden="true" className="mt-px shrink-0 text-lg font-medium leading-8 text-accent">
                      {i + 1}.
                    </span>
                    <div className="min-w-0">
                      <p className="text-lg leading-8 text-foreground">{step}</p>
                      {i === copyAtStep ? (
                        <CopyRow
                          value={value}
                          mono={copy.kind === "command"}
                          label={t(copy.kind === "url" ? "mcp.connect.copyAddress" : "mcp.connect.copyCommand")}
                        />
                      ) : null}
                    </div>
                  </li>
                ))}
            </ol>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

/** One line to copy, as wide as its text: the address in Inter, a command in
 * the mono face it is typed in. A line too long for the screen scrolls
 * sideways inside the pill rather than wrapping. */
function CopyRow({ value, label, mono }: Readonly<{ value: string; label: string; mono: boolean }>) {
  const { t } = useTranslation();
  const { status, copy } = useCopyToClipboard(value);

  return (
    <div className="mt-3">
      <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-muted py-1 pl-5 pr-1">
        <code
          className={cn(
            "min-w-0 overflow-x-auto whitespace-nowrap py-1.5 text-[15px] font-normal text-foreground",
            mono ? "font-mono" : "[font-family:Inter,var(--font-family-app)]",
          )}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={label}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {status === "copied" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {status === "copied" ? t("mcp.copied") : t("mcp.connect.copy")}
        </button>
      </div>
      {status === "failed" ? <p className="mt-2 text-sm text-accent">{t("mcp.copyFailed")}</p> : null}
      <span aria-live="polite" className="sr-only">
        {status === "copied" ? t("mcp.copied") : ""}
        {status === "failed" ? t("mcp.copyFailed") : ""}
      </span>
    </div>
  );
}
