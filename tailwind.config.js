/**
 * EMC — Educational Mastar Central · Design tokens (Tailwind extension) · Brand V2.2 (June 2026).
 *
 * Two families: "Sea of Knowledge" (blue) + "Fire of Passion" (orange). Brand law:
 *   • The orange family is NEVER gradiented with the sea family — orange stays solid.
 *   • Sky (#089FE0) and orange (#F28C00) are NOT used for small text on light;
 *     use navy (#0C2A4B) / blue (#0077B6) / ember (#C97208) instead.
 *
 * Legacy aliases (customBlue / customOrange / deepBlue / emcBg) are remapped to V2.2 values
 * so the whole app re-skins through tokens. Governing reference: docs/04-references/brand/.
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Neutral ── */
        paper:  "#FBFAF7",
        paper2: "#F3F1EA",
        foreground: "#27384B", // body text
        line:   "#E7E3DA",

        /* ── Legacy aliases → V2.2 (kept; consumed across components) ── */
        customBlue:   "#0077B6", // sea · blue (primary, AA on light)
        customOrange: "#F28C00", // fire · orange (solid only — not text on light)
        deepBlue:     "#0C2A4B", // sea · navy (dark surfaces / headings on light)
        emcBg:        "#FBFAF7", // paper

        /* ── Sea of Knowledge — primary scale. 500 = #0077B6 ── */
        /* `primary` aliases `brand`: the 2026-08 team drop (institute pages) styles with
           primary-*; without the alias those classes generate no CSS at all. */
        primary: {
          50:  "#EAF6FD",
          100: "#CFE9FA",
          200: "#A6D6F2",
          300: "#6EC1EC",
          400: "#089FE0",
          500: "#0077B6",
          600: "#0E5A8A",
          700: "#0C3E63",
          800: "#0C2A4B",
          900: "#06182C",
          950: "#06182C",
        },
        brand: {
          50:  "#EAF6FD",
          100: "#CFE9FA",
          200: "#A6D6F2", // ice
          300: "#6EC1EC",
          400: "#089FE0", // sky
          500: "#0077B6", // blue (primary)
          600: "#0E5A8A", // ocean
          700: "#0C3E63",
          800: "#0C2A4B", // navy
          900: "#06182C", // night
          950: "#06182C",
        },
        /* Scale (V3 sea family) + DEFAULT: bare `text-sky` keeps meaning #089FE0, and the
           numbered sky-50…900 classes used across dashboards stop silently generating no CSS
           (a single-string key shades the whole default scale). Same treatment for amber. */
        sky: {
          DEFAULT: "#089FE0",
          50:  "#EAF6FD",
          100: "#CFE9FA",
          200: "#A6D6F2",
          300: "#6EC1EC",
          400: "#089FE0",
          500: "#0077B6",
          600: "#0E5A8A",
          700: "#0C3E63",
          800: "#0C2A4B",
          900: "#06182C",
        },
        ocean: "#0E5A8A",
        navy:  "#0C2A4B",
        night: "#06182C",
        ice:   "#A6D6F2",

        /* ── Fire of Passion — accent scale. 500 = #F28C00 ── */
        accent: {
          50:  "#FEF7EE",
          100: "#FCE9D2", // sand
          200: "#FBD9AE",
          300: "#FFA733", // amber
          400: "#F89A1A",
          500: "#F28C00", // orange (primary)
          600: "#DD7C02",
          700: "#C97208", // ember (AA headlines on light)
          800: "#A85E06",
          900: "#874B07",
        },
        amber: {
          DEFAULT: "#FFA733",
          50:  "#FEF7EE",
          100: "#FCE9D2",
          200: "#FBD9AE",
          300: "#FFA733",
          400: "#F89A1A",
          500: "#F28C00",
          600: "#DD7C02",
          700: "#C97208",
          800: "#A85E06",
          900: "#874B07",
        },
        ember: "#C97208",
        sand:  "#FCE9D2",

        /* ── V3 functional colors ── */
        success: "#1B7F4B",
        warning: "#FFA733",
        danger:  "#B3401E",

        /* ── Institutional ink (dark neutral / body). 500 = #27384B ── */
        ink: {
          50:  "#EEF1F5",
          100: "#D8DEE7",
          200: "#B5C0CE",
          300: "#8493A6",
          400: "#51647C",
          500: "#27384B", // body
          600: "#1C2A3B",
          700: "#142133",
          800: "#0C2A4B", // navy
          900: "#06182C", // night
        },

        /* ── Neutral utility, anchored on #5E6C7D ── */
        muted: {
          50: "#F7F8F9", 100: "#EEF0F2", 200: "#D8DCDF", 300: "#B6BCC1", 400: "#909598",
          500: "#5E6C7D", 600: "#4A5667", 700: "#3A4453", 800: "#2A323D", 900: "#1B2027",
        },
      },

      fontFamily: {
        /* V3: Thmanyah exclusive — Sans for body/UI/ALL numerals; IBM Plex = sanctioned fallback.
           "Thmanyah"/"ThmanyahDisplay" are the team-committed woff2 families (same typefaces),
           chained so production renders Thmanyah even without the local gitignored OTF set. */
        sans: ['"Thmanyah Sans"', '"Thmanyah"', '"IBM Plex Sans Arabic"', "ui-sans-serif", "system-ui", "sans-serif"],
        /* V3: headings/covers — Thmanyah Serif Display. */
        display: ['"Thmanyah Serif Display"', '"ThmanyahDisplay"', '"Thmanyah Sans"', '"Thmanyah"', '"IBM Plex Sans Arabic"', "ui-sans-serif", "system-ui", "sans-serif"],
        /* V3: long-form booklet body. */
        serif: ['"Thmanyah Serif Text"', '"Thmanyah Serif Display"', '"ThmanyahDisplay"', "serif"],
        /* Latin/numeric contexts — Sans carries numerals per V3; IBM Plex fallback. */
        latin: ['"Thmanyah Sans"', '"Thmanyah"', '"IBM Plex Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },

      borderRadius: { "4xl": "2rem", "5xl": "2.5rem" },

      /* Calibrated elevation (navy-tinted, brand glows in sea/fire). */
      boxShadow: {
        "emc-xs":  "0 1px 2px rgba(6,24,44,0.06)",
        "emc-sm":  "0 2px 6px -1px rgba(6,24,44,0.08)",
        "emc":     "0 14px 40px -22px rgba(6,24,44,0.18), 0 1px 2px rgba(6,24,44,0.04)",
        "emc-md":  "0 22px 50px -24px rgba(6,24,44,0.22), 0 2px 6px -1px rgba(6,24,44,0.05)",
        "emc-lg":  "0 28px 70px -28px rgba(6,24,44,0.28), 0 4px 12px -3px rgba(6,24,44,0.06)",
        "emc-xl":  "0 40px 90px -32px rgba(6,24,44,0.32), 0 6px 16px -4px rgba(6,24,44,0.07)",
        "emc-glow": "0 0 0 1px rgba(0,119,182,0.18), 0 16px 48px -16px rgba(0,119,182,0.35)",
        "emc-glow-accent": "0 0 0 1px rgba(242,140,0,0.22), 0 16px 44px -14px rgba(242,140,0,0.38)",
        "emc-inset": "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(6,24,44,0.04)",
        "emc-ring": "0 0 0 1px rgba(12,42,75,0.06), 0 0 0 4px rgba(0,119,182,0.10)",
        "kpi":     "0 16px 44px -24px rgba(6,24,44,0.18), inset 0 1px 0 rgba(255,255,255,0.65)",
        /* Team keys (2026-08 drop), recolored from off-brand purple to V3 navy. */
        "soft":    "0 1px 2px rgba(6,24,44,.04), 0 12px 32px -12px rgba(12,42,75,.18)",
        "lift":    "0 2px 4px rgba(6,24,44,.05), 0 24px 48px -20px rgba(12,42,75,.32)",
      },

      backgroundImage: {
        /* Sea-only textures */
        "emc-grid":
          "linear-gradient(rgba(12,42,75,0.06) 1px, transparent 1px), linear-gradient(to right, rgba(12,42,75,0.06) 1px, transparent 1px)",
        "emc-dots":
          "radial-gradient(rgba(12,42,75,0.10) 1px, transparent 1px)",
        "emc-radial":
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(8,159,224,0.18), transparent 60%)",
        /* Dawn signature — LAYERED radials (depth base + sky glow + orange horizon), not a blend. */
        "emc-hero":
          "radial-gradient(ellipse 60% 60% at 80% 0%, rgba(8,159,224,0.16), transparent 60%), radial-gradient(ellipse 130% 72% at 50% 122%, rgba(242,140,0,0.18), transparent 62%)",
        "emc-shimmer":
          "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
        /* Depth — dividers & hero fields (sea family only). */
        "brand-gradient":
          "linear-gradient(135deg, #06182C 0%, #0C2A4B 55%, #0E5A8A 100%)",
        "depth-gradient":
          "linear-gradient(135deg, #06182C 0%, #0C2A4B 55%, #0E5A8A 100%)",
        /* Fire — solid family only (never blended with sea). */
        "accent-gradient":
          "linear-gradient(135deg, #FFA733 0%, #F28C00 55%, #C97208 100%)",
        "ink-gradient":
          "linear-gradient(135deg, #0C2A4B 0%, #0E5A8A 60%, #06182C 100%)",
        /* Daylight — charts/bars/indicators on light (sea only). */
        "daylight-gradient":
          "linear-gradient(to left, #089FE0 0%, #A6D6F2 100%)",
      },

      backgroundSize: {
        "grid-24": "24px 24px",
        "grid-32": "32px 32px",
        "dots-16": "16px 16px",
        "dots-22": "22px 22px",
      },

      /* Brand motion easing — calm ease-out, no bounce/elastic. */
      transitionTimingFunction: {
        "emc": "cubic-bezier(0.2, 0.8, 0.2, 1)",
        "emc-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "emc-spring": "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },

      transitionDuration: { 250: "250ms", 350: "350ms", 450: "450ms" },

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
        "dawn-breath": {
          "0%,100%": { opacity: "0.85" },
          "50%":     { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.45s cubic-bezier(0.2,0.8,0.2,1) both",
        "shimmer":    "shimmer 2.4s linear infinite",
        "slow-pulse": "slow-pulse 3.4s ease-in-out infinite",
        "soft-float": "soft-float 5.5s ease-in-out infinite",
        "dawn-breath": "dawn-breath 8s ease-in-out infinite",
      },

      /* Global stacking scale — keep in sync with :root tokens in index.css */
      zIndex: {
        content: "0",
        sidebar: "40",
        header: "50",
        popover: "100",
        "modal-overlay": "200",
        "modal-content": "210",
        /** Modals that must float above a z-modal-content drawer (e.g. AddStudentModal over CourseManagementDrawer) */
        "nested-modal": "250",
        toast: "300",
      },
    },
  },
  plugins: [],
}
