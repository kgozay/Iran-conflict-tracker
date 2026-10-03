# Product Specification & Design System

## Register

product

## Users & Target Audience

The primary users are the portfolio owner and a small group of investment professionals and market analysts monitoring South African assets under geopolitical stress. They require instant situational awareness during breaking geopolitical events without navigating cumbersome terminal interfaces or decoding unnecessary visual fluff.

## Product Purpose & Core Value Proposition

**JSE Conflict Watch v2.2** is a specialized real-time financial intelligence dashboard monitoring how Iran and wider Middle East conflict risk transmits into South African markets (the Johannesburg Stock Exchange and South African Rand).

Its primary job is to establish the current conflict regime immediately, quantify cross-asset transmission channels (oil shock, rand depreciation, safe-haven flows, global yields), evaluate data provenance and freshness, and deliver actionable defensive/relief playbooks at a glance.

## Product Goals

1. **Immediate Regime Clarity**: Communicate the prevailing risk environment (`BEARISH SHOCK`, `MILD BEARISH`, `NEUTRAL`, `MILD BULLISH`, `BULLISH RELIEF`) in under 2 seconds upon landing.
2. **Deterministic Attribution**: Deconstruct the Conflict Impact Score (CIS) into distinct, mathematically defensible drivers (Macro 40%, JSE Sector Breadth 35%, Confirmation Signals 25%) separating negative shock pressures from positive resource offsets.
3. **Resilient, Zero-Key Architecture**: Function continuously without paid API keys via serverless Yahoo Finance proxies and US Treasury fallbacks, falling back gracefully to local storage caching when disconnected.
4. **Editorial Visual Distinction**: Deliver a bespoke financial publication aesthetic (combining Instrument Serif with JetBrains Mono and Inter) that rejects generic dashboard tropes and "vibecoded" AI interfaces.
5. **Rigorous Trust & Data Provenance**: Make quote coverage, caching status, fallback tiers, and market hours visible directly alongside the numbers.

## Critical Files & Architecture

| File Path | Role & Architectural Purpose |
|---|---|
| [`src/App.jsx`](./src/App.jsx) | Application root coordinator; manages active page routing, mobile drawer state, theme toggling, and data synchronization. |
| [`src/hooks/useMarketData.js`](./src/hooks/useMarketData.js) | Central data engine; orchestrates multi-tier caching (`jse_cw_v7_cache`), parallel fetching across serverless routes, and coverage calculation. |
| [`src/utils/scoring.js`](./src/utils/scoring.js) | Mathematical definition of the Conflict Impact Score (CIS), macro weights, sector baskets, and 11 confirmation signal triggers. |
| [`src/utils/alerts.js`](./src/utils/alerts.js) | Automated market alert generation and threshold severity dots for macro KPIs. |
| [`src/data/stocks.js`](./src/data/stocks.js) | Static definitions of the 7 macro commodities/yields, the Satrix 40 Top 40 benchmark, and 41 JSE equities across 11 sectors with sensitivity tags. |
| [`src/data/conflictEvents.js`](./src/data/conflictEvents.js) | Chronological database of Middle East conflict escalations mapped onto historical regime charts. |
| [`src/widgets/RegimeBanner.jsx`](./src/widgets/RegimeBanner.jsx) | **The Lead Dominant Feature**: Multi-zone bipolar regime gauge, regime chips, driver attribution, and strategy playbook. |
| [`src/widgets/KpiGrid.jsx`](./src/widgets/KpiGrid.jsx) | Primary macro KPI cards (Brent, USD/ZAR, Gold, US 10Y) with live intraday sparklines and read-through analysis. |
| [`src/pages/MacroTransmission.jsx`](./src/pages/MacroTransmission.jsx) | 3-stage transmission pipeline mapping macro shocks through specific channels to JSE sector winners/losers, plus interactive Brent slider. |
| [`src/pages/SectorDrilldown.jsx`](./src/pages/SectorDrilldown.jsx) | Granular sector breakdown displaying weighted contributions, constituent stocks, P/E multiples, and relative market performance. |
| [`api/quotes.js`](./api/quotes.js) | Vercel serverless proxy fetching live quotes with Yahoo Finance cookie/crumb and chart fallback. |
| [`api/treasury.js`](./api/treasury.js) | Official US Treasury daily par-yield fallback for the US 10-Year yield proxy (`^TNX`). |
| [`api/morning-note.js`](./api/morning-note.js) | Gemini 2.5 Flash serverless integration synthesizing overnight conflict news and market pricing into an executive briefing. |
| [`src/index.css`](./src/index.css) & [`tailwind.config.js`](./tailwind.config.js) | Design tokens, liquid glass utilities, typography pairings, and dual-theme variable mappings. |

## Native Product Shape: Transmission Pipeline & Regime Gauge

The application's architecture is structured around the **Cross-Asset Transmission Pipeline**:
```
[ Macro Shocks ] ──> [ 4 Transmission Channels ] ──> [ JSE Sector Sensitivity ] ──> [ Conflict Impact Score ] ──> [ Actionable Playbook ]
• Brent Crude          • Inflation / Fuel Pass-through   • Banks & Retailers (Headwind)    • Macro: 40% (Capped)           • Defensive / Pivot /
• USD/ZAR              • EM FX Carry & Capital Flight   • Gold & PGM Miners (Tailwind)    • JSE Basket: 35%                 Standard / Relief
• Gold & PGMs          • Safe-Haven Asset Allocation    • Sasol & Energy (Oil Tailwind)   • Confirmation Tests: 25%
• US 10Y Yield         • Global Discount Rate Shock     • Rand-Hedge Luxury/Tech (Buffer) • Scale: -100 to +100
```
This native pipeline dictates the layout of the interface:
1. **Decision Layer (Lead Feature)**: CIS Headline, Regime Label, and Bipolar Scale establish the overall macro posture first.
2. **Transmission Layer**: Primary Macro KPIs (Brent, USD/ZAR, Gold, US 10Y) show the incoming pressure waves.
3. **Absorption Layer**: Sector Breadth, Watchlist performance, and Alert triggers show where the shock lands on South African equities.
4. **Synthesis Layer**: AI Morning Note synthesizes the quantitative state into an editorial narrative.

## What the Product Leads With (Dominant Lead Feature)

The application leads uncompromisingly with the **Conflict Impact Score (CIS) & Regime Banner** (`src/widgets/RegimeBanner.jsx`).
- **Weight**: Occupies the top hero position on the Overview page; its score, regime color, and directional beacon dictate the visual tone of the entire interface.
- **Components**:
  - Live pulsing radar beacon (`animate-ping`) colored by regime.
  - Large-scale numerical score rendered in *Instrument Serif* (`text-[72px]` to `text-[92px]`).
  - Active regime classification banner with italic serif label.
  - Multi-zone bipolar visual scale (-100 Bearish Shock to +100 Bullish Relief).
  - Telemetry bar displaying quote coverage percentage, confidence tier (`High`, `Moderate`, `Low`), and 5-reading trend delta.
  - Driver breakdown separating positive offsets (e.g. Gold miners haven bid) from negative pressures (e.g. Brent surge, Rand depreciation).
  - Interactive progressive disclosure drawer with active strategic playbook and historical conflict chart.

## Real Terminology, Labels & Schemas (From Codebase)

### Regime Classifications & Thresholds (`src/utils/scoring.js`)
- `BEARISH SHOCK` (Total ≤ -40) → `bear` (Red)
- `MILD BEARISH` (-40 < Total ≤ -15) → `warn` (Amber)
- `NEUTRAL` (-15 < Total ≤ +15) → `neutral` (Muted Grey)
- `MILD BULLISH` (+15 < Total ≤ +40) → `bull` (Emerald Green)
- `BULLISH RELIEF` (Total > +40) → `bull` (Emerald Green)

### Telemetry & Operational Labels
- **System States**: `LIVE TELEMETRY`, `CACHED DATA`, `CONNECTING...`, `STALE DATA`, `OFFLINE`
- **Market Hours (SAST)**: `JSE OPEN (09:00 - 17:00 SAST)`, `JSE CLOSED`, `WEEKEND`, `AFTER HOURS`
- **Data Confidence**: `High (≥90% quote coverage)`, `Moderate (70-89%)`, `Low (<70%)`
- **Transmission Status Badges** (`src/pages/MacroTransmission.jsx`):
  - Brent: `SHOCK ACTIVE` (≥ +2.5%), `ELEVATED` (≥ +1.0%), `COOLING` (≤ -1.0%), `STABLE`
  - USD/ZAR: `SHOCK ACTIVE` (≥ +1.2%), `PRESSURE` (≥ +0.6%), `ZAR RALLY` (≤ -0.6%), `STABLE`
  - Gold / PGMs: `HAVEN BID` (≥ +1.2%), `FIRM` (≥ +0.5%), `SOFT` (≤ -0.6%), `STABLE`
  - US 10Y: `YIELD SPIKE` (≥ +3.0%), `ELEVATED` (≥ +1.2%), `EASING` (≤ -1.5%), `STABLE`

### Confirmation Signal Tests (`src/utils/scoring.js`)
- Bearish: `Brent shock (>+2%)`, `Rand weakness (>+0.8%)`, `Banks sell-off (<-1%)`, `Retailers sell-off (<-1%)`, `Market drawdown (<-0.5%)`, `US yield pressure (>+2%)`
- Bullish: `Gold bid (>+1%)`, `Miners bid (>+1%)`, `Oil relief (<-2%)`, `Rand strength (<-0.5%)`, `US yield relief (<-2%)`

### Monitored Asset Universe (`src/data/stocks.js`)
- **Macro Commodities & Proxies**:
  - `BZ=F` — Brent Crude (`$/bbl`)
  - `GC=F` — Gold (`$/oz`)
  - `PL=F` — Platinum (`$/oz`)
  - `PA=F` — Palladium (`$/oz`)
  - `USDZAR=X` — USD/ZAR (`ZAR`)
  - `MTF=F` — Coal Futures (`$/t`)
  - `^TNX` — US 10-Year Bond Yield (`%`)
  - `STX40.JO` — Satrix 40 ETF, the JSE Top 40 benchmark used as the CIS market input
- **JSE Sectors & Key Tickers**:
  - **Gold Miners** (`Haven Beta`): GFI, ANG, DRD, HAR, PAN
  - **PGMs** (`PGM Beta`): IMP, VAL (Valterra, formerly Amplats/AMS), NPH, SSW
  - **Energy** (`Oil Tailwind`, `Coal Export`): SOL, EXX, TGA
  - **Banks** (`Domestic / Rates`): FSR, SBK, CPI, ABG, NED
  - **Retailers** (`Domestic Cyclical / Defensive`): SHP, WHL, PPH, TFG, TRU, MRP, CLS, DCP
  - **Consumer Staples** (`Input Costs`, `Rand Hedge / Dividend`): TBS, AVI, BTI
  - **Insurers** (`Domestic / Rates`): SLM, DSY
  - **Property** (`Rates / Yield`): GRT, RDF
  - **Industrials** (`Rand Hedge / Global Luxury / Industrial`): NPN, PRX, CFR, BVT, RLO (Barloworld delisted Jan 2026)
  - **Mining** (`Global Commodity`): AGL, BHG
  - **Telecoms** (`EM FX Exposure`, `Defensive Yield`): MTN, VOD

## Visual Identity & Design System Tokens

### Typography Hierarchy
- **Display / Editorial Numerals**: `"Instrument Serif", serif` — Used for the CIS hero score, regime name, brand title (`Conflict Watch`), and major section callouts.
- **UI / Body Prose**: `"Inter", sans-serif` — Used for body copy, playbook recommendations, explanations, and navigation labels.
- **Telemetry / Financial Data**: `"JetBrains Mono", monospace` — Used for percentage changes, tickers, timestamps, market cap, P/E multiples, and status chips.

### Color Palette Tokens (`src/index.css` & `tailwind.config.js`)

#### Dark Theme (`:root`) — Default
- **Background**: `--color-bg: #09090b` (deep obsidian charcoal)
- **Surfaces**:
  - `--color-bg-s: rgba(255, 255, 255, 0.025)` (sidebar tint)
  - `--color-bg-c: rgba(255, 255, 255, 0.045)` (glass tile background)
  - `--color-bg-h: rgba(255, 255, 255, 0.07)` (pill / chip fill)
  - `--color-bg-e: rgba(255, 255, 255, 0.035)` (sub-surface layer)
- **Borders**:
  - `--color-bd: rgba(255, 255, 255, 0.09)` (subtle card border)
  - `--color-bd-x: rgba(255, 255, 255, 0.18)` (accentuated border)
- **Text Levels**:
  - Primary: `--color-tp: #f4f4f5`
  - Secondary: `--color-ts: #a1a1aa`
  - Muted: `--color-tm: #8b8b95`
  - Extra-muted: `--color-tx: #797983`
- **Semantic Accents**:
  - **Bull / Relief**: `--color-bull: #34d399` (`rgb(52, 211, 153)`), Dark block: `#052e1a`
  - **Bear / Shock**: `--color-bear: #f97070` (`rgb(249, 112, 112)`), Dark block: `#3d1010`
  - **Warn / Amber**: `--color-warn: #e8b04a` (`rgb(232, 176, 74)`), Dark block: `#3d2a08`

#### Light Theme (`html[data-theme="light"]`)
- **Background**: `--color-bg: #faf8f5` (warm cream/sepia)
- **Surfaces**: `--color-bg-c: rgba(255, 255, 255, 0.85)`, `--color-bg-s: rgba(250, 248, 245, 0.90)`
- **Text Levels**: Primary `#1c1917` (stone-900), Secondary `#57534e` (stone-600), Muted `#625f5b`, Extra-muted `#716d68`
- **Semantic Accents**: Bull `#0d9488`, Bear `#dc2626`, Warn `#b47a18`

### Glassmorphism & Elevation Patterns
- **Liquid Glass (`.glass`)**:
  - `backdrop-filter: blur(28px) saturate(180%)`
  - `border: 1px solid var(--color-bd)`
  - `box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 48px -28px var(--color-shadow)`
- **Spotlight Cards (`SpotlightCard`)**: Dynamic mouse-following radial spotlight tint highlighting interactive cards.
- **Pulsing Telemetry**: Beacon rings with `animate-ping` indicating real-time feed activity.

## Brand Personality & Anti-References

- **Personality**: Smooth, editorial, sleek, and professional. Composed and dependable under market turbulence.
- **Anti-References**:
  - NOT a generic SaaS dashboard with interchangeable chart widgets.
  - NOT a brightly lit, generic AI template with arbitrary purple/neon gradients.
  - NOT cluttered with raw table dumps or non-contextual price tickers. Every visual element must map directly to the conflict transmission hypothesis.

## Accessibility & Inclusion (WCAG 2.2 AA)

- Minimum touch targets of 44×44px for touch interactions.
- Skip link (`.skip-link`) for immediate keyboard bypass to main content.
- Complete keyboard focus visibility with high-contrast outlines (`outline: 2px solid var(--color-warn)`).
- Dual-theme contrast compliance across both obsidian dark and warm sepia light modes.
- Screen reader labels (`aria-label`, `aria-hidden`, `aria-modal`) across mobile drawers and interactive dials.
- Redundant non-color cues (arrows, trend labels, zone thresholds) accompanying color-coded status badges.
