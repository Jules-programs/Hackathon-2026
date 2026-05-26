import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        card: "var(--card)",
        line: "var(--line)",
        mint: "var(--mint)",
        amber: "var(--amber)",
        signal: "var(--signal)"
      }
    }
  },
  plugins: []
};

export default config;
