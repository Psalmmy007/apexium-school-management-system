/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand — Indigo (authority, trust, EdTech)
        brand: {
          50:  "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5", // primary
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
          950: "#1E1B4B",
        },
        // Sidebar dark shell
        sidebar: {
          DEFAULT:  "#0F172A", // slate-900
          hover:    "#1E293B", // slate-800
          border:   "#1E293B",
          active:   "rgba(99, 102, 241, 0.15)",
          text:     "#94A3B8", // slate-400
          "text-active": "#A5B4FC", // indigo-300
        },
        // Surface
        surface: {
          DEFAULT: "#F8FAFC",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        // Card hierarchy
        "elevation-0": "none",
        "elevation-1": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "elevation-2": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "elevation-3": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        "elevation-4": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        // Inner glow for active elements
        "inner-brand": "inset 0 0 0 2px #4F46E5",
      },
      animation: {
        "fade-in":      "fadeIn 200ms ease-out",
        "slide-up":     "slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in-left":"slideInLeft 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        "pulse-soft":   "pulseSoft 2s ease-in-out infinite",
        "count-up":     "countUp 800ms ease-out forwards",
      },
      keyframes: {
        fadeIn:      { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:     { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideInLeft: { from: { opacity: "0", transform: "translateX(-12px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        pulseSoft:   { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.6" } },
        countUp:     { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      spacing: {
        "sidebar": "240px",
        "sidebar-collapsed": "64px",
        "topbar": "64px",
      },
    },
  },
  plugins: [],
};
