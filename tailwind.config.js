/**
 * EMC design tokens (Tailwind extension).
 *
 * Backward-compatible: all legacy aliases (customBlue/customOrange/deepBlue/emcBg)
 * are kept. New tokens add a calibrated brand scale, premium shadow/radius/motion
 * primitives, premium gradients, and an Inter font alias for Latin numerals.
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /** Body text — marketing pages */
        foreground: "#0F172A",
        customBlue: "#2691C2",
        customOrange: "#EC943C",
        deepBlue: "#22334A",
        emcBg: "#F8FBFE",

        /** EMC brand scale (primary). 500 = #2691C2 */
        brand: {
          50: "#EEF7FC",
          100: "#D7EDF7",
          200: "#B1DCEE",
          300: "#7CC4E2",
          400: "#4AA9D2",
          500: "#2691C2", // primary
          600: "#1E7AA8",
          700: "#1B6489",
          800: "#1A5470",
          900: "#1A455D",
          950: "#0F2D3E",
        },
        /** Secondary accent. 500 = #EC943C */
        accent: {
          50: "#FEF6EC",
          100: "#FCE6CB",
          200: "#F9CF96",
          300: "#F5B561",
          400: "#F0A04A",
          500: "#EC943C", // secondary
          600: "#D67C28",
          700: "#B16221",
          800: "#8C4E1F",
          900: "#73411E",
          950: "#3F2210",
        },
        /** Institutional dark ink. 500 = #22334A */
        ink: {
          50: "#F4F6F9",
          100: "#E6EBF1",
          200: "#C7D1DE",
          300: "#9CADC1",
          400: "#6B7F98",
          500: "#22334A", // dark
          600: "#1C2B3E",
          700: "#162232",
          800: "#111A26",
          900: "#0B121C",
        },
        /** Neutral utility, anchored on #737778 */
        muted: {
          50: "#F7F8F9",
          100: "#EEF0F2",
          200: "#D8DCDF",
          300: "#B6BCC1",
          400: "#909598",
          500: "#737778", // neutral
          600: "#5A5D5F",
          700: "#454749",
          800: "#2F3032",
          900: "#1B1C1D",
        },
      },

      fontFamily: {
        /** Project default stays Tajawal — Arabic first. */
        sans: ['"Tajawal"', "ui-sans-serif", "system-ui", "sans-serif"],
        /** Opt-in Latin/Inter family for numerals, kbd, code, English/Dutch text. */
        latin: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Tajawal"', '"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },

      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },

      /** Premium calibrated elevation system. */
      boxShadow: {
        "emc-xs":  "0 1px 2px rgba(15,42,67,0.06)",
        "emc-sm":  "0 2px 6px -1px rgba(15,42,67,0.08)",
        "emc":     "0 14px 40px -22px rgba(15,42,67,0.18), 0 1px 2px rgba(15,42,67,0.04)",
        "emc-md":  "0 22px 50px -24px rgba(15,42,67,0.22), 0 2px 6px -1px rgba(15,42,67,0.05)",
        "emc-lg":  "0 28px 70px -28px rgba(15,42,67,0.28), 0 4px 12px -3px rgba(15,42,67,0.06)",
        "emc-xl":  "0 40px 90px -32px rgba(15,42,67,0.32), 0 6px 16px -4px rgba(15,42,67,0.07)",
        "emc-glow": "0 0 0 1px rgba(38,145,194,0.18), 0 16px 48px -16px rgba(38,145,194,0.35)",
        "emc-glow-accent": "0 0 0 1px rgba(236,148,60,0.22), 0 16px 44px -14px rgba(236,148,60,0.38)",
        "emc-inset": "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(15,42,67,0.04)",
        "emc-ring": "0 0 0 1px rgba(34,51,74,0.06), 0 0 0 4px rgba(38,145,194,0.10)",
        "kpi":     "0 16px 44px -24px rgba(15,42,67,0.18), inset 0 1px 0 rgba(255,255,255,0.65)",
      },

      backgroundImage: {
        "emc-grid":
          "linear-gradient(rgba(34,51,74,0.06) 1px, transparent 1px), linear-gradient(to right, rgba(34,51,74,0.06) 1px, transparent 1px)",
        "emc-dots":
          "radial-gradient(rgba(34,51,74,0.10) 1px, transparent 1px)",
        "emc-radial":
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(38,145,194,0.18), transparent 60%)",
        "emc-hero":
          "radial-gradient(ellipse 60% 60% at 80% 0%, rgba(38,145,194,0.10), transparent 60%), radial-gradient(ellipse 50% 50% at 0% 90%, rgba(236,148,60,0.10), transparent 60%)",
        "emc-shimmer":
          "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
        "brand-gradient":
          "linear-gradient(135deg, #2691C2 0%, #1B6489 60%, #22334A 100%)",
        "accent-gradient":
          "linear-gradient(135deg, #F0A04A 0%, #EC943C 55%, #D67C28 100%)",
        "ink-gradient":
          "linear-gradient(135deg, #22334A 0%, #1A455D 60%, #0F2D3E 100%)",
      },

      backgroundSize: {
        "grid-24": "24px 24px",
        "grid-32": "32px 32px",
        "dots-16": "16px 16px",
        "dots-22": "22px 22px",
      },

      transitionTimingFunction: {
        "emc": "cubic-bezier(0.22, 0.61, 0.36, 1)",
        "emc-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "emc-out": "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      transitionDuration: {
        250: "250ms",
        350: "350ms",
        450: "450ms",
      },

      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "slow-pulse": {
          "0%,100%": { opacity: "0.85" },
          "50%": { opacity: "1" },
        },
        "soft-float": {
          "0%,100%": { transform: "translateY(0)" },
          "50%":     { transform: "translateY(-4px)" },
        },
        "glow-pulse": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(38,145,194,0.35)" },
          "50%":     { boxShadow: "0 0 0 10px rgba(38,145,194,0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.45s cubic-bezier(0.22,0.61,0.36,1) both",
        "shimmer":    "shimmer 2.4s linear infinite",
        "slow-pulse": "slow-pulse 3.4s ease-in-out infinite",
        "soft-float": "soft-float 5.5s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.2s ease-out infinite",
      },

      /** Global stacking scale — keep in sync with :root tokens in index.css */
      zIndex: {
        content: "0",
        sidebar: "40",
        header: "50",
        popover: "100",
        "modal-overlay": "200",
        "modal-content": "210",
        toast: "300",
      },
    },
  },
  plugins: [],
}
