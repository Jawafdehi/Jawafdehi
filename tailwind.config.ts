import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["Vesper Libre", "Georgia", "Noto Sans Devanagari", "serif"],
        // "Register" data face: figures, counts, dates and case references.
        // Noto Sans Devanagari carries Nepali digits/text that appear in a
        // mono context (IBM Plex Mono has no Devanagari glyphs of its own).
        mono: [
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Noto Sans Devanagari",
          "monospace",
        ],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          // Fill role — buttons, hero gradients, glows. Diverges from DEFAULT
          // in dark mode only. See src/index.css.
          surface: "hsl(var(--primary-surface))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        alert: {
          DEFAULT: "hsl(var(--alert))",
          foreground: "hsl(var(--alert-foreground))",
          strong: "hsl(var(--alert-strong))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          strong: "hsl(var(--success-strong))",
        },
        navy: {
          dark: "hsl(var(--navy-dark))",
          light: "hsl(var(--navy-light))",
          deep: "hsl(var(--navy-deep))",
        },
        "code-surface": {
          DEFAULT: "hsl(var(--code-surface))",
          foreground: "hsl(var(--code-surface-foreground))",
        },
        // Fixed document/embed surface — see src/index.css. Same in both themes.
        paper: {
          DEFAULT: "hsl(var(--paper))",
          foreground: "hsl(var(--paper-foreground))",
          muted: "hsl(var(--paper-muted))",
          line: "hsl(var(--paper-line))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        // Chart series — CVD-safe set, see src/index.css. Charts pass these to
        // recharts as hsl(var(--chart-N)); the utilities exist for legends.
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        // Raised-surface roles for the archive elevation model — see
        // src/index.css. Pair with a 1px border and a shadow-elev-* step.
        surface: {
          DEFAULT: "hsl(var(--surface))",
          2: "hsl(var(--surface-2))",
        },
        // Series folder tints — series identity on /materials (folder cards,
        // series dots). Categorical/severity colours stay in tone.*.
        folder: {
          1: "hsl(var(--folder-1))",
          2: "hsl(var(--folder-2))",
          3: "hsl(var(--folder-3))",
          4: "hsl(var(--folder-4))",
          5: "hsl(var(--folder-5))",
          6: "hsl(var(--folder-6))",
          7: "hsl(var(--folder-7))",
          8: "hsl(var(--folder-8))",
        },
        // Categorical tones — see src/index.css. Use opacity for fills and
        // borders (bg-tone-blue/10, border-tone-blue/25).
        tone: {
          blue: "hsl(var(--tone-blue))",
          amber: "hsl(var(--tone-amber))",
          emerald: "hsl(var(--tone-emerald))",
          indigo: "hsl(var(--tone-indigo))",
          rose: "hsl(var(--tone-rose))",
          cyan: "hsl(var(--tone-cyan))",
          orange: "hsl(var(--tone-orange))",
          violet: "hsl(var(--tone-violet))",
          teal: "hsl(var(--tone-teal))",
          sky: "hsl(var(--tone-sky))",
          pink: "hsl(var(--tone-pink))",
          fuchsia: "hsl(var(--tone-fuchsia))",
          lime: "hsl(var(--tone-lime))",
          red: "hsl(var(--tone-red))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // The archive elevation scale — tokens in src/index.css. Elevation
      // changes animate shadow and translateY together; see FolderCard.
      boxShadow: {
        "elev-xs": "var(--shadow-elev-xs)",
        "elev-sm": "var(--shadow-elev-sm)",
        "elev-md": "var(--shadow-elev-md)",
        "elev-lg": "var(--shadow-elev-lg)",
      },
      transitionTimingFunction: {
        // Stronger ease-out than Tailwind's built-in: the initial movement is
        // where responsiveness is perceived, so front-load it.
        "out-strong": "cubic-bezier(0.23, 1, 0.32, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        // One-time hero flourish on /materials: the front folder's sheets
        // settle upward once the page is on screen. Runs once, forwards.
        "sheet-rise": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(-8px)" },
        },
        // The /materials hero shelf opens on load: the back folders start
        // stacked behind the front one (translated to centre, unrotated) and
        // fan out to their resting pose. `both` fill keeps them stacked
        // through the start delay. The from/to poses must stay in step with
        // the folders' base utilities in MaterialsLanding.
        "fan-out-left": {
          from: { transform: "translate(58%, 10%) rotate(0deg)" },
          to: { transform: "translate(0, 0) rotate(-6deg)" },
        },
        "fan-out-right": {
          from: { transform: "translate(-58%, 10%) rotate(0deg)" },
          to: { transform: "translate(0, 0) rotate(6deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Sequenced after fan-out: the pile opens, then the papers settle.
        "sheet-rise": "sheet-rise 600ms cubic-bezier(0.23, 1, 0.32, 1) 950ms forwards",
        "fan-out-left": "fan-out-left 700ms cubic-bezier(0.23, 1, 0.32, 1) 250ms both",
        "fan-out-right": "fan-out-right 700ms cubic-bezier(0.23, 1, 0.32, 1) 250ms both",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
