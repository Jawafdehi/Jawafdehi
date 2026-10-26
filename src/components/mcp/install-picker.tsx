import { useTranslation } from "react-i18next";

import {
  CLIENTS,
  MCP_URL,
  type McpClient,
} from "@/components/mcp/clients";
import {
  TerminalCommand,
  TerminalCopyButton,
  TerminalSnippet,
  TerminalWindow,
} from "@/components/mcp/terminal-block";
import { ToggleList, ToggleTrigger } from "@/components/mcp/toggle-tabs";
import { Tabs, TabsContent } from "@/components/ui/tabs";

const STEP_LABEL = "text-base font-medium text-foreground md:text-lg";
const BODY = "font-paragraph font-paragraph-foreground";

/**
 * One tab per client on the page's shared capsule toggle, the same control the
 * Skills section uses. The steps sit straight on the page below it — the
 * fields inside are already boxes, so no card goes around them.
 */
export function InstallPicker() {
  const { t } = useTranslation();

  return (
    <Tabs defaultValue={CLIENTS[0].key} className="mt-6">
      <ToggleList>
        {CLIENTS.map(({ key }) => (
          <ToggleTrigger key={key} value={key}>
            {t(`mcp.clients.${key}.name`)}
          </ToggleTrigger>
        ))}
      </ToggleList>

      {CLIENTS.map((client) => (
        <TabsContent key={client.key} value={client.key} className="mt-8 max-w-3xl">
          <ClientPanel client={client} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ClientPanel({ client }: Readonly<{ client: McpClient }>) {
  const { t } = useTranslation();
  const { key, pasteUrl, command, config, signIn } = client;
  const name = t(`mcp.clients.${key}.name`);

  // Optional per-client copy. returnObjects hands back the key itself when the
  // array is missing, so anything that is not an array means "no steps".
  const rawSteps = t(`mcp.clients.${key}.steps`, { returnObjects: true });
  const steps = Array.isArray(rawSteps) ? (rawSteps as string[]) : [];
  const note = t(`mcp.clients.${key}.note`, { defaultValue: "" });

  // Every block after the first is an alternative to the ones above it, and
  // says so — a reader should do one of these, not all of them.
  let shown = 0;
  const lead = (first: string, alternative: string) => (shown++ === 0 ? first : alternative);

  return (
    <div className="space-y-8">
      {steps.length > 0 ? (
        <div>
          <p className={STEP_LABEL}>{lead(t("mcp.clients.inApp", { name }), t("mcp.clients.orInApp", { name }))}</p>
          {/* Numbered like the case page's key allegations: a bold accent
              ordinal, not a badge. The "#" is decorative — the <ol> already
              tells a screen reader these are numbered. */}
          <ol className="mt-4 space-y-4">
            {steps.map((step, index) => (
              <li key={step} className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="w-8 shrink-0 text-lg font-medium leading-7 text-accent"
                >
                  #{index + 1}
                </span>
                <p className={BODY}>{step}</p>
              </li>
            ))}
          </ol>

          {/* The URL the steps say to paste. The chat apps are the only
              clients with nothing else on the panel that contains it. */}
          {pasteUrl ? (
            <TerminalWindow
              // Indented to the step text, not the numbers: ml-12 is the
              // ordinal column (w-8) plus the gap after it (gap-4).
              className="ml-12 mt-6"
              label={t("mcp.endpoint.label")}
              action={<TerminalCopyButton value={MCP_URL} label={t("mcp.endpoint.copyLabel")} />}
            >
              <code className="block font-mono text-[13px] leading-6 text-foreground [overflow-wrap:anywhere] sm:text-sm">
                {MCP_URL}
              </code>
            </TerminalWindow>
          ) : null}
        </div>
      ) : null}

      {command ? (
        <div>
          <p className={STEP_LABEL}>{lead(t("mcp.clients.runCommand"), t("mcp.clients.orRunCommand"))}</p>
          <div className="mt-3">
            <TerminalCommand
              command={command.line}
              label={command.label}
              copyLabel={t("mcp.clients.copyCommand")}
            />
          </div>
        </div>
      ) : null}

      {config ? (
        <div>
          <p className={STEP_LABEL}>
            {lead(t("mcp.clients.addConfig"), t("mcp.clients.orAddConfig"))}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm font-medium">{config.path}</code>
          </p>
          <div className="mt-3">
            <TerminalSnippet
              body={config.body}
              label={config.path}
              copyLabel={t("mcp.clients.copyConfig")}
            />
          </div>
        </div>
      ) : null}

      {note ? <p className={BODY}>{note}</p> : null}

      {signIn ? (
        <div>
          <p className={STEP_LABEL}>{t("mcp.signIn.then")}</p>
          <div className="mt-3">
            <TerminalCommand
              command={signIn.line}
              label={signIn.label}
              copyLabel={t("mcp.clients.copyCommand")}
            />
          </div>
          <p className={`mt-3 ${BODY}`}>
            {t(`mcp.clients.${key}.signInHint`)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
