import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Design system: colour must come from semantic tokens, never Tailwind's raw
  // palette. Tokens are defined once in src/index.css and mapped in
  // tailwind.config.ts. See src/lib/case-badges.ts for the reference pattern:
  // a domain value -> token class map, with no palette names anywhere.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/\\b(?:bg|text|border|ring|divide|from|via|to|fill|stroke|shadow|outline|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b/]",
          message:
            "Raw Tailwind palette colour. Use a semantic token instead (bg-muted, text-muted-foreground, border-border, bg-alert, bg-success, text-destructive, bg-code-surface). Tokens live in src/index.css; see src/lib/case-badges.ts for the pattern.",
        },
        {
          selector:
            "TemplateElement[value.raw=/\\b(?:bg|text|border|ring|divide|from|via|to|fill|stroke|shadow|outline|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b/]",
          message:
            "Raw Tailwind palette colour in a template literal. Use a semantic token instead (see src/index.css and src/lib/case-badges.ts).",
        },
      ],
    },
  },
  // Colour-decision modules: the shared class maps and the chart components.
  // These choose colour for a whole surface, so a hex literal here leaks a
  // value the token layer can never retheme. Charts render tokens as
  // hsl(var(--chart-N)) — var() resolves in inline SVG and inline styles too.
  {
    files: [
      "src/lib/**/*.{ts,tsx}",
      "src/components/research/**/*.{ts,tsx}",
      "src/components/data-quality/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/#[0-9a-fA-F]{6}\\b/]",
          message:
            "Hex colour literal. Use a token: hsl(var(--chart-1)), hsl(var(--success)), hsl(var(--muted-foreground)). Chart series live in --chart-1..5 (src/index.css) and are a validated CVD-safe set.",
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{6}\\b|rgba?\\([0-9]/]",
          message:
            "Hex or rgb() colour inside a template literal (usually generated SVG). Use hsl(var(--token)) — var() resolves inside inline SVG.",
        },
      ],
    },
  },
  // Social share controls reproduce third-party brand identity (Facebook blue,
  // WhatsApp green, Telegram sky, ...). Those colours belong to the platforms,
  // not to our palette, so they must stay literal and must not be tokenised.
  {
    files: [
      "src/components/ShareButton.tsx",
      "src/components/InlineShareButtons.tsx",
      "src/components/FloatingShareSidebar.tsx",
    ],
    rules: { "no-restricted-syntax": "off" },
  },
);
