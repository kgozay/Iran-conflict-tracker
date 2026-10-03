/**
 * JSE Conflict Watch — historical daily CIS
 *
 * GET /api/cis-backfill
 * Rebuilds the CIS for every JSE session since early 2022 from Yahoo daily
 * closes (one chart request per symbol), using the same scoring code as the
 * live dashboard. Powers the crisis comparison and the backtest.
 *
 * Heavy (~50 Yahoo requests), so the response is CDN-cached for 6 hours.
 */

const { get, mapWithConcurrency } = require('./_lib/yahoo.js');

const HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

/* Yahoo chart result → [{ date: 'YYYY-MM-DD' (exchange-local), close }] */
function parseDailyBars(result) {
  const ts = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  const adj = result?.indicators?.adjclose?.[0]?.adjclose;
  const closes = Array.isArray(adj) && adj.length === ts.length ? adj : (quote.close || []);
  const offset = result?.meta?.gmtoffset || 0;
  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const close = closes[i];
    if (close == null || !Number.isFinite(close) || close <= 0) continue;
    const date = new Date((ts[i] + offset) * 1000).toISOString().slice(0, 10);
    if (bars.length && bars[bars.length - 1].date === date) bars[bars.length - 1].close = close;
    else bars.push({ date, close });
  }
  return bars;
}

async function fetchDaily(symbol, period1) {
  const period2 = Math.floor(Date.now() / 1000);
  for (const host of HOSTS) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`;
      const res = await get(url, { Referer: 'https://finance.yahoo.com/', Origin: 'https://finance.yahoo.com' });
      const result = res.status === 200 && res.json?.chart?.result?.[0];
      if (!result) continue;
      const bars = parseDailyBars(result);
      if (bars.length) return bars;
    } catch (e) { /* try next host */ }
  }
  return null;
}

let memo = null;
const MEMO_MS = 3 * 3_600_000;

async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (!memo || Date.now() - memo.at > MEMO_MS) {
      const [{ ALL_YAHOO_SYMBOLS }, { computeDailyCISSeries }, { CRISES, BACKFILL_START }] = await Promise.all([
        import('../src/data/stocks.js'),
        import('../src/utils/cisSeries.js'),
        import('../src/data/crisisReferences.js'),
      ]);
      const period1 = Math.floor(Date.parse(`${BACKFILL_START}T00:00:00Z`) / 1000);
      const bars = await mapWithConcurrency(ALL_YAHOO_SYMBOLS, 8, sym => fetchDaily(sym, period1));
      const resolved = Object.keys(bars).length;
      if (resolved === 0) throw new Error('Yahoo Finance returned no history');

      const series = computeDailyCISSeries(bars).map(r => ({ date: r.date, cis: r.cis, close: r.close }));
      memo = {
        at: Date.now(),
        body: {
          series,
          crises: CRISES,
          symbols: { requested: ALL_YAHOO_SYMBOLS.length, resolved },
          note: 'Daily CIS rebuilt from closing prices with today\'s watchlist, so it carries survivorship bias and omits intraday moves.',
          generated: new Date().toISOString(),
        },
      };
    }
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json(memo.body);
  } catch (e) {
    console.error('[cis-backfill] error:', e.message);
    return res.status(502).json({ error: e.message });
  }
}

module.exports = handler;
module.exports.parseDailyBars = parseDailyBars;
