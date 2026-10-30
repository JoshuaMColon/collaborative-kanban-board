/** @type {import('tailwindcss').Config} */

// Every color is a CSS variable holding space-separated RGB channels (see
// src/index.css), so opacity modifiers like `bg-accent/15` work and the whole
// app can be rethemed by editing a handful of variables.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        page: token("page-bg"),
        surface: {
          DEFAULT: token("surface"),
          2: token("surface-2"),
        },
        line: {
          DEFAULT: token("border"),
          strong: token("border-strong"),
        },
        accent: {
          DEFAULT: token("accent"),
          fg: token("accent-fg"),
        },
        success: token("success"),
        priority: {
          low: token("priority-low"),
          standard: token("priority-standard"),
          urgent: token("priority-urgent"),
        },
        text: {
          primary: token("text-primary"),
          secondary: token("text-secondary"),
          muted: token("text-muted"),
        },
      },
      fontFamily: {
        display: ["'Nunito'", "ui-rounded", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(var(--shadow) / 0.06), 0 2px 8px -2px rgb(var(--shadow) / 0.08)",
        "soft-hover":
          "0 2px 4px rgb(var(--shadow) / 0.06), 0 8px 20px -6px rgb(var(--shadow) / 0.14)",
        lift: "0 12px 28px -8px rgb(var(--shadow) / 0.28), 0 4px 10px -4px rgb(var(--shadow) / 0.16)",
        pop: "0 24px 60px -20px rgb(var(--shadow) / 0.35)",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        cardIn: {
          "0%": {
            opacity: "0",
            transform: "translateY(18px) scale(0.985)",
            filter: "blur(6px)",
          },
          "100%": { opacity: "1", transform: "none", filter: "blur(0)" },
        },
        newCard: {
          "0%": {
            boxShadow:
              "0 0 0 3px rgb(var(--accent) / 0.45), 0 1px 2px rgb(var(--shadow) / 0.06), 0 2px 8px -2px rgb(var(--shadow) / 0.08)",
            backgroundColor: "rgb(var(--accent) / 0.10)",
          },
          "100%": {
            boxShadow:
              "0 0 0 0 rgb(var(--accent) / 0), 0 1px 2px rgb(var(--shadow) / 0.06), 0 2px 8px -2px rgb(var(--shadow) / 0.08)",
            backgroundColor: "rgb(var(--surface))",
          },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
        fadeUp: "fadeUp 220ms ease-out both",
        fadeIn: "fadeIn 180ms ease-out both",
        newCard: "newCard 1.8s ease-out backwards",
        cardIn: "cardIn 650ms cubic-bezier(0.22,1,0.36,1) 100ms both",
      },
    },
  },
  plugins: [],
};
