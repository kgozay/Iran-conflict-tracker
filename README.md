# JSE Conflict Watch v2.2 — GitHub + Vercel Ready

A full-stack React + Tailwind + Recharts dashboard for monitoring how Iran / Middle East conflict risk transmits into South African markets.

This package is prepared for a simple workflow:

1. Upload the project files to a new GitHub repository.
2. Import that GitHub repository into Vercel.
3. Deploy using Vercel's default Vite settings.

No API key is required for the market-data dashboard. A Gemini key is optional and only needed for the AI Morning Note.

---

## Files you should upload to GitHub

Upload the contents of this project folder, including:

```text
api/
src/
index.html
package.json
package-lock.json
postcss.config.js
tailwind.config.js
vercel.json
vite.config.js
README.md
.gitignore
.env.example
```

Do **not** upload these if they exist on your machine:

```text
node_modules/
dist/
.vercel/
.env
.env.local
```

The `.gitignore` file is already set up to keep those out of GitHub.

---

## Deploy on Vercel

After uploading the files to GitHub:

1. Go to Vercel.
2. Choose **Add New Project**.
3. Import your GitHub repository.
4. Vercel should detect **Vite** automatically.
5. Use these settings if Vercel asks:

```text
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

6. Click **Deploy**.

The serverless API routes are in `api/*.js`. Vercel will deploy these automatically.

---

## Optional environment variables

The dashboard works without paid market-data keys.

| Variable | Required | Purpose |
|---|---:|---|
| `GEMINI_API_KEY` | Optional | Enables the AI Morning Note at `/api/morning-note`. |
| `FRED_API_KEY` | Optional | Improves the FRED fallback for the SA long-term government-rate proxy. |

To add them in Vercel:

```text
Project > Settings > Environment Variables
```

Add the variable name and value, then redeploy.

---

## What is included in v2.2

- Institutional command bar with live/cached status, market hours and data coverage.
- Larger conflict-regime banner with macro, breadth, confirmation and data-confidence chips.
- Dedicated score-driver cards separating positive offsets from negative pressures.
- Impact-aware macro KPI cards with source badges, sparklines and market read-through lines.
- Data Quality / Source Status panel.
- Source and fallback badges on macro KPI cards.
- Replaced the stale SA 10Y proxy with the **US 10Y Yield** (`^TNX`).
- Quote and history failures are isolated so partial market data remains usable.
- CIS driver attribution showing the biggest weighted positive/negative contributors.
- Watchlist CSV export respects selected `1D / 5D / 20D` and `ABS / REL` modes.
- More detailed Gemini Morning Note prompt with market diagnosis, stock watchlist, risk flag and action setup.
- Payload-size protection on `/api/morning-note`.
- Reduced auto-refresh frequency to avoid stressing free market-data endpoints.
- Clear caveats for equal-weight sector baskets and static reference fields.

---

## API routes

```text
/api/quotes        Yahoo Finance quote/chart proxy
/api/history       Yahoo Finance 5D/20D history proxy
/api/treasury      Official US Treasury daily 10-year yield fallback
/api/sparklines    Intraday macro sparklines
/api/morning-note  Gemini-generated analyst note
```

---

## Data-source caveats

- Yahoo Finance, Stooq and FRED are free/fragile data sources and can occasionally fail, delay or return partial coverage.
- The specific R2035 yield is intentionally omitted because dependable live JSE bond data requires a licensed market-data feed.
- The US 10Y card uses Yahoo Finance's `^TNX` market series, with the official US Treasury daily par-yield feed as a fallback. The intraday reading is indicative rather than exchange-certified data.
- Sector performance is an **equal-weight basket** of selected JSE names, not an official index-weighted sector return.
- Market cap and P/E fields in `src/data/stocks.js` are static reference fields and may become stale.

---

## Local testing, optional

You do not need this for Vercel deployment. For local testing:

```bash
npm install
npx vercel dev
```

Then open the local URL shown by Vercel.

---

## Customisation

- Add/remove stocks: edit `src/data/stocks.js`.
- Tune the CIS weights: edit `src/utils/scoring.js`.
- Add more alert types: edit `src/utils/alerts.js`.
- Change cache duration: edit `CACHE_TTL` and `STALE_TTL` in `src/hooks/useMarketData.js`.
- Add a licensed JSE fixed-income feed if security-level R2035 pricing becomes a requirement.

---

## Disclaimer

This dashboard is for monitoring and analysis only. It is not investment advice. The Conflict Impact Score is a heuristic regime signal, not a forecast.
