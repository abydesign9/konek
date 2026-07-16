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
        background: "var(--background)",
        foreground: "var(--foreground)",
        indigo: "#22315C",
        "konek-green": "#2E9E6B",
        gold: "#E2932F",
        // KONEK design system tokens — admin dashboard chrome (dense,
        // desktop-first) sits on these; the customer app keeps using
        // background/indigo/konek-green/gold directly.
        ivory: "#FAF6F0",
        "text-primary": "#1E2435",
        "text-secondary": "#6C748A",
        "border-soft": "#E4DED5",
        "hover-tint": "#F3EEE7",
        "disabled-bg": "#F1EEE9",
      },
      fontFamily: {
        heading: ["var(--font-sora)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
