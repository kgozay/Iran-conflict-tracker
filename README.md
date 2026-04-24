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
- SA bond metric renamed to **SA 10Y Yield Proxy**.
- Static SA 10Y fallback is displayed but excluded from CIS scoring.
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
/api/sparklines    Intraday macro sparklines
/api/sarb          SA 10Y yield proxy: Stooq → Yahoo → FRED → static fallback
/api/morning-note  Gemini-generated analyst note
```

---

## Data-source caveats

- Yahoo Finance, Stooq and FRED are free/fragile data sources and can occasionally fail, delay or return partial coverage.
- The **SA 10Y Yield Proxy** is not guaranteed to be the exact R2035 yield unless you replace the source with a true R2035 feed.
- If the SA 10Y source falls back to `STATIC`, the value is displayed for continuity but excluded from CIS scoring.
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
- Use a true R2035 source: replace or extend `/api/sarb.js`, then change the UI label from `SA 10Y Yield Proxy` to `R2035`.

---

## Disclaimer

This dashboard is for monitoring and analysis only. It is not investment advice. The Conflict Impact Score is a heuristic regime signal, not a forecast.
