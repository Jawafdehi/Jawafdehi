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
        },
        "code-surface": {
          DEFAULT: "hsl(var(--code-surface))",
          foreground: "hsl(var(--code-surface-foreground))",
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
        // Categorical tones — see src/index.css. Use opacity for fills and
        // borders (bg-tone-media/10, border-tone-media/25).
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
