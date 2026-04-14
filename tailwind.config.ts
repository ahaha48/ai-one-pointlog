import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(30px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        slideUp: "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        fadeIn: "fadeIn 0.5s ease",
      },
    },
  },
  plugins: [],
};

export default config;
