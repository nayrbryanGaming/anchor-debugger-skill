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
        bg: "#050508",
        surface: "#0c0c14",
        surface2: "#111120",
        border: "#18182a",
        text: "#e2e2ef",
        muted: "#5c5c7a",
        purple: "#9945FF",
        "purple-dim": "#6b2fb8",
        green: "#14F195",
        "green-dim": "#0ea672",
        gold: "#F5A623",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        display: ["var(--font-display)", "var(--font-inter)", "sans-serif"],
      },
      animation: {
        "float-slow": "float 6s ease-in-out infinite",
        "float-med": "float 4s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "gradient-x": "gradient-x 8s ease infinite",
        "spin-slow": "spin 20s linear infinite",
        "border-trace": "border-trace 3s ease infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "blink": "blink 1s step-end infinite",
        "slide-up": "slide-up 0.6s ease forwards",
        "fade-in": "fade-in 0.8s ease forwards",
        "scale-in": "scale-in 0.4s ease forwards",
        "orb-1": "orb-float-1 12s ease-in-out infinite",
        "orb-2": "orb-float-2 15s ease-in-out infinite",
        "orb-3": "orb-float-3 10s ease-in-out infinite",
        "noise": "noise-scroll 0.3s steps(1) infinite",
        "grid-pulse": "grid-pulse 4s ease-in-out infinite",
        "char-reveal": "char-reveal 0.05s ease forwards",
        "scan-line": "scan-line 4s linear infinite",
        "ping-slow": "ping 3s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "border-trace": {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "200% 0%" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "slide-up": {
          "0%": { transform: "translateY(30px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "orb-float-1": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(40px, -30px) scale(1.05)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.97)" },
        },
        "orb-float-2": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "40%": { transform: "translate(-50px, 40px) scale(1.08)" },
          "70%": { transform: "translate(30px, -20px) scale(0.95)" },
        },
        "orb-float-3": {
          "0%, 100%": { transform: "translate(0px, 0px)" },
          "50%": { transform: "translate(20px, -40px)" },
        },
        "noise-scroll": {
          "0%": { backgroundPosition: "0 0" },
          "25%": { backgroundPosition: "50% 50%" },
          "50%": { backgroundPosition: "100% 100%" },
          "75%": { backgroundPosition: "25% 75%" },
          "100%": { backgroundPosition: "0 0" },
        },
        "grid-pulse": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.6" },
        },
        "char-reveal": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(153,69,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(153,69,255,0.06) 1px, transparent 1px)",
        "noise-texture": "url('/noise.svg')",
      },
      backgroundSize: {
        "grid-sm": "32px 32px",
        "grid-md": "48px 48px",
      },
      boxShadow: {
        "glow-purple": "0 0 40px rgba(153,69,255,0.25)",
        "glow-green": "0 0 40px rgba(20,241,149,0.2)",
        "glow-sm": "0 0 20px rgba(153,69,255,0.15)",
        "depth-1": "0 4px 20px rgba(0,0,0,0.6)",
        "depth-2": "0 8px 40px rgba(0,0,0,0.8)",
        "inner-glow": "inset 0 0 30px rgba(153,69,255,0.05)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
