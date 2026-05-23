import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#06070d",
        foreground: "#f8fafc",
        muted: "#94a3b8",
        panel: "rgba(15, 23, 42, 0.72)",
        cyan: "#22d3ee",
        lime: "#a3e635",
        rose: "#fb7185"
      },
      boxShadow: {
        glow: "0 0 60px rgba(34, 211, 238, 0.22)"
      }
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;
