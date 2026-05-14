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
