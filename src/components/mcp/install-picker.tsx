import type { ReactNode } from "react";
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

type Step = { key: string; text: ReactNode; field?: ReactNode; hint?: string };

/**
 * Every client is one numbered list, so the tabs read alike. A chat app's
 * steps are prose, with the URL to paste after them; a CLI's are "add it" then
 * "sign in", each with the field it refers to.
 */
function ClientPanel({ client }: Readonly<{ client: McpClient }>) {
  const { t } = useTranslation();
  const { key, pasteUrl, command, config, signIn } = client;

  // Optional per-client copy. returnObjects hands back the key itself when the
  // array is missing, so anything that is not an array means "no steps".
  const rawSteps = t(`mcp.clients.${key}.steps`, { returnObjects: true });
  const prose = Array.isArray(rawSteps) ? (rawSteps as string[]) : [];
  const note = t(`mcp.clients.${key}.note`, { defaultValue: "" });

  const steps: Step[] = prose.map((text) => ({ key: text, text }));
  if (command) {
    steps.push({
      key: "command",
      text: t("mcp.clients.runCommand"),
      field: (
        <TerminalCommand
          command={command.line}
          label={command.label}
          copyLabel={t("mcp.clients.copyCommand")}
        />
      ),
    });
  }
  if (config) {
    steps.push({
      key: "config",
      text: (
        <>
          {t("mcp.clients.addConfig")}{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">{config.path}</code>
        </>
      ),
      field: (
        <TerminalSnippet body={config.body} label={config.path} copyLabel={t("mcp.clients.copyConfig")} />
      ),
    });
  }
  if (signIn) {
    steps.push({
      key: "signIn",
      text: t("mcp.signIn.step"),
      field: (
        <TerminalCommand
          command={signIn.line}
          label={signIn.label}
          copyLabel={t("mcp.clients.copyCommand")}
        />
      ),
      hint: t(`mcp.clients.${key}.signInHint`),
    });
  }

  return (
    <div>
      {/* Numbered like the case page's key allegations: an accent ordinal,
          not a badge. The "#" is decorative — the <ol> already tells a screen
          reader these are numbered. */}
      <ol className="space-y-5">
        {steps.map((step, index) => (
          <li key={step.key} className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="w-8 shrink-0 text-lg font-medium leading-7 text-accent"
            >
              #{index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={BODY}>{step.text}</p>
              {step.field ? <div className="mt-3">{step.field}</div> : null}
              {step.hint ? <p className={`mt-3 ${BODY}`}>{step.hint}</p> : null}
            </div>
          </li>
        ))}
      </ol>

      {/* Below here everything is indented to the step text, not the
          numbers: ml-12 is the ordinal column (w-8) plus its gap (gap-4). */}
      {pasteUrl ? (
        <TerminalWindow
          className="ml-12 mt-6"
          label={t("mcp.endpoint.label")}
          action={<TerminalCopyButton value={MCP_URL} label={t("mcp.endpoint.copyLabel")} />}
        >
          <code className="block font-mono text-[13px] leading-6 text-foreground [overflow-wrap:anywhere] sm:text-sm">
            {MCP_URL}
          </code>
        </TerminalWindow>
      ) : null}

      {note ? <p className={`ml-12 mt-6 ${BODY}`}>{note}</p> : null}
    </div>
  );
}
