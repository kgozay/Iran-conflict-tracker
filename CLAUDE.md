# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server (localhost:5173) — frontend only, no API functions
npm run build      # Production build → dist/
npm run preview    # Preview production build locally

vercel dev         # Run locally WITH Vercel serverless functions (required to test /api/* routes)
npm test           # node:test suite in tests/ — scoring, universe, sectors, alerts, coverage, fundamentals, scenario, CIS series, server snapshot
```

Pure logic lives in `src/utils/` (and pure helpers exported from `api/*.js`) so it can be unit-tested without React or the network. UI and live-API behaviour still need checking via `vercel dev` or a Vercel preview.

## Architecture

**Stack:** React 18 + Vite, Tailwind CSS v3, Recharts, deployed on Vercel.

### Data flow

1. On mount, `App.jsx` calls `useMarketData().initFromCache()` to show cached localStorage data immediately, then `fetchLive()` for fresh data.
2. `fetchLive()` fires three Vercel serverless functions in parallel:
   - `/api/quotes` — Yahoo Finance bulk/chart endpoint for all macro + JSE stock symbols.
   - `/api/history` — 5D/20D historical changes via Yahoo chart endpoint.
   - `/api/treasury` — official US Treasury daily 10-year par-yield fallback when Yahoo omits `^TNX`.
3. Results are merged in layers (`applyQuotes` → Treasury fallback → `applyHistory`) then stored in state and localStorage.
4. `useSparklines` fetches `/api/sparklines` (intraday 5m data) separately, on mount and after each refresh.
5. `useFundamentals` fetches `/api/fundamentals` (live P/E + market cap) on mount when its cache is >6h old. `mergeFundamentals` (`src/utils/fundamentals.js`) layers values over the static `pe`/`mktcap` in `stocks.js`: live this session → last live value <24h old (`†`) → static (`*`). Each stock carries `fundamentalsSource`.

### Scoring (`src/utils/scoring.js`)

The **Conflict Impact Score (CIS)** is a heuristic in the range ±100:
- **Macro score** (40%): Brent, USD/ZAR, Gold, US 10Y yield — directional, magnitude-weighted.
- **JSE score** (35%): Weighted basket of sector averages (Top40 25%, Miners 20%, Banks 20%, Retailers 15%, Energy 10%, Industrials 10%), divided by 10. `top40Chg` is the Satrix 40 ETF (`STX40.JO`, asset key `jseTop40`) when live, else the equal-weight watchlist average.
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
| `api/history.js` | 5D/20D historical changes via Yahoo chart endpoint |
| `api/treasury.js` | Official US Treasury daily 10-year par-yield fallback |
| `api/fundamentals.js` | Live P/E + market cap: `/v7/finance/quote` bulk, `/v10/quoteSummary` fallback (crumb auth). JSE market caps arrive in cents (`ZAc`) and are converted to rand |
| `api/_lib/yahoo.js` | Shared Yahoo HTTP + cookie/crumb helpers (underscore folder is not deployed as a route) |
| `src/utils/sectors.js` | `deriveSectors` — equal-weight sector averages used by `App.jsx` |
| `api/morning-note.js` | Gemini 2.5 Flash AI morning note — requires `GEMINI_API_KEY` env var |
| `api/cis-history.js` | Shared CIS history in Redis; `?record=1` takes a server-scored reading |
| `api/cis-backfill.js` | Daily CIS rebuilt from historical closes since 2022 |
| `api/daily-digest.js` | Cron email digest (Gemini + Resend) |
| `src/utils/cisSeries.js` | Daily CIS rebuild, weekly trajectories, backtest, reading merge |

### Sector derivation

`deriveSectors()` in `src/utils/sectors.js` computes live sector averages from `stocks[]` (equal-weight, live names only). The `sectors.top40` key holds the equal-weight watchlist average (the real Top 40 is `assets.jseTop40`). Sector lists in the UI (watchlist filters, drilldown tabs, sector breadth) derive from `SECTOR_ORDER` in `src/data/stocks.js`, so adding a sector there is enough. The `rel` field on each sector is `sector.chg - mktAvg`.

### Caching

- Market data: `jse_cw_v7_cache` in localStorage — fresh for 5 min, usable (stale) for 30 min.
- Sparklines: `jse_cw_sparklines_v1` — 8-min TTL.
- Fundamentals: `jse_cw_fundamentals_v1` — refetched after 6h, usable for 24h, then static figures.
- CIS history: `jse_cw_cis_history_v1` — up to 200 browser readings, merged with the server history when configured.
- Historical daily CIS: `jse_cw_backfill_v1` — 12h.
- Alerts preference: `jse_notify`.

### API / environment

- `api/` functions are CommonJS (`require`), frontend is ESM.
- No API key is required for Yahoo Finance or the US Treasury fallback. `GEMINI_API_KEY` is required for the morning note feature.
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

## Known fixes applied (2026-05)

- `useSparklines` now exports `sparkLoading` (was `loading`) to match App.jsx destructuring — skeleton loader was always hidden.
- `alerts.js` US 10Y thresholds use `else if` so only one severity fires at a time.
- `alerts.js` gold-surge alert (`gold > 2`) uses `lvl:'green'` (was `'amber'`).
- `useMarketData.clearError` reverts to `'cached'` status when prior data exists (was always `'empty'`, which wiped the cached data view).
- `BrentSlider` slider track label now shows live Brent price dynamically (was hardcoded `$92 NOW`).

## Features added (2026-10)

- **Scenario CIS** — `src/utils/scenario.js` holds the simulator sensitivities and `computeScenarioCIS(liveInput, { brent, livePrice, zar, gold })`, which adds the shock to today's live CIS inputs. `BrentSlider` shows Live → Scenario CIS with a "Reset to live" button. `buildCISInput(assets, sectors)` (`src/utils/cisInput.js`) is the single mapping from market data to `computeCIS` inputs, shared by `App.jsx` and the server.
- **Conflict events** — `src/data/conflictEvents.js` covers 2024 → Sep 2026 (12-day war, snapback, 2026 war, ceasefire, MOU, Sep 2026 escalation). The CIS history chart uses a time x-axis, so events sit at their own date. Keep this list current.
- **Shared CIS history** — `api/cis-history.js` stores server-scored readings in Redis (Upstash REST: `KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL`/`_TOKEN`). `?record=1` takes a reading (throttled to one per 10 min via a lock key); each live dashboard fetch calls it, and Vercel Cron calls it daily at 15:30 UTC. Without a store it returns `{ configured: false }` and the app uses browser-only history. `useCISHistory` merges server + local readings; the chart shows the last 7 days. Optional `ALERT_EMAIL` emails on a regime change.
- **Historical daily CIS** — `api/cis-backfill.js` rebuilds the CIS for every JSE session since 2022 from Yahoo daily closes (`computeDailyCISSeries` in `src/utils/cisSeries.js`), CDN-cached 6h. Feeds two Macro Transmission tabs:
  - **Crisis comparison** (`CrisisComparison.jsx`) — weekly average CIS after each episode in `src/data/crisisReferences.js` (2026 war, 12-day war 2025, Israel–Gaza 2023, Russia–Ukraine 2022). Reference lines are calculated, not hand-entered.
  - **Backtest** (`CISBacktest.jsx`, `backtestCIS`) — CIS vs forward 5/20-session Top 40 returns (correlation, hit rate, average forward return by regime), on the rebuilt history and on stored live readings once >25 days exist.
- **Daily digest** — `api/daily-digest.js`, Vercel Cron 06:00 UTC Mon–Fri. Scores a live snapshot server-side (`api/_lib/market.js`), asks Gemini for a brief grounded only in those figures, and emails it via Resend REST with the figures appended (still sends figures-only if Gemini fails). Requires `CRON_SECRET`, `RESEND_API_KEY`, `DIGEST_EMAIL`; optional `DIGEST_FROM` (defaults to `onboarding@resend.dev`, which only delivers to the Resend account owner).
- **Alerts** — bell button in `TopBar` (`useNotifications`): regime changes and new red alerts arrive as toasts when the tab is visible and system notifications when hidden; while on, data refreshes every 10 min.
- **Export** — "CIS history CSV" in the export menu (`exportCISHistoryCSV`).
- **PWA** — `public/manifest.webmanifest`, `public/icon.svg`, `public/sw.js` (network-first pages, cache-first `/assets/`, never caches `/api/`). Registered in `src/main.jsx` in production builds only.

Server helpers live in `api/_lib/` (`store.js`, `email.js`, `cron.js`, `market.js`); they load the ESM scoring code from `src/` with dynamic `import()`. `vercel.json` sets `maxDuration` for the new functions and the two crons (Hobby plans allow daily crons only).

### Global implementation notes

- After implementing any widget, guard against empty/null data at the top of the component: `if (!data || !macro) return null`.
- `npm run build` must pass without errors after each feature.
- `vercel dev` is required to test all `/api/*` routes; `npm run dev` alone will not invoke serverless functions.
