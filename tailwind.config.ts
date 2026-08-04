import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jamb: {
          blue: "#0A369D",       // Deep Official Blue
          "blue-light": "#E9F1F7", // Soft Background Blue-Grey
          red: "#D9383A",        // Urgent Action / Timer Highlighting
          green: "#28A745",      // Answered Question / Success
          gold: "#FFC107",       // Warning/Infraction Alert
          dark: "#1A202C",       // Crisp High-Contrast Text
        },
      },
      fontFamily: {
        mono: ["var(--font-geist-mono)", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
