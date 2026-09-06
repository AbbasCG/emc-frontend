# EMC Design System Spec — for Claude Design (V3.1)
Paste-ready constraints. These are RULES, not suggestions.

## Identity
- Brand: EMC — Educational Mastar Central · Taglines: "نُرشد العقول، ونبني المستقبل." / "Guiding Minds, Building Futures."
- Arabic-first, RTL. English (LinkedIn) uses mirrored LTR grid.
- Tone: confident, warm, precise, ambitious — never hype, never "relaunch" narrative.

## Color (exact hex only)
- Sea: navy #0C2A4B (primary dark) · deep #06182C · sky #089FE0 · blueDark #0077B6 · ice #A6D6F2
- Fire: orange #F28C00 · amber #FFA733 · ember #C97208
- Neutral: paper #FBFAF7 · ink #27384B · gray #5E6C7D · hairline #E7E3DA
- Ratio 60% neutral / 30% sea / 10% fire.
- HARD RULE: never blend sea↔fire in one gradient. Fire gradients stay inside fire family.
- Text on light: navy/ink (body), #0077B6 secondary, ember headings ≥18px only. Sky & orange are NEVER text on light.
- Text on navy: white, ice, amber; sky for medium+ sizes only.

## Typography — Thmanyah family EXCLUSIVELY (OTF files included in 03_fonts/)
- Headings/covers/quotes: "Thmanyah Serif Display" (Black 900 titles, Bold 700 subheads)
- Body/UI/labels/ALL numerals: "Thmanyah Sans" (Regular 400, Medium 500, Bold 700, Black 900 for hero numbers)
- Long-form editorial body: "Thmanyah Serif Text" (Regular/Medium)
- Numerals: Latin 0-9 always, isolated LTR inside Arabic. RTL flow arrows point LEFT (←).
- Always load the OTF/webfont files; never substitute fonts.

## Signature elements
- Double arc under titles: path "M2 8 Q54 -3 106 8", stroke 3, orange #F28C00 over sky underlayer @ .45
- Tricolor top bar: orange 0–22% / sky 22–58% / light 58–100% (white .22 on dark), height 3-4px
- Ghost numbers: Sans Black, rgba(12,42,75,.05)
- Dawn gradient (dark covers): 152deg #06182C → #0C2A4B 50% → #10456E + bottom orange ellipse rgba(242,140,0,.46) + top-left sky glow + subtle noise layer (mandatory)
- Concentric dawn rings from ONE corner: sky .26/.18, amber .5–.6, sky .10–.13
- Monogram pattern (04_patterns/): logo "flying pages" motif only, -8° tilt, sparse. light=navy .05 on paper, dark=white .05 on navy, gold=amber .085 on dawn (luxury)
- Corner mark: pages motif bottom-LEFT of light pages, navy .055, ~330px
- Footer dots: ● #F28C00 ● #089FE0 ● #0C2A4B
- Max 2 signature elements per scene (bar+footer excluded)

## Modes
- LIGHT: paper/white bg · navy Display headings · ink body · color logo · light pattern behind quiet zones only
- DARK (premium): dawn or solid navy · white Display headings · ice body · amber accents/numbers · white logo · gold monogram

## Components
- Buttons: primary navy/white text · emphasis orange/white text · tertiary ember text + "←", no border
- NO drop shadows · NO bordered boxes · NO emoji (line SVG icons only, stroke 1.9–2, viewBox 24, no holder circles)
- Cards: flat fill (white or navy), radius 3-4px, hairline separators #E7E3DA on light

## Logo (files in 02_logos/, vector master = EMC_Logo_Master_Vector.pdf)
- 3 lockups: icon / horizontal (primary) / tagline lockup · color on light, white on dark, navy monochrome for one-color print
- Clear space = height of "E" all sides · min 130px full / 44px icon · never recolor, stretch, rotate, shadow, or redesign

## Never
Cross-family gradients · shadows · bordered boxes · emoji · Arabic-Indic numerals for stats · fonts other than Thmanyah · publishing unconfirmed numbers/links · "relaunch/reborn" copy
