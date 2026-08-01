import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#07090f",
        field: "#0e1420",
        brass: {
          DEFAULT: "#c9a227",
          soft: "#e2c45a",
        },
      },
      /*
       * Font fallback is resolved per GLYPH, not per run. Neither Fraunces nor
       * Sora ships a Devanagari subset, so with `system-ui` next in line every
       * श्लोक and every Hindi label resolved to whatever the OS happened to
       * have — Devanagari MT on macOS, Nirmala UI on Windows, anyone's guess on
       * Android. Slotting --font-devanagari ahead of the generics costs Latin
       * nothing (Fraunces/Sora still win every Latin glyph) and means the app
       * now typesets its own core content instead of delegating it.
       */
      fontFamily: {
        display: ["var(--font-display)", "var(--font-devanagari)", "Georgia", "serif"],
        body: ["var(--font-body)", "var(--font-devanagari)", "system-ui", "sans-serif"],
        /** Opt in explicitly where Devanagari IS the content, not a fallback. */
        devanagari: [
          "var(--font-devanagari)",
          "var(--font-display)",
          "Georgia",
          "serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
