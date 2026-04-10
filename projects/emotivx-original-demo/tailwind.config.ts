import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        sans: ["var(--font-body)", "sans-serif"],
      },
      colors: {
        background: "#080810",
        electric: "#8AE234",
        gold: "#F5B041",
        ink: "#080810",
      },
      boxShadow: {
        glow: "0 0 20px rgba(138, 226, 52, 0.35)",
        "glow-lime": "0 0 20px rgba(138, 226, 52, 0.35)",
        "glow-lime-lg": "0 0 40px rgba(138, 226, 52, 0.55)",
      },
    },
  },
  plugins: [],
} satisfies Config;
