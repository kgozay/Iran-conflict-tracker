# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server (localhost:5173) — frontend only, no API functions
npm run build      # Production build → dist/
npm run preview    # Preview production build locally

vercel dev         # Run locally WITH Vercel serverless functions (required to test /api/* routes)
```

There is no test suite. Verify logic changes manually via `vercel dev` or against the deployed Vercel preview.

## Architecture

**Stack:** React 18 + Vite, Tailwind CSS v3, Recharts, deployed on Vercel.

### Data flow

1. On mount, `App.jsx` calls `useMarketData().initFromCache()` to show cached localStorage data immediately, then `fetchLive()` for fresh data.
2. `fetchLive()` fires three Vercel serverless functions in parallel:
   - `/api/quotes` — Yahoo Finance bulk/chart endpoint for all macro + JSE stock symbols.
   - `/api/sarb` — SA 10Y bond yield (Stooq primary → Yahoo → FRED → static fallback).
   - `/api/history` — 5D/20D historical changes via Yahoo chart endpoint.
3. Results are merged in layers (`applyQuotes` → `applyHistory` → bond overlay) then stored in state and localStorage.
4. `useSparklines` fetches `/api/sparklines` (intraday 5m data) separately, on mount and after each refresh.

### Scoring (`src/utils/scoring.js`)

The **Conflict Impact Score (CIS)** is a heuristic in the range ±100:
- **Macro score** (40%): Brent, USD/ZAR, Gold, SA 10Y — directional, magnitude-weighted.
- **JSE score** (35%): Weighted basket of sector averages (Top40 25%, Miners 20%, Banks 20%, Retailers 15%, Energy 10%, Industrials 10%), divided by 10.
- **Confirmation score** (25%): Binary bull/bear signal tests, each ±16 pts.

Regime labels: `BEARISH SHOCK` (≤ -40), `MILD BEARISH` (≤ -15), `NEUTRAL` (≤ 15), `MILD BULLISH` (≤ 40), `BULLISH RELIEF` (> 40).

### Key files

| Path | Purpose |
|---|---|
| `src/hooks/useMarketData.js` | All data fetching, caching, and state management |
| `src/hooks/useSparklines.js` | Intraday sparkline fetch with 8-min localStorage cache |
| `src/utils/scoring.js` | CIS calculation — `computeCIS`, `computeMacroScore`, `computeJSEScore`, `computeConfirmationScore` |
| `src/utils/alerts.js` | Threshold alert generation + `getAssetAlertLevel` for KPI dot indicators |
| `src/data/stocks.js` | Static universe: `MACRO_SYMBOLS`, `JSE_STOCKS`, `ALL_YAHOO_SYMBOLS`, `SECTOR_ORDER` |
| `api/quotes.js` | Yahoo Finance proxy — bulk crumb path first, per-symbol chart fallback |
| `api/sarb.js` | SA 10Y bond yield — Stooq → Yahoo → FRED → static fallback chain |
| `api/history.js` | 5D/20D historical changes via Yahoo chart endpoint |
| `api/morning-note.js` | Gemini 2.5 Flash AI morning note — requires `GEMINI_API_KEY` env var |

### Sector derivation

`deriveSectors()` in `App.jsx` computes live sector averages from `stocks[]` (equal-weight, live names only). The `sectors.top40` key holds the overall JSE market average (not the actual Top40 index). The `rel` field on each sector is `sector.chg - mktAvg`.

### Caching

- Market data: `jse_cw_v6_cache` in localStorage — fresh for 5 min, usable (stale) for 30 min.
- Sparklines: `jse_cw_sparklines_v1` — 8-min TTL.
- CIS history: `jse_cw_cis_history_v1` — up to 200 readings (≈7 days at 5-min refresh).

### API / environment

- `api/` functions are CommonJS (`require`), frontend is ESM.
- No API key required for Yahoo Finance or Stooq. `FRED_API_KEY` is optional (anonymous FRED calls work but are rate-limited). `GEMINI_API_KEY` is required for the morning note feature.
- `getEnv()` in `useMarketData.js` detects `stackblitz` | `local` | `vercel` — API functions are disabled on Stackblitz.

## Features added (2026-05)

### Mobile sidebar drawer
- `sidebarOpen` state in `App.jsx` controls the drawer; backdrop closes it on tap
- `Sidebar.jsx` uses `transition-transform` + `-translate-x-full` / `translate-x-0` with `lg:translate-x-0` override
- `TopBar.jsx` shows a hamburger button (`MenuIcon`) on `< lg` screens that opens the drawer
- Nav links auto-close the sidebar via `onClose?.()` 

### Light mode toggle
- Color tokens migrated from hardcoded hex to CSS custom properties in `src/index.css`
- `:root` = dark theme; `[data-theme="light"]` = light theme (applied to `<html>` via `App.jsx`)
- `tailwind.config.js` color tokens now use `var(--color-*)` — bull/bear/warn remain hardcoded hex
- Toggle button (sun/moon icon) in `TopBar.jsx`; preference stored in localStorage as `jse_theme`

### Geopolitical news feed
- `api/news.js` — Vercel serverless function; fetches Reuters, BBC Middle East, Al Jazeera RSS feeds, filters by conflict keywords, deduplicates, returns top 20 articles. No API key required.
- `src/hooks/useNews.js` — 15-min localStorage cache (`jse_cw_news_v1`); auto-fetches stale/empty cache on mount
- `src/widgets/NewsFeed.jsx` — horizontal scrollable card row on the Overview page, between AlertsFeed/MorningNote and the Watchlist

## Known fixes applied (2026-05)

- `useSparklines` now exports `sparkLoading` (was `loading`) to match App.jsx destructuring — skeleton loader was always hidden.
- `alerts.js` r2035 thresholds use `else if` so only one severity fires at a time.
- `alerts.js` gold-surge alert (`gold > 2`) uses `lvl:'green'` (was `'amber'`).
- `useMarketData.clearError` reverts to `'cached'` status when prior data exists (was always `'empty'`, which wiped the cached data view).
- `BrentSlider` slider track label now shows live Brent price dynamically (was hardcoded `$92 NOW`).

## Planned features (implementation guides)

### 1. Regime bands on CIS history chart

**File:** `src/widgets/CISHistoryChart.jsx`

1. Import `ReferenceArea` from `recharts` alongside the existing imports.
2. Inside the `<ComposedChart>` (or `<LineChart>`), add five `<ReferenceArea>` elements **before** the `<Line>` element so they render behind the data line:
   ```jsx
   <ReferenceArea y1={-100} y2={-40} fill="rgba(239,68,68,0.08)" ifOverflow="hidden" />
   <ReferenceArea y1={-40}  y2={-15} fill="rgba(245,158,11,0.08)" ifOverflow="hidden" />
   <ReferenceArea y1={-15}  y2={15}  fill="rgba(100,116,139,0.06)" ifOverflow="hidden" />
   <ReferenceArea y1={15}   y2={40}  fill="rgba(34,197,94,0.06)"  ifOverflow="hidden" />
   <ReferenceArea y1={40}   y2={100} fill="rgba(34,197,94,0.12)"  ifOverflow="hidden" />
   ```
3. Optionally add a `label={{ value: 'BEARISH SHOCK', position: 'insideTopRight', fontSize: 9, fill: 'rgba(239,68,68,0.5)' }}` prop to the first ReferenceArea (repeat for each band with its regime name and matching color).
4. **Verify:** `npm run dev` → Overview page → CIS history chart shows colored background bands matching regime zones.

---

### 2. Event markers on CIS history chart

**New file:** `src/data/conflictEvents.js`
**File:** `src/widgets/CISHistoryChart.jsx`

1. Create `src/data/conflictEvents.js` exporting a static array:
   ```js
   export const CONFLICT_EVENTS = [
     { date: '2024-04-01', label: 'Iran strikes Israel', type: 'escalation' },
     { date: '2024-04-14', label: 'Israel retaliates', type: 'escalation' },
     { date: '2024-05-10', label: 'Ceasefire talks', type: 'de-escalation' },
     // add more milestones as needed
   ];
   ```
   Types: `'escalation'` | `'de-escalation'` | `'neutral'`
2. In `CISHistoryChart.jsx`, import `CONFLICT_EVENTS` and `ReferenceLine`, `Label` from `recharts`.
3. Derive the earliest timestamp in the `data` prop: `const minTs = data[0]?.ts ?? 0`.
4. Filter events: `const visible = CONFLICT_EVENTS.filter(e => new Date(e.date).getTime() >= minTs)`.
5. Map visible events to `<ReferenceLine>` elements inside the chart:
   ```jsx
   {visible.map(ev => (
     <ReferenceLine
       key={ev.date}
       x={new Date(ev.date).getTime()}
       stroke={ev.type === 'escalation' ? '#ef4444' : ev.type === 'de-escalation' ? '#22c55e' : '#64748b'}
       strokeDasharray="3 3"
     >
       <Label value={ev.label} angle={-90} position="insideTopLeft" fontSize={9} />
     </ReferenceLine>
   ))}
   ```
6. **Verify:** At least 3 events appear as dashed vertical lines with rotated labels on the chart.

---

### 3. Browser push notifications on CIS threshold crossings

**File:** `src/hooks/useAutoRefresh.js` or `App.jsx`

1. On app mount (inside a `useEffect` with `[]` deps), request notification permission:
   ```js
   if ('Notification' in window && Notification.permission === 'default') {
     Notification.requestPermission();
   }
   ```
2. Add a `useRef` (e.g. `prevCisRef`) initialized to `null` to track the CIS value from the previous refresh.
3. Define a helper `getCISRegime(cis)` that returns the regime string (`'BEARISH_SHOCK'`, `'MILD_BEARISH'`, `'NEUTRAL'`, `'MILD_BULLISH'`, `'BULLISH_RELIEF'`) using the thresholds from `scoring.js`.
4. After each successful data refresh (wherever `cis` is updated in state), run:
   ```js
   const prevRegime = localStorage.getItem('jse_cw_last_notif_regime');
   const newRegime = getCISRegime(cis);
   if (newRegime !== prevRegime && Notification.permission === 'granted') {
     new Notification('Iran Conflict Tracker', {
       body: `Market regime changed to ${newRegime.replace('_', ' ')} (CIS: ${cis.toFixed(1)})`,
       icon: '/favicon.ico',
     });
     localStorage.setItem('jse_cw_last_notif_regime', newRegime);
   }
   prevCisRef.current = cis;
   ```
5. **Verify:** Open app in browser, grant notification permission when prompted, trigger a refresh and confirm a browser notification fires when the regime changes.

---

### 4. AI news sentiment via Gemini

**File:** `api/news.js`
**File:** `src/widgets/NewsFeed.jsx`

1. In `api/news.js`, after the articles array is built and deduplicated, add a Gemini sentiment step:
   ```js
   const { GoogleGenerativeAI } = require('@google/generative-ai');
   // Reuse the same pattern as api/morning-note.js
   async function scoreHeadlines(articles) {
     if (!process.env.GEMINI_API_KEY) return articles; // fallback: return as-is
     try {
       const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
       const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
       const headlines = articles.map(a => a.title);
       const prompt = `You are a financial sentiment analyst. For each headline below, return ONLY a JSON array (same order) of objects with keys "sentiment" ("bearish"|"neutral"|"bullish") and "score" (0.0–1.0 confidence). No explanation.\n\nHeadlines:\n${JSON.stringify(headlines)}`;
       const result = await model.generateContent(prompt);
       const text = result.response.text().trim();
       const scores = JSON.parse(text.replace(/```json|```/g, '').trim());
       return articles.map((a, i) => ({ ...a, sentiment: scores[i]?.sentiment ?? a.sentiment, aiScore: scores[i]?.score ?? null }));
     } catch {
       return articles; // fallback to keyword-based sentiment on any error
     }
   }
   ```
2. Call `articles = await scoreHeadlines(articles)` before `res.json({ articles })`.
3. In `src/widgets/NewsFeed.jsx`, update the sentiment badge to read `article.sentiment` (already the field name — no change needed if the existing code uses it). Add an optional score chip next to the badge:
   ```jsx
   {article.aiScore != null && (
     <span className="text-xs opacity-60 ml-1">{(article.aiScore * 100).toFixed(0)}%</span>
   )}
   ```
4. **Verify:** `vercel dev` → Overview news cards show AI-scored sentiment labels with confidence percentages.

---

### 5. Correlation heatmap

**New file:** `src/widgets/CorrelationHeatmap.jsx`
**File:** `src/pages/MacroTransmission.jsx`

1. Create `src/widgets/CorrelationHeatmap.jsx`. Define a `pearson(a, b)` function:
   ```js
   function pearson(a, b) {
     const n = a.length;
     if (n < 2) return 0;
     const meanA = a.reduce((s, v) => s + v, 0) / n;
     const meanB = b.reduce((s, v) => s + v, 0) / n;
     const num = a.reduce((s, v, i) => s + (v - meanA) * (b[i] - meanB), 0);
     const den = Math.sqrt(a.reduce((s, v) => s + (v - meanA) ** 2, 0) * b.reduce((s, v) => s + (v - meanB) ** 2, 0));
     return den === 0 ? 0 : num / den;
   }
   ```
2. Props: `{ history, macro }` — `history` is the 20D daily returns object keyed by symbol; `macro` contains Brent, Gold, USD/ZAR, SA 10Y series.
3. Define an `ASSETS` array with display name + data key for: Brent, Gold, USD/ZAR, SA 10Y, Top40, Miners, Banks, Retailers, Energy, Industrials (10 items).
4. Build an N×N matrix of Pearson r values from the 20D return arrays for each pair.
5. Render as a CSS grid (`grid-cols-[repeat(N,1fr)]`) where each cell background is:
   - Positive r: `rgba(34,197,94, Math.abs(r))` 
   - Negative r: `rgba(239,68,68, Math.abs(r))`
   - Diagonal: `rgba(100,116,139,0.3)`
6. Each cell shows `r.toFixed(2)` in `text-xs font-mono`.
7. Add row/column headers with asset names (rotated 45° for columns).
8. Add a legend row below: "■ Green = co-movement  ■ Red = inverse".
9. In `MacroTransmission.jsx`, import and render `<CorrelationHeatmap history={history} macro={macro} />` below the transmission channel section.
10. Guard with `if (!history || Object.keys(history).length === 0) return null`.
11. **Verify:** Gold vs Miners shows r > 0.5; Gold vs USD/ZAR shows r < 0.

---

### 6. Historical crisis comparison overlay

**New file:** `src/data/crisisReferences.js`
**New file:** `src/widgets/CrisisComparison.jsx`
**File:** `src/pages/MacroTransmission.jsx`

1. Create `src/data/crisisReferences.js`:
   ```js
   export const UKRAINE_2022 = [
     { week: 0, cis: -8 }, { week: 1, cis: -42 }, { week: 2, cis: -38 },
     { week: 3, cis: -31 }, { week: 4, cis: -22 }, { week: 5, cis: -18 },
     { week: 6, cis: -10 }, { week: 7, cis: -5 },
   ];
   export const ISRAEL_GAZA_2023 = [
     { week: 0, cis: -5 }, { week: 1, cis: -28 }, { week: 2, cis: -33 },
     { week: 3, cis: -25 }, { week: 4, cis: -20 }, { week: 5, cis: -14 },
     { week: 6, cis: -9 }, { week: 7, cis: -4 },
   ];
   // Values are approximate CIS-equivalent; adjust based on historical research
   ```
2. Create `src/widgets/CrisisComparison.jsx`:
   - Read `jse_cw_cis_history_v1` from localStorage to get the current conflict trajectory.
   - Align to week 0 = earliest recorded entry; aggregate to weekly averages (group by 7-day bins).
   - Merge into a combined dataset: `[{ week, ukraine, israelGaza, current }]`.
   - Render a Recharts `<LineChart>` with three `<Line>` elements (dashed for references, solid for current).
   - XAxis: "Week N"; YAxis: range -60 to 20; tooltip shows all three values.
   - Title: "Crisis trajectory comparison".
3. Import and place `<CrisisComparison />` in `MacroTransmission.jsx` below the correlation heatmap (or as a new collapsible section).
4. **Verify:** Three lines render; current line tracks recent CIS history from localStorage.

---

### 7. Multi-asset scenario simulator

**File:** `src/pages/MacroTransmission.jsx`

1. Add local state:
   ```js
   const [scenarioOverrides, setScenarioOverrides] = useState({ brent: 0, zar: 0, gold: 0 });
   ```
2. Derive a `scenarioCIS` value whenever overrides or live data change:
   ```js
   const scenarioCIS = useMemo(() => {
     if (!macro) return null;
     const overridden = {
       ...macro,
       brent: { ...macro.brent, chg: (macro.brent?.chg ?? 0) + scenarioOverrides.brent },
       zar:   { ...macro.zar,   chg: (macro.zar?.chg ?? 0)   + scenarioOverrides.zar },
       gold:  { ...macro.gold,  chg: (macro.gold?.chg ?? 0)  + scenarioOverrides.gold },
     };
     return computeCIS(overridden, sectors);
   }, [macro, sectors, scenarioOverrides]);
   ```
   Import `computeCIS` from `src/utils/scoring.js`.
3. Extend the existing BrentSlider UI section with two additional sliders:
   - **USD/ZAR**: label "ZAR shock", range -15 to +15 (%), step 0.5, `onChange` updates `scenarioOverrides.zar`
   - **Gold**: label "Gold shock", range -20 to +20 (%), step 0.5, `onChange` updates `scenarioOverrides.gold`
4. Display a "Scenario CIS" badge near the existing live CIS display:
   ```jsx
   {scenarioCIS !== null && (
     <span className="px-2 py-1 rounded bg-purple-600/20 text-purple-400 text-sm font-mono">
       Scenario CIS: {scenarioCIS.toFixed(1)}
     </span>
   )}
   ```
5. Add a `<button onClick={() => setScenarioOverrides({ brent: 0, zar: 0, gold: 0 })}>Reset</button>` next to the sliders.
6. **Verify:** Moving any slider updates the Scenario CIS instantly with no network request; Reset zeroes all sliders and restores live CIS.

---

### 8. Daily email digest via Vercel cron

**New file:** `api/daily-digest.js`
**File:** `vercel.json`

1. Install Resend: `npm install resend` (save to `package.json` as a regular dependency, not devDependency — Vercel functions need it at runtime).
2. Create `api/daily-digest.js` (CommonJS):
   ```js
   const { GoogleGenerativeAI } = require('@google/generative-ai');
   const { Resend } = require('resend');

   module.exports = async (req, res) => {
     try {
       const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
       const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
       const date = new Date().toDateString();
       const prompt = `You are an analyst writing a concise daily brief (200–300 words) on how the Iran-Israel conflict is affecting South African markets today (${date}). Cover: Brent oil impact, USD/ZAR pressure, JSE sector effects (miners, banks, retailers), and 1–2 key risk factors. Plain text, no markdown.`;
       const result = await model.generateContent(prompt);
       const body = result.response.text();

       const resend = new Resend(process.env.RESEND_API_KEY);
       await resend.emails.send({
         from: 'digest@yourdomain.com', // replace with your verified Resend sender domain
         to: process.env.DIGEST_EMAIL,
         subject: `Iran Conflict Tracker — Daily Brief ${date}`,
         text: body,
       });
       res.json({ ok: true });
     } catch (err) {
       console.error('daily-digest error:', err.message);
       res.status(500).json({ ok: false, error: err.message });
     }
   };
   ```
3. Add or update `vercel.json` at the project root with a `crons` entry:
   ```json
   {
     "crons": [
       { "path": "/api/daily-digest", "schedule": "0 6 * * 1-5" }
     ]
   }
   ```
   This fires at 06:00 UTC Monday–Friday.
4. Set the following in Vercel project environment variables:
   - `GEMINI_API_KEY` — already exists
   - `RESEND_API_KEY` — obtain from resend.com (free tier covers 3,000 emails/month)
   - `DIGEST_EMAIL` — recipient address (e.g. `kgositaye@gmail.com`)
5. Update the `from` address to a domain you have verified in Resend (or use Resend's shared domain for testing: `onboarding@resend.dev`).
6. **Verify locally:** `vercel dev` → `GET http://localhost:3000/api/daily-digest` → check email arrives. **Verify deployed:** push to Vercel, check Vercel dashboard → Cron Jobs tab shows the schedule.

---

### Global implementation notes

- After implementing any widget, guard against empty/null data at the top of the component: `if (!data || !macro) return null`.
- `npm run build` must pass without errors after each feature.
- `vercel dev` is required to test all `/api/*` routes; `npm run dev` alone will not invoke serverless functions.
- Features 1–4 are independent and can be implemented in any order. Feature 7 depends on `computeCIS` being importable (it already is). Feature 8 requires a Resend account setup before it can be fully tested.
