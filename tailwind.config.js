/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "var(--surface-bg)",
          surface: "var(--surface-bg)",
          border: "var(--border)",
          borderLight: "var(--border-strong)",
        },
        signal: {
          amber: "var(--accent)",
          amberDim: "var(--accent-soft)",
        },
        live: {
          green: "var(--success)",
          greenDim: "var(--success-soft)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "ui-sans-serif", "system-ui"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
        sans: ["'Inter'", "ui-sans-serif", "system-ui"],
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};
