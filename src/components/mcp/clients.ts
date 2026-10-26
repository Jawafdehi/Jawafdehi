// The canonical MCP endpoint, pinned rather than derived from API_BASE_URL.
// API_BASE_URL resolves to "" during pre-render and to window.location.origin in
// the browser when no build-time override is set, so deriving it would publish a
// relative path in the pre-rendered HTML and then hydrate to the SPA's own
// origin — neither of which is where the server lives. This string is the one
// thing a reader copies off the page, so it is written out in full.
export const MCP_URL = "https://api.jawafdehi.org/mcp";

// The public OAuth client every MCP client signs in through. The auth server
// (auth.jawafdehi.org) does not offer dynamic client registration, so clients
// cannot invent their own — each one has to be handed this ID. It is a public
// client ID, published in the Jawafdehi/mcp README, not a secret.
export const OAUTH_CLIENT_ID = "380811001584419184";

// The name every client registers the server under. One name everywhere, so
// `claude mcp list`, `codex mcp list` and the editors' server lists all agree.
export const SERVER_NAME = "jawafdehi";

export type McpClient = {
  key: string;
  /** The app asks for the URL itself, so the panel shows it to copy. */
  pasteUrl?: boolean;
  /** The CLI one-liner, and the shell window it is shown in. */
  command?: { line: string; label: string };
  /** A config-file alternative: where the file lives, and what to put in it. */
  config?: { path: string; body: string };
  /** What to run once it is added, to open the sign-in page, and where. */
  signIn?: { line: string; label: string };
};

const json = (value: unknown) => JSON.stringify(value, null, 2);

// Ordered by who arrives here. Most readers are journalists and researchers in
// a chat app, not developers, so the chat apps lead and the CLIs follow.
export const CLIENTS: readonly McpClient[] = [
  { key: "claude", pasteUrl: true },
  { key: "chatgpt", pasteUrl: true },
  {
    key: "claudeCode",
   
    command: {
      line: `claude mcp add --transport http ${SERVER_NAME} ${MCP_URL} --client-id ${OAUTH_CLIENT_ID} -s user`,
      label: "claude-code",
    },
    // Inside Claude Code: pick jawafdehi, then Authenticate.
    signIn: { line: "/mcp", label: "claude-code" },
  },
  {
    key: "codex",
   
    command: {
      line: `codex mcp add ${SERVER_NAME} --url ${MCP_URL} --oauth-client-id ${OAUTH_CLIENT_ID}`,
      label: "codex",
    },
    signIn: { line: `codex mcp login ${SERVER_NAME}`, label: "codex" },
  },
  {
    key: "gemini",
   
    // A config file rather than `gemini mcp add`, because the client ID has to
    // go in the oauth block and the add command has no flag for it. Gemini
    // reads "url" as SSE; streamable HTTP is "httpUrl".
    config: {
      path: "~/.gemini/settings.json",
      body: json({
        mcpServers: {
          [SERVER_NAME]: { httpUrl: MCP_URL, oauth: { enabled: true, clientId: OAUTH_CLIENT_ID } },
        },
      }),
    },
    signIn: { line: `/mcp auth ${SERVER_NAME}`, label: "gemini-cli" },
  },
];
