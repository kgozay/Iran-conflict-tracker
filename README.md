# JSE Conflict Watch v2

Full-stack React + Tailwind dashboard for real-time monitoring of Iran conflict impact on South African markets.

**Stack:** React 18 · Tailwind CSS v3 · Recharts · Vite · Netlify Functions · Yahoo Finance (free, no API key)

---

## Deploy in 5 minutes

### 1 — Push to GitHub
```bash
git init
git add .
git commit -m "JSE Conflict Watch v2"
git remote add origin https://github.com/YOUR_USERNAME/jse-conflict-watch.git
git push -u origin main
```

### 2 — Deploy to Netlify
1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project** → GitHub
2. Select your repo. Build settings auto-detected from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish dir:** `dist`
   - **Functions dir:** `netlify/functions`
3. Click **Deploy site** — done. No environment variables needed.

---

## Run locally

```bash
npm install
npm run dev          # Vite dev server on http://localhost:5173
```

For Netlify Functions locally (optional — functions work on deploy):
```bash
npm install -g netlify-cli
netlify dev          # Runs everything on http://localhost:8888
```

---

## Yahoo Finance API

No API key required. The `netlify/functions/quotes.js` serverless function proxies:

```
https://query1.finance.yahoo.com/v7/finance/quote?symbols=SOL.JO,GC=F,USDZAR=X,...
```

**Why server-side proxy?** Yahoo Finance blocks direct browser requests with CORS errors. The Netlify Function runs server-side, bypassing this.

**Rate limits:** Yahoo Finance free tier is undocumented but generous. All 40+ symbols are fetched in a single HTTP call — very efficient. Data is cached in localStorage for 5 minutes.

---

## Project structure

```
jse-conflict-watch/
├── netlify/
│   └── functions/
│       └── quotes.js          # Yahoo Finance proxy (no key needed)
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx        # Navigation + CIS gauge
│   │   └── TopBar.jsx         # Controls + data status
│   ├── pages/
│   │   ├── Overview.jsx       # Main dashboard page
│   │   ├── MacroTransmission.jsx
│   │   └── SectorDrilldown.jsx
│   ├── widgets/
│   │   ├── Card.jsx           # Reusable card container
│   │   ├── RegimeBanner.jsx   # Regime status + CIS display
│   │   ├── KpiGrid.jsx        # 8 macro KPI cards
│   │   ├── HeatStrip.jsx      # JSE sector colour strip
│   │   ├── ScoreDecomp.jsx    # CIS decomposition panel
│   │   ├── SectorRelChart.jsx # Recharts relative perf bar
│   │   ├── AlertsFeed.jsx     # Live alerts list
│   │   ├── MorningNote.jsx    # Auto-generated market note
│   │   ├── Watchlist.jsx      # Full stock table with filters + sort
│   │   └── StockCard.jsx      # Individual stock card + sparkline
│   ├── data/
│   │   └── stocks.js          # All symbols + mock data baseline
│   ├── utils/
│   │   ├── scoring.js         # Conflict Impact Score engine
│   │   └── alerts.js          # Alert trigger logic
│   ├── hooks/
│   │   └── useMarketData.js   # Data fetching + cache hook
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── netlify.toml
```

---

## Customisation

**Add/remove stocks:** Edit `src/data/stocks.js` — the `JSE_STOCKS` array. Each entry needs a valid Yahoo Finance ticker (`.JO` suffix for JSE).

**Tune the CIS weights:** Edit `src/utils/scoring.js` — change `0.40`, `0.35`, `0.25` weights and the scoring functions.

**Add more alert types:** Edit `src/utils/alerts.js` — `computeAlerts()` returns an array of alert objects.

**Cache duration:** Edit `CACHE_TTL` in `src/hooks/useMarketData.js` (default: 5 minutes).

---

## Roadmap

- [ ] Auto-refresh every N minutes toggle
- [ ] Email/Slack webhook on threshold breach
- [ ] FRED API integration for SA 10Y yield (free, more reliable than Yahoo)
- [ ] Custom JSE Top 40 composite (weighted basket)
- [ ] CSV export of watchlist data
- [ ] Dark/light mode toggle
