# JSE Conflict Watch — Design System & Visual Specification

This document extracts and formalizes the design system implemented across [`./src`](./src), [`tailwind.config.js`](./tailwind.config.js), and [`src/index.css`](./src/index.css). It serves as the authoritative specification for all UI components, tokens, typography, and interactive behaviors.

---

## 1. Design Philosophy & Ethos

**JSE Conflict Watch** bridges high-frequency financial telemetry with editorial publication craft. The aesthetic blends the density and precision of an institutional financial terminal (Bloomberg/FactSet) with the restrained elegance of an editorial broadsheet (The Financial Times/Monocle).

### Core Tenets
1. **Decision Before Metric:** The interface establishes the macro posture (the Conflict Regime) before presenting individual price points. What matters precedes what measures.
2. **Deterministic Transparency:** No opaque black-box numbers. Every aggregate index (such as the Conflict Impact Score) visibly exposes its mathematical components, weighted drivers, and data confidence.
3. **Purposeful Restraint:** Liquid glass surfaces, spotlight halos, and typography are applied strictly to create visual hierarchy and convey telemetry state—never as arbitrary decorative ornament.
4. **Fail-Visible Resilience:** Partial data, stale caches, and fallback tiers are rendered explicitly close to the affected metric rather than hidden behind generic spinners.

---

## 2. Color System & Theme Tokens

The system is built on dynamic CSS custom properties in [`src/index.css`](./src/index.css) mapped into Tailwind utilities via [`tailwind.config.js`](./tailwind.config.js).

### 2.1 Theme Palettes

| Token | Dark Theme (`:root`) | Light Theme (`html[data-theme="light"]`) | Usage / Intended Surface |
|---|---|---|---|
| `--color-bg` | `#09090b` (Obsidian Charcoal) | `#faf8f5` (Warm Sepia/Cream) | Base page canvas |
| `--color-bg-s` | `rgba(255, 255, 255, 0.025)` | `rgba(250, 248, 245, 0.90)` | Sidebar background tint |
| `--color-bg-c` | `rgba(255, 255, 255, 0.045)` | `rgba(255, 255, 255, 0.85)` | Glass card tile fill |
| `--color-bg-h` | `rgba(255, 255, 255, 0.07)` | `rgba(28, 25, 23, 0.05)` | Pill / chip / hover surface |
| `--color-bg-e` | `rgba(255, 255, 255, 0.035)` | `rgba(28, 25, 23, 0.035)` | Nested sub-surface |
| `--color-bd` | `rgba(255, 255, 255, 0.09)` | `rgba(28, 25, 23, 0.09)` | Standard border / divider |
| `--color-bd-x` | `rgba(255, 255, 255, 0.18)` | `rgba(28, 25, 23, 0.18)` | Elevated / active border |
| `--color-tp` | `#f4f4f5` (Zinc 100) | `#1c1917` (Stone 900) | Primary text / high-contrast titles |
| `--color-ts` | `#a1a1aa` (Zinc 400) | `#57534e` (Stone 600) | Secondary text / labels |
| `--color-tm` | `#8b8b95` (Muted Zinc) | `#625f5b` (Muted Stone) | Muted text / kickers / captions |
| `--color-tx` | `#797983` (Dim Zinc) | `#716d68` (Dim Stone) | Extra-muted / disabled text |
| `--color-paper` | `#f4f4f5` | `#1c1917` | High-contrast CTA pill fill |
| `--color-ink` | `#0a0a0a` | `#faf8f5` | High-contrast CTA text |

### 2.2 Semantic Financial Dialect (Market Signals)

The dialect maps financial states to directional colors, calibrated with dark blocks for badge fills and light borders.

```css
/* Dark Mode RGB Foundations */
--color-bull-rgb: 52, 211, 153;   /* #34d399 - Emerald / Relief / Safe-haven bid */
--color-bear-rgb: 249, 112, 112;   /* #f97070 - Crimson / Shock / Capital flight */
--color-warn-rgb: 232, 176, 74;    /* #e8b04a - Amber / Geopolitical tension / Pivot */
```

| Semantic Role | Dark Hex / Alpha | Light Hex / Alpha | Semantic Meaning in Conflict Context |
|---|---|---|---|
| **Bull** (`text-bull`, `bg-bull`) | `#34d399` (`rgb(52, 211, 153)`) | `#0d9488` (Teal 600) | Gold/PGM haven bid, oil relief, rand rally, equity recovery |
| **Bull Dark Block** (`bg-bull-d`) | `#052e1a` | `#e6f4f1` | Solid badge and alert background |
| **Bear** (`text-bear`, `bg-bear`) | `#f97070` (`rgb(249, 112, 112)`) | `#dc2626` (Red 600) | Brent oil shock, rand weakness, bank/retailer sell-off, yield spike |
| **Bear Dark Block** (`bg-bear-d`) | `#3d1010` | `#fde8e8` | Solid badge and alert background |
| **Warn / Accent** (`text-warn`) | `#e8b04a` (`rgb(232, 176, 74)`) | `#b47a18` (Amber 700) | Elevated risk, defensive pivot trigger, focus outlines, brand highlight |
| **Warn Dark Block** (`bg-warn-d`) | `#3d2a08` | `#fef3c7` | Solid badge and alert background |

### 2.3 Opacity Scale Tokens
Explicit alpha levels configured in [`tailwind.config.js`](./tailwind.config.js):
`5%`, `6%`, `7%`, `8%`, `10%`, `12%`, `15%`, `20%`, `22%`, `25%`, `30%`, `35%`, `38%`, `40%`, `50%`, `60%`, `70%`, `80%`, `90%`.

---

## 3. Typography System

The interface employs a disciplined tripartite font system:

```text
Instrument Serif   ───> Editorial headlines, CIS numerical score, regime badges, brand mark
Inter              ───> Interface controls, body narrative, analysis copy, strategy playbooks
JetBrains Mono     ───> Telemetry tickers, timestamps, percentages, tabular data, formulas
```

### 3.1 Font Family Declarations
* **Serif:** `"Instrument Serif", serif`
* **Sans:** `"Inter", sans-serif`
* **Mono:** `"JetBrains Mono", monospace`

### 3.2 Typographic Hierarchy & Scale

| Style / Element | Font Family | Size | Weight / Leading | Tracking | Class / Implementation |
|---|---|---|---|---|---|
| **Hero CIS Score** | Instrument Serif | `72px` (sm: `92px`) | 400 / `0.9` | `-0.04em` | `font-serif text-[72px] sm:text-[92px]` |
| **Sidebar Score** | Instrument Serif | `44px` | 400 / `1.0` | `-0.03em` | `font-serif text-[44px]` |
| **Page / Section Header** | Instrument Serif | `32px` | 400 / `1.1` | `-0.02em` | `font-serif text-[32px] text-tp` |
| **Card Headline** | Instrument Serif | `22px` | 400 / `1.1` | `-0.015em` | `font-serif text-[22px] text-tp` |
| **Brand Masthead** | Instrument Serif | `22px` | 400 / `1.0` | `-0.015em` | `font-serif text-[22px]` (italic accent) |
| **Magazine Eyebrow** | Instrument Serif | `16px` | Italic / `1.0` | `-0.005em` | `.mag-eyebrow` (`text-warn`) |
| **Kicker / Section Tag** | Inter / Mono | `12px` | 500 / `1.2` | `0.08em` | `font-medium text-[12px] uppercase text-tm` |
| **Body Narrative** | Inter | `13.5px` – `14px` | 400 / `1.5` | `normal` | `text-[13.5px] text-ts leading-relaxed` |
| **Telemetry / Chips** | JetBrains Mono | `10px` – `11px` | 500 / `1.0` | `0.10em` – `0.12em` | `font-mono text-[11px] uppercase text-tm` |
| **Tabular Numbers** | JetBrains Mono / Inter | Dynamic | 500 / `1.0` | Tabular Nums | `.num` (`tnum`, `ss01`) |

### 3.3 Editorial Flourishes
* **`.mag-dropcap::first-letter`**: 52px float-left Instrument Serif italic drop cap in `--color-warn` for editorial briefs.
* **`.mag-rule-double`**: 5px double hairline separator using linear gradients of `--color-bd-x`.
* **`.num`**: Forces `font-feature-settings: "tnum", "ss01"` and `font-variant-numeric: tabular-nums` to ensure zero horizontal jitter during real-time value updates.

---

## 4. Surfaces, Glassmorphism & Elevation

Rather than standard drop-shadow elevations, depth is produced via **Liquid Glass** and **Light Translucency**.

### 4.1 Liquid Glass (`.glass`)
Standard card surface used across all modules:
```css
.glass {
  background: var(--color-bg-c);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid var(--color-bd);
  box-shadow:
    inset 0  1px 0 var(--color-glass-inset, rgba(255,255,255,0.08)),
    inset 0  0   0 1px rgba(255,255,255,0.012),
    0      1px 0   rgba(0,0,0,0.2),
    0     24px 48px -28px var(--color-shadow);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              background-color 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.glass:hover {
  background: var(--color-bg-h);
  border-color: var(--color-bd-x);
  box-shadow:
    inset 0  1px 0 var(--color-glass-inset, rgba(255,255,255,0.12)),
    inset 0  0   0 1px rgba(255,255,255,0.02),
    0 12px 30px -15px rgba(0,0,0,0.28),
    0 24px 48px -28px var(--color-shadow);
}
```

### 4.2 Nested Glass Sub-Surface (`.glass-sub`)
Used for nested inset panels within cards (e.g. driver attribution rows, telemetry wells):
```css
.glass-sub {
  background: var(--color-bg-e);
  border: 1px solid var(--color-bd);
  box-shadow: inset 0 1px 0 var(--color-glass-inset, rgba(255,255,255,0.05));
}
```

### 4.3 Ambient Light Field
A persistent three-point elliptical gradient anchored to the canvas:
```css
--color-bg-ambient:
  radial-gradient(ellipse at 18% 8%, rgba(var(--color-warn-rgb), 0.07) 0%, transparent 50%),
  radial-gradient(ellipse at 92% 22%, rgba(80, 120, 200, 0.05) 0%, transparent 50%),
  radial-gradient(ellipse at 50% 110%, rgba(120, 90, 200, 0.04) 0%, transparent 50%);
```

---

## 5. Layout Architecture & Spatial Grid

The interface operates within an institutional command cockpit shell:

```
┌─────────────────────────┬────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (240px)        │  TOPBAR COMMAND STRIP (h: auto / ~64px)                                │
│                         ├────────────────────────────────────────────────────────────────────────┤
│  • Brand Masthead       │  MAIN CONTENT CANVAS (p-4 sm:p-6 lg:p-[32px_36px])                     │
│  • Conflict Regime Dial │                                                                        │
│  • Primary Nav Links    │  [1] LEAD: Conflict Impact Score & Regime Banner                       │
│  • Cache Status & Clock │  [2] TRANSMISSION: Hero Macro KPI Grid (4 Cards with Sparklines)       │
│  • Theme Switcher       │  [3] ABSORPTION: Two-Column Split (1.5fr Watchlist / 1fr Alerts Feed)  │
│                         │  [4] CONTEXT: Secondary Commodity Strip (Platinum, Palladium, Coal)    │
│                         │  [5] SYNTHESIS: AI Morning Note Editorial Briefing                     │
└─────────────────────────┴────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Responsive Shell Breakpoints
* **Mobile (< 1024px):** Fixed drawer navigation sliding from left (`-translate-x-full` to `translate-x-0`), backdrop blur overlay, accessible hamburger button in `TopBar.jsx`.
* **Desktop ($\ge$ 1024px):** Fixed left sidebar (`w-[240px]`), persistent canvas with `lg:pl-[240px]`.
* **Content Container:** Fluid width with maximum readability constraints (`max-w-7xl` or natural flex containment).

### 5.2 Card Panning & Border Radii
* Outer cards: `rounded-[16px]` or `rounded-[18px]`
* Nested tiles / inner wells: `rounded-[10px]` or `rounded-[12px]`
* Micro chips / telemetry badges: `rounded-[4px]` or `rounded-[6px]`
* Action buttons / inputs: `rounded-lg` (8px)

---

## 6. Core Component Patterns

### 6.1 Lead Feature: Conflict Impact Score & Regime Banner
Located at [`src/widgets/RegimeBanner.jsx`](./src/widgets/RegimeBanner.jsx).
* **Live Pulsing Radar Beacon:**
  ```jsx
  <span className="relative flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: toneHex }} />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: toneHex }} />
  </span>
  ```
* **Bipolar Multi-Zone Scale:** Visual range from `-100` (*Bearish Shock*) to `+100` (*Bullish Relief*) with a zero-center indicator and dynamic marker position (`((total + 100) / 200) * 100`).
* **Regime Color Mapping:**
  * `BEARISH SHOCK` (score $\le -40$): `text-bear`, `bg-bear`, `#f97070`
  * `MILD BEARISH` ($-40 <$ score $\le -15$): `text-warn`, `bg-warn`, `#e8b04a`
  * `NEUTRAL` ($-15 <$ score $\le 15$): `text-ts`, `bg-ts`, `#a39d8d`
  * `MILD BULLISH` ($15 <$ score $\le 40$): `text-bull`, `bg-bull`, `#34d399`
  * `BULLISH RELIEF` (score $> 40$): `text-bull`, `bg-bull`, `#34d399`

### 6.2 Macro KPI Card with Live Sparkline
Located at [`src/widgets/KpiGrid.jsx`](./src/widgets/KpiGrid.jsx).
* **Anatomy:**
  1. Header: Asset name in italic *Instrument Serif* (`mag-kpi-name`), data source badge (`LIVE`, `PROXY`, `STATIC`).
  2. Telemetry Row: Asset alert dot, large formatted price (`CountUp`), percentage delta chip (`+X.XX%`).
  3. SVG Sparkline: Intraday 5m price curve with area gradient fill and terminal point dot (`circle r="2.5"`).
  4. Transmission Read-Through: Dedicated analytical context sentence explaining the exact economic impact for South African markets.

### 6.3 Standard Container Card (`Card.jsx`)
Located at [`src/widgets/Card.jsx`](./src/widgets/Card.jsx).
* Wraps contents automatically in [`SpotlightCard`](./src/widgets/Effects.jsx) for interactive cursor lighting.
* Standardized `CardHeader` with kicker (`text-tm uppercase tracking-[0.08em]`), title in serif, and optional status badge.

### 6.4 Telemetry Status & Badges
* **Live Status:** `bg-bull/8 text-bull border-bull/30`
* **Warning / Elevated:** `bg-warn/8 text-warn border-warn/30`
* **Shock / Pressure:** `bg-bear/8 text-bear border-bear/30`
* **Static / Fallback:** `bg-bg-e text-ts border-bd`

---

## 7. Motion & Interaction Language

All motion is implemented using lightweight CSS transitions and `requestAnimationFrame` hooks—no external animation runtimes.

### 7.1 Keyframe Animations
* **`fadeUp`**: `opacity: 0, translateY(8px) -> opacity: 1, translateY(0)` (280ms cubic ease).
* **`pulse2`**: Smooth opacity breathing (`1.0` to `0.2`) for radar dots.
* **`dataFlash`**: 1.2s ambient yellow flash on cell updates (`rgba(232,176,74,.15)` to `transparent`).
* **`pipeline-flow`**: 1.2s linear infinite dashed stroke dashoffset flow (`6 6`) illustrating transmission pipeline momentum.

### 7.2 Interactive Effects (`Effects.jsx`)
* **`CountUp`**: Critically damped spring simulation (`easeOutQuart: 1 - (1 - t)^4`) for numeric price and score displays.
* **`SpotlightCard`**: Tracks mouse coordinates `(e.clientX, e.clientY)` and updates CSS custom properties `--rb-sx` and `--rb-sy` to cast a radial spotlight over card surfaces.
* **`DecryptedText`**: Terminal-style cipher scramble that resolves character by character upon state changes.
* **`StarBorder`**: Dual rotating radial gradients behind primary action buttons.

---

## 8. Accessibility & Inclusion (WCAG 2.2 AA)

1. **Touch Target Sizing:** All interactive buttons, period selectors, and dropdown triggers enforce `min-height: 44px` (`min-h-11`) and `min-width: 44px`.
2. **Keyboard Bypass:** Includes an accessible skip link (`.skip-link`) hidden off-screen that translates into view on focus (`transform: translateY(0)`).
3. **Focus States:** High-visibility keyboard focus outline across all interactive elements:
   ```css
   :where(button, a, [tabindex]:not([tabindex="-1"])):focus-visible {
     outline: 2px solid var(--color-warn);
     outline-offset: 3px;
   }
   ```
4. **Non-Color Dependence:** Financial metrics and alerts always accompany color with directional arrows (`↑`, `↓`), explicit text labels (`SHOCK ACTIVE`, `HAVEN BID`), and numerical deltas.
5. **Reduced Motion:** Fully respects `prefers-reduced-motion: reduce`, disabling count-ups, cipher scrambles, spotlight shifts, and radar pulses:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```
